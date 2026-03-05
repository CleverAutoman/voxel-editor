"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import PopupNotification from "@/components/PopupNotification";
import VoxelContextMenu, { VoxelContextMenuState } from "@/components/VoxelContextMenu";
import { loadSceneEntity, loadSceneFromVox, saveSceneAsVox, saveSceneEntity } from "@/lib/sceneStore";
import { VoxelStatus, useVoxelHistory } from "@/lib/useVoxelHistory";
import { generateVoxelsFromDsl } from "@/lib/voxelDsl";
import { Coord, Voxel, VoxelStore, calculateToCoordWithNormal, keyToCoord, toKey } from "@/lib/voxelStore";

type GroupRender = {
  colorId: number;
  voxels: Voxel[];
  indexToKey: string[];
};

const PALETTE = new Map<number, string>([
  [0, "#ef4444"],
  [1, "#f97316"],
  [2, "#eab308"],
  [3, "#84cc16"],
  [4, "#06b6d4"],
  [5, "#3b82f6"],
  [6, "#8b5cf6"],
  [7, "#ec4899"]
]);

/** Renders one instanced voxel group and forwards pointer events. */
function InstancedVoxelGroup(props: {
  group: GroupRender;
  color: string;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onContextMenu: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const { group, color, onPointerMove, onPointerDown, onContextMenu } = props;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const dummy = new THREE.Object3D();
    for (let i = 0; i < group.voxels.length; i += 1) {
      const voxel = group.voxels[i];
      dummy.position.set(voxel.x, voxel.y, voxel.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [group.voxels]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, group.voxels.length]}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
    </instancedMesh>
  );
}

/** Orchestrates voxel editing, generation, and scene import/export interactions. */
export default function VoxelEditor() {
  const storeRef = useRef<VoxelStore>(new VoxelStore());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const voxFileInputRef = useRef<HTMLInputElement | null>(null);
  const { counts: historySize, recordOperation, undo, redo } = useVoxelHistory(10);
  const [selectedColorId, setSelectedColorId] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [voxels, setVoxels] = useState<Voxel[]>(() => {
    storeRef.current.setVoxel({ x: 0, y: 0, z: 0, colorId: 0 });
    return storeRef.current.entries();
  });
  const [hover, setHover] = useState<Coord | null>(null);
  const [contextMenu, setContextMenu] = useState<VoxelContextMenuState | null>(null);
  const [dslInput, setDslInput] = useState(`box ${selectedColorId} 4 2 4 0 0 0`);
  const [dslMessage, setDslMessage] = useState<string | null>(null);

  const grouped = useMemo<GroupRender[]>(() => {
    const byColor = new Map<number, Voxel[]>();
    for (const voxel of voxels) {
      const list = byColor.get(voxel.colorId) ?? [];
      list.push(voxel);
      byColor.set(voxel.colorId, list);
    }

    return [...byColor.entries()].map(([colorId, voxels]) => ({
      colorId,
      voxels,
      indexToKey: voxels.map((v) => toKey(v.x, v.y, v.z))
    }));
  }, [voxels]);

  const voxelCount = voxels.length;

  /** Refreshes React state from the mutable voxel store. */
  const rebuild = useCallback(() => {
    setVoxels(storeRef.current.entries());
  }, []);

  /** Builds a history status object for one or more coordinates. */
  const makeStatus = (coord: Coord[], colorId: number | null): VoxelStatus => ({ coord, colorId });

  /** Captures current store status for a coordinate list. */
  const getStatusAt = (coord: Coord[]): VoxelStatus => {
    const existingColors = coord
      .map((c) => storeRef.current.getVoxel(c.x, c.y, c.z)?.colorId)
      .filter((colorId): colorId is number => colorId !== undefined);

    if (existingColors.length === 0) {
      return makeStatus(coord, null);
    }

    return makeStatus(coord, existingColors[0]);
  };

  /** Applies a status snapshot back into the voxel store. */
  const applyStatus = useCallback((status: VoxelStatus) => {
    const { coord, colorId } = status;
    if (colorId === null) {
      for (const c of coord) {
        storeRef.current.removeVoxel(c.x, c.y, c.z);
      }
      return;
    }
    for (const c of coord) {
      storeRef.current.setVoxel({ ...c, colorId });
    }
  }, []);

  /** Adds a voxel and records a create history entry. */
  const placeVoxel = (coord: Coord, options?: { force?: boolean; trackHistory?: boolean }) => {
    const { force = false, trackHistory = true } = options ?? {};
    if (coord.y < 0 || storeRef.current.hasVoxel(coord.x, coord.y, coord.z) || (updating && !force)) {
      return;
    }

    const prevStatus = getStatusAt([coord]);
    storeRef.current.setVoxel({ ...coord, colorId: selectedColorId });
    if (trackHistory) {
      recordOperation("CREATE", prevStatus, makeStatus([coord], selectedColorId));
    }
    rebuild();
  };

  /** Deletes a voxel and records a delete history entry. */
  const removeVoxel = (coord: Coord, options?: { trackHistory?: boolean }) => {
    const { trackHistory = true } = options ?? {};
    const existing = storeRef.current.getVoxel(coord.x, coord.y, coord.z);
    if (!existing) {
      return;
    }

    const prevStatus = makeStatus([coord], existing.colorId);
    storeRef.current.removeVoxel(coord.x, coord.y, coord.z);
    if (trackHistory) {
      recordOperation("DELETE", prevStatus, makeStatus([coord], null));
    }
    rebuild();
  };

  /** Recolors a voxel and records a color-update history entry. */
  const repaintVoxel = (coord: Coord, options?: { trackHistory?: boolean }) => {
    const { trackHistory = true } = options ?? {};
    const existing = storeRef.current.getVoxel(coord.x, coord.y, coord.z);
    if (!existing || existing.colorId === selectedColorId) {
      return;
    }
    const prevStatus = makeStatus([coord], existing.colorId);
    storeRef.current.setVoxel({ ...existing, colorId: selectedColorId });
    if (trackHistory) {
      recordOperation("UPDATE_COLOR", prevStatus, makeStatus([coord], selectedColorId));
    }
    rebuild();
  };

  useEffect(() => {
    /** Handles keyboard shortcuts for undo and redo. */
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const withCommand = event.metaKey || event.ctrlKey;
      const isUndo = withCommand && !event.shiftKey && key === "z";
      const isRedo = (withCommand && event.shiftKey && key === "z") || (event.ctrlKey && key === "y");

      if (isUndo) {
        event.preventDefault();
        if (undo(applyStatus)) {
          rebuild();
        }
        return;
      }

      if (isRedo) {
        event.preventDefault();
        if (redo(applyStatus)) {
          rebuild();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, applyStatus, rebuild]);

  /** Opens the custom context menu at a screen position. */
  const openContextMenu = (event: ThreeEvent<MouseEvent>, target: Coord) => {
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    if (target.y < 0 || !updating) {
      return;
    }
    setContextMenu({
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
      target,
      canDelete: storeRef.current.hasVoxel(target.x, target.y, target.z)
    });
  };

  /** Resolves target coordinate based on current edit mode. */
  const resolveTargetCoord = (hitCoord: Coord, normal: THREE.Vector3): Coord => {
    if (updating) {
      return hitCoord;
    }
    return calculateToCoordWithNormal(hitCoord, normal);
  };

  /** Updates hover target when moving over an existing voxel. */
  const handleVoxelPointerMove =
    (group: GroupRender) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.instanceId === undefined || !event.face) {
        return;
      }

      const hitCoord = keyToCoord(group.indexToKey[event.instanceId]);
      const target = resolveTargetCoord(hitCoord, event.face.normal);
      setHover(target.y < 0 ? null : target);
    };

  /** Handles voxel clicks for add/delete interactions. */
  const handleVoxelPointerDown =
    (group: GroupRender) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setContextMenu(null);
      if (event.button === 1 || event.button === 2) {
        return;
      }
      if (event.instanceId === undefined || !event.face) {
        return;
      }

      const hitCoord = keyToCoord(group.indexToKey[event.instanceId]);
      if (event.shiftKey) {
        removeVoxel(hitCoord);
        return;
      }

      placeVoxel(resolveTargetCoord(hitCoord, event.face.normal));
    };

  /** Handles context menu requests on existing voxels. */
  const handleVoxelContextMenu =
    (group: GroupRender) => (event: ThreeEvent<MouseEvent>) => {
      if (event.instanceId === undefined || !event.face) {
        return;
      }
      const hitCoord = keyToCoord(group.indexToKey[event.instanceId]);
      const target = resolveTargetCoord(hitCoord, event.face.normal);
      openContextMenu(event, target);
    };

  /** Updates hover target when moving over the ground plane. */
  const handleGroundMove = (event: ThreeEvent<PointerEvent>) => {
    if (updating) {
      return;
    }
    event.stopPropagation();
    const coord = {
      x: Math.round(event.point.x),
      y: 0,
      z: Math.round(event.point.z)
    };
    setHover(coord);
  };

  /** Handles ground clicks for add/delete interactions. */
  const handleGroundDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setContextMenu(null);
    if (event.button === 1 || event.button === 2) {
      return;
    }
    const coord = {
      x: Math.round(event.point.x),
      y: 0,
      z: Math.round(event.point.z)
    };

    if (event.shiftKey) {
      removeVoxel(coord);
      return;
    }

    placeVoxel(coord);
  };

  /** Handles context menu requests on the ground plane. */
  const handleGroundContextMenu = (event: ThreeEvent<MouseEvent>) => {
    const coord = {
      x: Math.round(event.point.x),
      y: 0,
      z: Math.round(event.point.z)
    };
    openContextMenu(event, coord);
  };

  /** Runs DSL generation and records it as one history operation. */
  const runDslGenerate = () => {
    try {
      const generated = generateVoxelsFromDsl(dslInput, selectedColorId);
      let created = 0;
      const createdCoords: Coord[] = [];
      const createdColorId: number | null = generated[0]?.colorId ?? null;
      for (const voxel of generated) {
        if (voxel.y < 0 || storeRef.current.hasVoxel(voxel.x, voxel.y, voxel.z)) {
          continue;
        }
        storeRef.current.setVoxel(voxel);
        created += 1;
        createdCoords.push({ x: voxel.x, y: voxel.y, z: voxel.z });
      }

      if (created > 0 && createdColorId !== null) {
        recordOperation(
          "DSL_GENERATE",
          makeStatus(createdCoords, null),
          makeStatus(createdCoords, createdColorId)
        );
      }
      rebuild();
      setDslMessage(`Generated ${created} voxel(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse DSL command.";
      setDslMessage(message);
    }
  };

  /** Saves the current scene to a local JSON file. */
  const saveCurrentSceneAsJson = () => {
    const cameraPosition: [number, number, number] = cameraRef.current
      ? [cameraRef.current.position.x, cameraRef.current.position.y, cameraRef.current.position.z]
      : [10, 10, 10];
    const target: [number, number, number] = controlsRef.current
      ? [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z]
      : [0, 0, 0];

    saveSceneEntity(PALETTE, storeRef.current.entries(), {
      position: cameraPosition,
      target,
      zoom: cameraRef.current?.zoom
    });
    setDslMessage("Scene saved as JSON.");
  };

  /** Loads scene data from a user-selected JSON file. */
  const loadSceneFromJsonFile = async (file: File) => {
    try {
      const scene = await loadSceneEntity(file);
      storeRef.current.clear();
      for (const voxel of scene.entities) {
        if (voxel.y < 0) {
          continue;
        }
        storeRef.current.setVoxel(voxel);
      }
      rebuild();
      setDslMessage(`Loaded scene v${scene.version} with ${scene.entities.length} voxel(s).`);

      if (cameraRef.current) {
        cameraRef.current.position.set(...scene.camera.position);
        if (typeof scene.camera.zoom === "number") {
          cameraRef.current.zoom = scene.camera.zoom;
          cameraRef.current.updateProjectionMatrix();
        }
      }
      if (controlsRef.current) {
        controlsRef.current.target.set(...scene.camera.target);
        controlsRef.current.update();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load scene file.";
      setDslMessage(message);
    }
  };

  /** Saves the current scene to a local VOX file. */
  const saveCurrentSceneAsVox = async () => {
    try {
      await saveSceneAsVox(PALETTE, storeRef.current.entries());
      setDslMessage("Scene saved as VOX.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save VOX file.";
      setDslMessage(message);
    }
  };

  /** Loads scene data from a user-selected VOX file. */
  const loadSceneFromVoxFile = async (file: File) => {
    try {
      const voxScene = await loadSceneFromVox(file);
      storeRef.current.clear();
      for (const voxel of voxScene.entities) {
        storeRef.current.setVoxel(voxel);
      }
      rebuild();
      setDslMessage(`Loaded VOX with ${voxScene.entities.length} voxel(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load VOX file.";
      setDslMessage(message);
    }
  };

  return (
    <main>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="panel-section">
            <h1>Voxel Editor</h1>
            <p className="panel-text">
              Click to place blocks, hold Shift and click to delete. Scroll to zoom, middle button drag to rotate,
              right-click to pan.
            </p>
          </div>

          <div className="panel-section">
            <h2 className="panel-title">Color Choosing</h2>
            <div className="palette">
              {[...PALETTE.entries()].map(([colorId, color]) => (
                <button
                  key={colorId}
                  className={`swatch ${selectedColorId === colorId ? "active" : ""}`}
                  style={{ background: color }}
                  onClick={() => setSelectedColorId(colorId)}
                  aria-label={`color ${colorId}`}
                />
              ))}
            </div>
          </div>

          <div className="panel-section">
            <h2 className="panel-title">Mode Switcher</h2>
            <button className="ui-button" onClick={() => setUpdating((prev) => !prev)}>
              Mode: {updating ? "Updating (no normal)" : "Add (with normal)"}
            </button>
          </div>

          <div className="panel-section dsl-panel">
            <h2 className="panel-title">DSL Generator</h2>
            <input
              className="ui-input"
              id="dsl-input"
              value={dslInput}
              onChange={(event) => setDslInput(event.target.value)}
              placeholder="box 0 4 2 4 0 0 1"
            />
            <button className="ui-button" onClick={runDslGenerate}>
              Run Generate
            </button>
            <p className="panel-text">
              Format: `TYPE [colorID] [shape vars] [offset vars]`
              <br />
              Supported types: `box`, `sphere`, `pyramid`
              <br />
              Vars: `colorID` is palette id; `box/pyramid` use `[w d h]`; `sphere` uses `[r]`; optional
              `[offset vars]` is `[x y z]` where `z` is height.
              <br />
              Examples:
              <br />
              `box: 0 6 6 3 0 1 0`
              <br />
              `sphere: 2 5 0 0 5`
              <br />
              `pyramid: 4 10 10 6 0 1 0`
            </p>
          </div>

          <div className="panel-section">
            <h2 className="panel-title">Save and Load</h2>
            <div className="history-actions">
              <button className="ui-button" onClick={saveCurrentSceneAsJson}>
                Save Scene as JSON
              </button>
              <button className="ui-button" onClick={() => jsonFileInputRef.current?.click()}>
                Load Scene from JSON
              </button>
            </div>
            <div className="history-actions">
              <button className="ui-button" onClick={() => void saveCurrentSceneAsVox()}>
                Save Scene as VOX
              </button>
              <button className="ui-button" onClick={() => voxFileInputRef.current?.click()}>
                Load Scene from VOX
              </button>
            </div>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                void loadSceneFromJsonFile(file);
                event.target.value = "";
              }}
            />
            <input
              ref={voxFileInputRef}
              type="file"
              accept=".vox,application/octet-stream"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                void loadSceneFromVoxFile(file);
                event.target.value = "";
              }}
            />
          </div>

          <div className="panel-section stats">
            <h2 className="panel-title">Status and History</h2>
            <span>Color ID: {selectedColorId}</span>
            <span>Voxel Count: {voxelCount}</span>
            <span>Undo Size: {historySize.undo}</span>
            <span>Redo Size: {historySize.redo}</span>
            <div className="history-actions">
              <button
                className="ui-button"
                onClick={() => {
                  if (undo(applyStatus)) {
                    rebuild();
                  }
                }}
                disabled={historySize.undo === 0}
              >
                Undo
              </button>
              <button
                className="ui-button"
                onClick={() => {
                  if (redo(applyStatus)) {
                    rebuild();
                  }
                }}
                disabled={historySize.redo === 0}
              >
                Redo
              </button>
            </div>
          </div>
        </aside>

        <section className="canvas-wrap" onClick={() => setContextMenu(null)}>
          <Canvas
            camera={{ position: [10, 10, 10], fov: 50 }}
            onCreated={({ camera }) => {
              cameraRef.current = camera as THREE.PerspectiveCamera;
            }}
          >
            <color attach="background" args={["#0b1220"]} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[8, 16, 6]} intensity={0.85} />

            <gridHelper args={[40, 40, "#334155", "#1e293b"]} position={[0, -0.5, 0]} />

            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.5, 0]}
              onPointerMove={handleGroundMove}
              onPointerDown={handleGroundDown}
              onContextMenu={handleGroundContextMenu}
            >
              <planeGeometry args={[40, 40]} />
              <meshBasicMaterial visible={false} />
            </mesh>

            {grouped.map((group) => (
              <InstancedVoxelGroup
                key={group.colorId}
                group={group}
                color={PALETTE.get(group.colorId) ?? "#f8fafc"}
                onPointerMove={handleVoxelPointerMove(group)}
                onPointerDown={handleVoxelPointerDown(group)}
                onContextMenu={handleVoxelContextMenu(group)}
              />
            ))}

            {hover && (
              <mesh position={[hover.x, hover.y, hover.z]} renderOrder={99}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                  color="#f8fafc"
                  wireframe
                  depthTest={true}
                  depthWrite={false}
                />
              </mesh>
            )}

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              enableZoom
              dampingFactor={0.08}
              minDistance={3}
              maxDistance={90}
              maxPolarAngle={Math.PI / 2.02}
              mouseButtons={{
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.ROTATE,
                RIGHT: THREE.MOUSE.PAN
              }}
            />
          </Canvas>
          {contextMenu && (
            <VoxelContextMenu
              menu={contextMenu}
              onPaint={() => {
                repaintVoxel(contextMenu.target);
                setContextMenu(null);
              }}
              onDelete={() => {
                removeVoxel(contextMenu.target);
                setContextMenu(null);
              }}
            />
          )}
          <p className="tip">Shift + Click: delete block, right-click on grid/voxel: open actions</p>
        </section>
      </div>
      <PopupNotification message={dslMessage} onClose={() => setDslMessage(null)} />
    </main>
  );
}

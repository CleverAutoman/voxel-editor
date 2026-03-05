"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import VoxelContextMenu, { VoxelContextMenuState } from "@/components/VoxelContextMenu";
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

const MAX_HISTORY = 10;

type OperationType = "CREATE" | "UPDATE_COLOR" | "DELETE";

type VoxelStatus = {
  coord: Coord;
  colorId: number | null;
};

type Operation = {
  operationType: OperationType;
  timestamp: number;
  prevStatus: VoxelStatus;
  newStatus: VoxelStatus;
};

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

export default function VoxelEditor() {
  const storeRef = useRef<VoxelStore>(new VoxelStore());
  const historyRef = useRef<Operation[]>([]);
  const redoRef = useRef<Operation[]>([]);
  const [selectedColorId, setSelectedColorId] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  const [voxels, setVoxels] = useState<Voxel[]>(() => {
    storeRef.current.setVoxel({ x: 0, y: 0, z: 0, colorId: 0 });
    return storeRef.current.entries();
  });
  const [hover, setHover] = useState<Coord | null>(null);
  const [contextMenu, setContextMenu] = useState<VoxelContextMenuState | null>(null);

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

  const rebuild = () => setVoxels(storeRef.current.entries());

  const syncHistorySize = () => {
    setHistorySize({
      undo: historyRef.current.length,
      redo: redoRef.current.length
    });
  };

  const makeStatus = (coord: Coord, colorId: number | null): VoxelStatus => ({ coord, colorId });

  const getStatusAt = (coord: Coord): VoxelStatus => {
    const existing = storeRef.current.getVoxel(coord.x, coord.y, coord.z);
    return makeStatus(coord, existing?.colorId ?? null);
  };

  const applyStatus = (status: VoxelStatus) => {
    const { coord, colorId } = status;
    if (colorId === null) {
      storeRef.current.removeVoxel(coord.x, coord.y, coord.z);
      return;
    }
    storeRef.current.setVoxel({ x: coord.x, y: coord.y, z: coord.z, colorId });
  };

  const pushOperation = (operation: Operation) => {
    if (historyRef.current.length === MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyRef.current.push(operation);
    redoRef.current = [];
    syncHistorySize();
  };

  const recordOperation = (
    operationType: OperationType,
    prevStatus: VoxelStatus,
    newStatus: VoxelStatus
  ) => {
    if (prevStatus.colorId === newStatus.colorId) {
      return;
    }
    pushOperation({
      operationType,
      timestamp: Date.now(),
      prevStatus,
      newStatus
    });
  };

  const placeVoxel = (coord: Coord, options?: { force?: boolean; trackHistory?: boolean }) => {
    const { force = false, trackHistory = true } = options ?? {};
    if (coord.y < 0 || storeRef.current.hasVoxel(coord.x, coord.y, coord.z) || (updating && !force)) {
      return;
    }

    const prevStatus = getStatusAt(coord);
    storeRef.current.setVoxel({ ...coord, colorId: selectedColorId });
    if (trackHistory) {
      recordOperation("CREATE", prevStatus, makeStatus(coord, selectedColorId));
    }
    rebuild();
  };

  const removeVoxel = (coord: Coord, options?: { trackHistory?: boolean }) => {
    const { trackHistory = true } = options ?? {};
    const existing = storeRef.current.getVoxel(coord.x, coord.y, coord.z);
    if (!existing) {
      return;
    }

    const prevStatus = makeStatus(coord, existing.colorId);
    storeRef.current.removeVoxel(coord.x, coord.y, coord.z);
    if (trackHistory) {
      recordOperation("DELETE", prevStatus, makeStatus(coord, null));
    }
    rebuild();
  };

  const repaintVoxel = (coord: Coord, options?: { trackHistory?: boolean }) => {
    const { trackHistory = true } = options ?? {};
    const existing = storeRef.current.getVoxel(coord.x, coord.y, coord.z);
    if (!existing || existing.colorId === selectedColorId) {
      return;
    }
    const prevStatus = makeStatus(coord, existing.colorId);
    storeRef.current.setVoxel({ ...existing, colorId: selectedColorId });
    if (trackHistory) {
      recordOperation("UPDATE_COLOR", prevStatus, makeStatus(coord, selectedColorId));
    }
    rebuild();
  };

  const undo = () => {
    const operation = historyRef.current.pop();
    if (!operation) {
      return;
    }
    applyStatus(operation.prevStatus);
    redoRef.current.push(operation);
    syncHistorySize();
    rebuild();
  };

  const redo = () => {
    const operation = redoRef.current.pop();
    if (!operation) {
      return;
    }
    if (historyRef.current.length === MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyRef.current.push(operation);
    applyStatus(operation.newStatus);
    syncHistorySize();
    rebuild();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const withCommand = event.metaKey || event.ctrlKey;
      const isUndo = withCommand && !event.shiftKey && key === "z";
      const isRedo = (withCommand && event.shiftKey && key === "z") || (event.ctrlKey && key === "y");

      if (isUndo) {
        event.preventDefault();
        const operation = historyRef.current.pop();
        if (!operation) {
          return;
        }
        const prev = operation.prevStatus;
        if (prev.colorId === null) {
          storeRef.current.removeVoxel(prev.coord.x, prev.coord.y, prev.coord.z);
        } else {
          storeRef.current.setVoxel({ x: prev.coord.x, y: prev.coord.y, z: prev.coord.z, colorId: prev.colorId });
        }
        redoRef.current.push(operation);
        setHistorySize({ undo: historyRef.current.length, redo: redoRef.current.length });
        setVoxels(storeRef.current.entries());
        return;
      }

      if (isRedo) {
        event.preventDefault();
        const operation = redoRef.current.pop();
        if (!operation) {
          return;
        }
        if (historyRef.current.length === MAX_HISTORY) {
          historyRef.current.shift();
        }
        historyRef.current.push(operation);
        const next = operation.newStatus;
        if (next.colorId === null) {
          storeRef.current.removeVoxel(next.coord.x, next.coord.y, next.coord.z);
        } else {
          storeRef.current.setVoxel({ x: next.coord.x, y: next.coord.y, z: next.coord.z, colorId: next.colorId });
        }
        setHistorySize({ undo: historyRef.current.length, redo: redoRef.current.length });
        setVoxels(storeRef.current.entries());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const resolveTargetCoord = (hitCoord: Coord, normal: THREE.Vector3): Coord => {
    if (updating) {
      return hitCoord;
    }
    return calculateToCoordWithNormal(hitCoord, normal);
  };

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

  const handleVoxelContextMenu =
    (group: GroupRender) => (event: ThreeEvent<MouseEvent>) => {
      if (event.instanceId === undefined || !event.face) {
        return;
      }
      const hitCoord = keyToCoord(group.indexToKey[event.instanceId]);
      const target = resolveTargetCoord(hitCoord, event.face.normal);
      openContextMenu(event, target);
    };

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

  const handleGroundContextMenu = (event: ThreeEvent<MouseEvent>) => {
    const coord = {
      x: Math.round(event.point.x),
      y: 0,
      z: Math.round(event.point.z)
    };
    openContextMenu(event, coord);
  };

  return (
    <main>
      <div className="app-shell">
        <aside className="sidebar">
          <h1>Voxel Editor</h1>
          <p className="muted">Click to place blocks, hold Shift and click to delete. Scroll to zoom, middle button drag to rotate, right-click to pan.</p>

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

          <div className="stats">
            <span>Color ID: {selectedColorId}</span>
            <span>Voxel Count: {voxelCount}</span>
            <span>Storage: Sparse Map&lt;string, Voxel&gt;</span>
            <button onClick={() => setUpdating((prev) => !prev)}>
              Mode: {updating ? "Updating (no normal)" : "Add (with normal)"}
            </button>
            <div className="history-actions">
              <button onClick={undo} disabled={historySize.undo === 0}>
                Undo ({historySize.undo})
              </button>
              <button onClick={redo} disabled={historySize.redo === 0}>
                Redo ({historySize.redo})
              </button>
            </div>
          </div>
        </aside>

        <section className="canvas-wrap" onClick={() => setContextMenu(null)}>
          <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
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
              makeDefault
              enableDamping
              enableZoom
              dampingFactor={0.08}
              minDistance={3}
              maxDistance={45}
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
              onAdd={() => {
                placeVoxel(contextMenu.target, { force: true });
                setContextMenu(null);
              }}
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
    </main>
  );
}

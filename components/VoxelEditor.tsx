"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Coord, Voxel, VoxelStore, keyToCoord, toKey } from "@/lib/voxelStore";

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

function InstancedVoxelGroup(props: {
  group: GroupRender;
  color: string;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const { group, color, onPointerMove, onPointerDown } = props;
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
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
    </instancedMesh>
  );
}

function getAdjacentCoord(coord: Coord, normal: THREE.Vector3): Coord {
  return {
    x: coord.x + Math.round(normal.x),
    y: coord.y + Math.round(normal.y),
    z: coord.z + Math.round(normal.z)
  };
}

export default function VoxelEditor() {
  const storeRef = useRef<VoxelStore>(new VoxelStore());
  const [selectedColorId, setSelectedColorId] = useState(0);
  const [voxels, setVoxels] = useState<Voxel[]>(() => {
    storeRef.current.setVoxel({ x: 0, y: 0, z: 0, colorId: 0 });
    return storeRef.current.entries();
  });
  const [hover, setHover] = useState<Coord | null>(null);

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

  const placeVoxel = (coord: Coord) => {
    if (coord.y < 0 || storeRef.current.hasVoxel(coord.x, coord.y, coord.z)) {
      return;
    }

    storeRef.current.setVoxel({ ...coord, colorId: selectedColorId });
    rebuild();
  };

  const removeVoxel = (coord: Coord) => {
    if (storeRef.current.removeVoxel(coord.x, coord.y, coord.z)) {
      rebuild();
    }
  };

  const handleVoxelPointerMove =
    (group: GroupRender) => (event: ThreeEvent<PointerEvent>) => {
      if (event.instanceId === undefined || !event.face) {
        return;
      }

      const hitCoord = keyToCoord(group.indexToKey[event.instanceId]);
      const target = event.shiftKey ? hitCoord : getAdjacentCoord(hitCoord, event.face.normal);
      setHover(target.y < 0 ? null : target);
    };

  const handleVoxelPointerDown =
    (group: GroupRender) => (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.instanceId === undefined || !event.face) {
        return;
      }

      const hitCoord = keyToCoord(group.indexToKey[event.instanceId]);
      if (event.shiftKey) {
        removeVoxel(hitCoord);
        return;
      }

      placeVoxel(getAdjacentCoord(hitCoord, event.face.normal));
    };

  const handleGroundMove = (event: ThreeEvent<PointerEvent>) => {
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

  return (
    <main>
      <div className="app-shell">
        <aside className="sidebar">
          <h1>Voxel Editor</h1>
          <p className="muted">Click to place blocks, hold Shift and click to delete. Drag to orbit, scroll to zoom, right-click to pan.</p>

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
          </div>
        </aside>

        <section className="canvas-wrap">
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
              />
            ))}

            {hover && (
              <mesh position={[hover.x, hover.y, hover.z]}>
                <boxGeometry args={[1.02, 1.02, 1.02]} />
                <meshBasicMaterial color="#f8fafc" wireframe />
              </mesh>
            )}

            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minDistance={3}
              maxDistance={45}
              maxPolarAngle={Math.PI / 2.02}
            />
          </Canvas>
          <p className="tip">Shift + Click: delete block</p>
        </section>
      </div>
    </main>
  );
}

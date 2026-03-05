import type { Vector3 } from "three";

export type Voxel = {
  x: number;
  y: number;
  z: number;
  colorId: number;
};

export type Coord = { x: number; y: number; z: number };

export function toKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function keyToCoord(key: string): Coord {
  const [x, y, z] = key.split(",").map(Number);
  return { x, y, z };
}

export function calculateToCoordWithNormal(coord: Coord, normal: Vector3): Coord {
  return {
    x: coord.x + Math.round(normal.x),
    y: coord.y + Math.round(normal.y),
    z: coord.z + Math.round(normal.z)
  };
}

export class VoxelStore {
  private readonly voxels = new Map<string, Voxel>();

  public clear(): void {
    this.voxels.clear();
  }

  public setVoxel(voxel: Voxel): void {
    this.voxels.set(toKey(voxel.x, voxel.y, voxel.z), voxel);
  }

  public getVoxel(x: number, y: number, z: number): Voxel | undefined {
    return this.voxels.get(toKey(x, y, z));
  }

  public hasVoxel(x: number, y: number, z: number): boolean {
    return this.voxels.has(toKey(x, y, z));
  }

  public removeVoxel(x: number, y: number, z: number): boolean {
    return this.voxels.delete(toKey(x, y, z));
  }

  public entries(): Voxel[] {
    return [...this.voxels.values()];
  }

  public size(): number {
    return this.voxels.size;
  }
}

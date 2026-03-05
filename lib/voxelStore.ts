import type { Vector3 } from "three";

export type Voxel = {
  x: number;
  y: number;
  z: number;
  colorId: number;
};

export type Coord = { x: number; y: number; z: number };

/** Converts a voxel coordinate into a stable map key. */
export function toKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/** Parses a coordinate map key back into numeric axes. */
export function keyToCoord(key: string): Coord {
  const [x, y, z] = key.split(",").map(Number);
  return { x, y, z };
}

/** Computes the adjacent coordinate by applying a face normal. */
export function calculateToCoordWithNormal(coord: Coord, normal: Vector3): Coord {
  return {
    x: coord.x + Math.round(normal.x),
    y: coord.y + Math.round(normal.y),
    z: coord.z + Math.round(normal.z)
  };
}

export class VoxelStore {
  private readonly voxels = new Map<string, Voxel>();

  /** Clears all voxels from the sparse store. */
  public clear(): void {
    this.voxels.clear();
  }

  /** Inserts or updates a voxel at its coordinate key. */
  public setVoxel(voxel: Voxel): void {
    this.voxels.set(toKey(voxel.x, voxel.y, voxel.z), voxel);
  }

  /** Returns the voxel at a coordinate, if present. */
  public getVoxel(x: number, y: number, z: number): Voxel | undefined {
    return this.voxels.get(toKey(x, y, z));
  }

  /** Checks whether a coordinate is occupied by a voxel. */
  public hasVoxel(x: number, y: number, z: number): boolean {
    return this.voxels.has(toKey(x, y, z));
  }

  /** Removes a voxel at the given coordinate. */
  public removeVoxel(x: number, y: number, z: number): boolean {
    return this.voxels.delete(toKey(x, y, z));
  }

  /** Returns all stored voxels as a new array snapshot. */
  public entries(): Voxel[] {
    return [...this.voxels.values()];
  }

  /** Returns the total number of stored voxels. */
  public size(): number {
    return this.voxels.size;
  }
}

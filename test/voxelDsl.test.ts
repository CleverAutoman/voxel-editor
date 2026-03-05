import { describe, expect, it } from "vitest";
import { generateVoxelsFromDsl } from "../lib/voxelDsl";

describe("generateVoxelsFromDsl", () => {
  it("parses box using w d h and maps origin x,y,zHeight", () => {
    const voxels = generateVoxelsFromDsl("box 1 2 3 4 10 20 30", 0);

    expect(voxels).toHaveLength(24);
    expect(voxels).toContainEqual({ x: 10, y: 30, z: 20, colorId: 1 });
    expect(voxels).toContainEqual({ x: 11, y: 33, z: 22, colorId: 1 });
  });

  it("parses sphere and keeps default height at radius", () => {
    const voxels = generateVoxelsFromDsl("sphere 2 1", 0);

    expect(voxels).toHaveLength(7);
    expect(voxels).toContainEqual({ x: 0, y: 1, z: 0, colorId: 2 });
    expect(Math.min(...voxels.map((v) => v.y))).toBeGreaterThanOrEqual(0);
  });

  it("parses pyramid using w d h and maps custom origin", () => {
    const voxels = generateVoxelsFromDsl("pyramid 4 4 4 2 1 2 3", 0);

    expect(voxels).toHaveLength(20);
    expect(voxels).toContainEqual({ x: 1, y: 3, z: 2, colorId: 4 });
    expect(voxels).toContainEqual({ x: 3, y: 4, z: 4, colorId: 4 });
  });

  it("rejects negative dimensions", () => {
    expect(() => generateVoxelsFromDsl("box 0 -1 2 3", 0)).toThrow("width must be >= 0");
  });

  it("rejects invalid numeric values", () => {
    expect(() => generateVoxelsFromDsl("sphere x 2", 0)).toThrow('Invalid colorId: "x"');
  });

  it("rejects unknown generator type", () => {
    expect(() => generateVoxelsFromDsl("cylinder 1 2", 7)).toThrow('Unknown generator "cylinder"');
  });
});

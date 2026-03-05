import { Voxel } from "@/lib/voxelStore";

type GeneratorKind = "box" | "sphere" | "pyramid";

function toInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}"`);
  }
  return parsed;
}

function makeBox(colorId: number, w: number, h: number, d: number, ox: number, oy: number, oz: number): Voxel[] {
  const voxels: Voxel[] = [];
  for (let x = 0; x < w; x += 1) {
    for (let y = 0; y < h; y += 1) {
      for (let z = 0; z < d; z += 1) {
        voxels.push({ x: ox + x, y: oy + y, z: oz + z, colorId });
      }
    }
  }
  return voxels;
}

function makeSphere(colorId: number, r: number, ox: number, oy: number, oz: number): Voxel[] {
  const voxels: Voxel[] = [];
  for (let x = -r; x <= r; x += 1) {
    for (let y = -r; y <= r; y += 1) {
      for (let z = -r; z <= r; z += 1) {
        if (x * x + y * y + z * z <= r * r) {
          voxels.push({ x: ox + x, y: oy + y, z: oz + z, colorId });
        }
      }
    }
  }
  return voxels;
}

function makePyramid(colorId: number, w: number, h: number, d: number, ox: number, oy: number, oz: number): Voxel[] {
  const voxels: Voxel[] = [];
  for (let layer = 0; layer < h; layer += 1) {
    const layerW = w - layer * 2;
    const layerD = d - layer * 2;
    if (layerW <= 0 || layerD <= 0) {
      break;
    }
    for (let x = 0; x < layerW; x += 1) {
      for (let z = 0; z < layerD; z += 1) {
        voxels.push({
          x: ox + layer + x,
          y: oy + layer,
          z: oz + layer + z,
          colorId
        });
      }
    }
  }
  return voxels;
}

export function generateVoxelsFromDsl(command: string, fallbackColorId: number): Voxel[] {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error("Command is empty.");
  }

  const ops = trimmed.split(/\s+/);
  const kind = ops[0].toLowerCase() as GeneratorKind;
  const args = ops.slice(1);

  if (kind === "box") {
    if (args.length < 4) {
      throw new Error("Usage: box <colorId> <w> <h> <d> [ox oy oz]");
    }
    const colorId = toInt(args[0], "colorId");
    const w = toInt(args[1], "width");
    const h = toInt(args[2], "height");
    const d = toInt(args[3], "depth");
    const ox = args[4] ? toInt(args[4], "ox") : 0;
    const oy = args[5] ? toInt(args[5], "oy") : 0;
    const oz = args[6] ? toInt(args[6], "oz") : 0;
    return makeBox(colorId, w, h, d, ox, oy, oz);
  }

  if (kind === "sphere") {
    if (args.length < 2) {
      throw new Error("Usage: sphere <colorId> <r> [ox oy oz]");
    }
    const colorId = toInt(args[0], "colorId");
    const r = toInt(args[1], "radius");
    const ox = args[2] ? toInt(args[2], "ox") : 0;
    // Lift by radius by default, so full sphere stays above ground (y >= 0).
    const oy = args[3] ? toInt(args[3], "oy") : r;
    const oz = args[4] ? toInt(args[4], "oz") : 0;
    return makeSphere(colorId, r, ox, oy, oz);
  }

  if (kind === "pyramid") {
    if (args.length < 4) {
      throw new Error("Usage: pyramid <colorId> <w> <h> <d> [ox oy oz]");
    }
    const colorId = toInt(args[0], "colorId");
    const w = toInt(args[1], "width");
    const h = toInt(args[2], "height");
    const d = toInt(args[3], "depth");
    const ox = args[4] ? toInt(args[4], "ox") : 0;
    const oy = args[5] ? toInt(args[5], "oy") : 0;
    const oz = args[6] ? toInt(args[6], "oz") : 0;
    return makePyramid(colorId, w, h, d, ox, oy, oz);
  }

  throw new Error(
    `Unknown generator "${ops[0]}". Supported: box, sphere, pyramid. Example: box ${fallbackColorId} 8 4 6 0 0 0`
  );
}

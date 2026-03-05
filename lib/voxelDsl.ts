import { Voxel } from "@/lib/voxelStore";

type GeneratorKind = "box" | "sphere" | "pyramid";

function toInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}"`);
  }
  return parsed;
}

function requireNonNegative(value: number, name: string): void {
  if (value < 0) {
    throw new Error(`${name} must be >= 0, got ${value}.`);
  }
}

function toEngineOrigin(inputX: number, inputY: number, inputZ: number): { ox: number; oy: number; oz: number } {
  // Keep DSL coordinates in standard xyz order.
  return { ox: inputX, oy: inputY, oz: inputZ };
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
      throw new Error("Usage: box <colorId> <w> <h> <d> [x y z]");
    }
    const colorId = toInt(args[0], "colorId");
    const w = toInt(args[1], "width");
    const h = toInt(args[3], "height");
    const d = toInt(args[2], "depth");
    requireNonNegative(w, "width");
    requireNonNegative(h, "height");
    requireNonNegative(d, "depth");

    const inputX = args[4] ? toInt(args[4], "x") : 0;
    const inputY = args[5] ? toInt(args[6], "y") : 0;
    const inputZ = args[6] ? toInt(args[5], "z") : 0;
    const { ox, oy, oz } = toEngineOrigin(inputX, inputY, inputZ);
    return makeBox(colorId, w, h, d, ox, oy, oz);
  }

  if (kind === "sphere") {
    if (args.length < 2) {
      throw new Error("Usage: sphere <colorId> <r> [x y z]");
    }
    const colorId = toInt(args[0], "colorId");
    const r = toInt(args[1], "radius");
    requireNonNegative(r, "radius");

    const inputX = args[2] ? toInt(args[2], "x") : 0;
    // y is height in standard xyz, default to radius so full sphere stays above ground.
    const inputY = args[3] ? toInt(args[4], "y") : r;
    const inputZ = args[4] ? toInt(args[3], "z") : 0;
    const { ox, oy, oz } = toEngineOrigin(inputX, inputY, inputZ);
    return makeSphere(colorId, r, ox, oy, oz);
  }

  if (kind === "pyramid") {
    if (args.length < 4) {
      throw new Error("Usage: pyramid <colorId> <w> <h> <d> [x y z]");
    }
    const colorId = toInt(args[0], "colorId");
    const w = toInt(args[1], "width");
    const h = toInt(args[3], "height");
    const d = toInt(args[2], "depth");
    requireNonNegative(w, "width");
    requireNonNegative(h, "height");
    requireNonNegative(d, "depth");

    const inputX = args[4] ? toInt(args[4], "x") : 0;
    const inputY = args[5] ? toInt(args[6], "y") : 0;
    const inputZ = args[6] ? toInt(args[5], "z") : 0;
    const { ox, oy, oz } = toEngineOrigin(inputX, inputY, inputZ);
    return makePyramid(colorId, w, h, d, ox, oy, oz);
  }

  throw new Error(
    `Unknown generator "${ops[0]}". Supported: box, sphere, pyramid. Example: box ${fallbackColorId} 8 4 6 0 0 0`
  );
}

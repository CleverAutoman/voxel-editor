import { Voxel } from "@/lib/voxelStore";

type GeneratorKind = "box" | "sphere" | "pyramid";

/** Parses an integer argument with a readable error message. */
function toInt(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${name}: "${value}"`);
  }
  return parsed;
}

/** Ensures generated dimensions and radius are not negative. */
function requireNonNegative(value: number, name: string): void {
  if (value < 0) {
    throw new Error(`${name} must be >= 0, got ${value}.`);
  }
}

/** Maps DSL origin (x, y, zHeight) to engine origin (x, yHeight, z). */
function toEngineOrigin(inputX: number, inputY: number, inputZHeight: number): { ox: number; oy: number; oz: number } {
  return { ox: inputX, oy: inputZHeight, oz: inputY };
}

/** Parses optional origin tuple [x y zHeight]. */
function parseOrigin(args: string[]): { ox: number; oy: number; oz: number } {
  const inputX = args[0] ? toInt(args[0], "x") : 0;
  const inputY = args[1] ? toInt(args[1], "y") : 0;
  const inputZHeight = args[2] ? toInt(args[2], "z") : 0;
  return toEngineOrigin(inputX, inputY, inputZHeight);
}

/** Generates a filled box voxel set from dimensions and origin. */
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

/** Generates a filled sphere voxel set from radius and origin. */
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

/** Generates a stepped pyramid voxel set from dimensions and origin. */
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

/** Parses a DSL command and returns generated voxels for that shape. */
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
      throw new Error("Usage: box <colorId> <w> <d> <h> [x y z]");
    }
    const colorId = toInt(args[0], "colorId");
    const w = toInt(args[1], "width");
    const d = toInt(args[2], "depth");
    const h = toInt(args[3], "height");
    requireNonNegative(w, "width");
    requireNonNegative(h, "height");
    requireNonNegative(d, "depth");

    const { ox, oy, oz } = parseOrigin(args.slice(4, 7));
    return makeBox(colorId, w, h, d, ox, oy, oz);
  }

  if (kind === "sphere") {
    if (args.length < 2) {
      throw new Error("Usage: sphere <colorId> <r> [x y z]");
    }
    const colorId = toInt(args[0], "colorId");
    const r = toInt(args[1], "radius");
    requireNonNegative(r, "radius");

    const hasOriginZ = args[4] !== undefined;
    const { ox, oy, oz } = hasOriginZ
      ? parseOrigin(args.slice(2, 5))
      : toEngineOrigin(args[2] ? toInt(args[2], "x") : 0, args[3] ? toInt(args[3], "y") : 0, r);
    return makeSphere(colorId, r, ox, oy, oz);
  }

  if (kind === "pyramid") {
    if (args.length < 4) {
      throw new Error("Usage: pyramid <colorId> <w> <d> <h> [x y z]");
    }
    const colorId = toInt(args[0], "colorId");
    const w = toInt(args[1], "width");
    const d = toInt(args[2], "depth");
    const h = toInt(args[3], "height");
    requireNonNegative(w, "width");
    requireNonNegative(h, "height");
    requireNonNegative(d, "depth");

    const { ox, oy, oz } = parseOrigin(args.slice(4, 7));
    return makePyramid(colorId, w, h, d, ox, oy, oz);
  }

  throw new Error(
    `Unknown generator "${ops[0]}". Supported: box, sphere, pyramid. Example: box ${fallbackColorId} 8 4 6 0 0 0`
  );
}

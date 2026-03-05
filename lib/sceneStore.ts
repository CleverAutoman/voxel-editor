import type { Voxel } from "@/lib/voxelStore";

type CameraSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
  zoom?: number;
};

export type SceneEntity = {
  version: number;
  timestamp: number;
  palette: Array<[number, string]>;
  entities: Voxel[];
  camera: CameraSnapshot;
};

export type VoxSceneEntity = {
  entities: Voxel[];
  palette: Array<[number, string]>;
};

let versionId = 0;
export function saveSceneEntity(
  palette: Map<number, string>,
  entities: Voxel[],
  camera: CameraSnapshot
): SceneEntity {
  const scene: SceneEntity = {
    version: versionId++,
    timestamp: Date.now(),
    palette: [...palette.entries()],
    entities,
    camera
  };

  const json = JSON.stringify(scene, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scene-${scene.version}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return scene;
}

export async function loadSceneEntity(file: File): Promise<SceneEntity> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<SceneEntity>;

  if (!parsed || !Array.isArray(parsed.entities) || !parsed.camera) {
    throw new Error("Invalid scene file.");
  }

  const paletteEntries = Array.isArray(parsed.palette) ? parsed.palette : [];
  const palette = paletteEntries
    .map((entry) => [Number(entry[0]), String(entry[1])] as [number, string])
    .filter((entry) => Number.isFinite(entry[0]));

  return {
    version: Number(parsed.version ?? 0),
    timestamp: Number(parsed.timestamp ?? Date.now()),
    palette,
    entities: parsed.entities,
    camera: {
      position: parsed.camera.position ?? [10, 10, 10],
      target: parsed.camera.target ?? [0, 0, 0],
      zoom: parsed.camera.zoom
    }
  };
}

export function paletteEntriesToMap(entries: Array<[number, string]>): Map<number, string> {
  return new Map(entries);
}

function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((ch) => `${ch}${ch}`).join("") : clean;
  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) {
    return { r: 255, g: 255, b: 255, a: 255 };
  }
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
    a: 255
  };
}

function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function writeInt32LE(value: number): Uint8Array {
  const arr = new Uint8Array(4);
  new DataView(arr.buffer).setInt32(0, value, true);
  return arr;
}

function readInt32LE(buffer: Uint8Array, offset: number): number {
  return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength).getInt32(offset, true);
}

function writeAscii4(id: string): Uint8Array {
  const arr = new Uint8Array(4);
  for (let i = 0; i < 4; i += 1) {
    arr[i] = id.charCodeAt(i) ?? 32;
  }
  return arr;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function buildChunk(id: string, content: Uint8Array, children: Uint8Array = new Uint8Array()): Uint8Array {
  return concatBytes([
    writeAscii4(id),
    writeInt32LE(content.length),
    writeInt32LE(children.length),
    content,
    children
  ]);
}

export async function saveSceneAsVox(palette: Map<number, string>, entities: Voxel[]): Promise<void> {
  const source = entities.filter((voxel) => voxel.y >= 0);
  if (source.length === 0) {
    throw new Error("No voxel to export.");
  }

  for (const voxel of source) {
    if (voxel.x < 0 || voxel.y < 0 || voxel.z < 0) {
      throw new Error(
        `VOX export requires non-negative coordinates. Found (${voxel.x}, ${voxel.y}, ${voxel.z}).`
      );
    }
    if (voxel.x > 255 || voxel.y > 255 || voxel.z > 255) {
      throw new Error(
        `VOX export coordinate out of range [0,255]. Found (${voxel.x}, ${voxel.y}, ${voxel.z}).`
      );
    }
    if (voxel.colorId < 0 || voxel.colorId > 254) {
      throw new Error(`VOX export colorId must be in [0,254]. Found ${voxel.colorId}.`);
    }
  }

  const maxX = Math.max(...source.map((v) => v.x));
  const maxY = Math.max(...source.map((v) => v.y));
  const maxZ = Math.max(...source.map((v) => v.z));

  const size = {
    x: maxX + 1,
    y: maxY + 1,
    z: maxZ + 1
  };

  if (size.x > 255 || size.y > 255 || size.z > 255) {
    throw new Error("VOX export supports max 255 size per axis.");
  }

  const xyziValues = source.map((voxel) => ({
    x: voxel.x,
    y: voxel.y,
    z: voxel.z,
    i: voxel.colorId + 1
  }));

  const rgbaValues = Array.from({ length: 256 }, () => ({ r: 255, g: 255, b: 255, a: 255 }));
  const usedColorIds = [...new Set(source.map((voxel) => voxel.colorId))];
  usedColorIds.forEach((colorId) => {
    const color = palette.get(colorId) ?? "#ffffff";
    rgbaValues[colorId] = hexToRgba(color);
  });

  const sizeContent = concatBytes([writeInt32LE(size.x), writeInt32LE(size.y), writeInt32LE(size.z)]);

  const xyziContent = new Uint8Array(4 + xyziValues.length * 4);
  new DataView(xyziContent.buffer).setInt32(0, xyziValues.length, true);
  xyziValues.forEach((value, index) => {
    const base = 4 + index * 4;
    xyziContent[base] = value.x;
    xyziContent[base + 1] = value.y;
    xyziContent[base + 2] = value.z;
    xyziContent[base + 3] = value.i;
  });

  const rgbaContent = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i += 1) {
    const rgba = rgbaValues[i] ?? { r: 255, g: 255, b: 255, a: 255 };
    const base = i * 4;
    rgbaContent[base] = rgba.r;
    rgbaContent[base + 1] = rgba.g;
    rgbaContent[base + 2] = rgba.b;
    rgbaContent[base + 3] = rgba.a;
  }

  const mainChildren = concatBytes([
    buildChunk("SIZE", sizeContent),
    buildChunk("XYZI", xyziContent),
    buildChunk("RGBA", rgbaContent)
  ]);

  const fileBytes = concatBytes([
    writeAscii4("VOX "),
    writeInt32LE(150),
    buildChunk("MAIN", new Uint8Array(), mainChildren)
  ]);

  const arrayBuffer = new ArrayBuffer(fileBytes.byteLength);
  new Uint8Array(arrayBuffer).set(fileBytes);
  const blob = new Blob([arrayBuffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scene-${Date.now()}.vox`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadSceneFromVox(file: File): Promise<VoxSceneEntity> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "VOX ") {
    throw new Error("Invalid VOX file header.");
  }
  if (readInt32LE(bytes, 4) !== 150) {
    throw new Error("Unsupported VOX version.");
  }

  let xyziValues: Array<{ x: number; y: number; z: number; i: number }> = [];
  let rgbaValues: Array<{ r: number; g: number; b: number; a: number }> = [];

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const contentSize = readInt32LE(bytes, offset + 4);
    const childrenSize = readInt32LE(bytes, offset + 8);
    const contentOffset = offset + 12;
    const childrenOffset = contentOffset + contentSize;

    const parseChunkRange = (start: number, end: number) => {
      let cursor = start;
      while (cursor + 12 <= end) {
        const childId = String.fromCharCode(bytes[cursor], bytes[cursor + 1], bytes[cursor + 2], bytes[cursor + 3]);
        const childContentSize = readInt32LE(bytes, cursor + 4);
        const childChildrenSize = readInt32LE(bytes, cursor + 8);
        const childContentOffset = cursor + 12;
        const childChildrenOffset = childContentOffset + childContentSize;

        if (childId === "XYZI") {
          const num = readInt32LE(bytes, childContentOffset);
          const values: Array<{ x: number; y: number; z: number; i: number }> = [];
          for (let i = 0; i < num; i += 1) {
            const base = childContentOffset + 4 + i * 4;
            values.push({
              x: bytes[base],
              y: bytes[base + 1],
              z: bytes[base + 2],
              i: bytes[base + 3]
            });
          }
          xyziValues = values;
        } else if (childId === "RGBA") {
          const values: Array<{ r: number; g: number; b: number; a: number }> = [];
          for (let i = 0; i < 256; i += 1) {
            const base = childContentOffset + i * 4;
            values.push({
              r: bytes[base],
              g: bytes[base + 1],
              b: bytes[base + 2],
              a: bytes[base + 3]
            });
          }
          rgbaValues = values;
        }

        cursor = childChildrenOffset + childChildrenSize;
      }
    };

    if (id === "MAIN") {
      parseChunkRange(childrenOffset, childrenOffset + childrenSize);
    }

    offset = childrenOffset + childrenSize;
  }

  if (xyziValues.length === 0) {
    throw new Error("Invalid VOX file: missing XYZI chunk.");
  }

  const colorIdByHex = new Map<string, number>();
  const paletteEntries: Array<[number, string]> = [];
  const entities: Voxel[] = [];

  for (const entry of xyziValues) {
    const x = Number(entry.x ?? 0);
    const y = Number(entry.y ?? 0);
    const z = Number(entry.z ?? 0);
    const rawIndex = Number(entry.i ?? 1);
    const paletteIndex = Math.max(1, Math.min(255, rawIndex));
    const rgba = rgbaValues[paletteIndex - 1] ?? { r: 255, g: 255, b: 255 };
    const hex = rgbaToHex(Number(rgba.r ?? 255), Number(rgba.g ?? 255), Number(rgba.b ?? 255));
    const colorId = paletteIndex - 1;
    if (!colorIdByHex.has(hex)) {
      colorIdByHex.set(hex, colorId);
    }
    if (!paletteEntries.find((entryItem) => entryItem[0] === colorId)) {
      paletteEntries.push([colorId, hex]);
    }

    entities.push({ x, y, z, colorId });
  }

  return { entities, palette: paletteEntries };
}
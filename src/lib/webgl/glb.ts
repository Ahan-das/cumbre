/**
 * Minimal GLB (glTF 2.0 binary) reader.
 * Covers exactly what the Blender cup export uses: uncompressed indexed
 * triangles, POSITION / NORMAL / TEXCOORD_0, node TRS, PBR base colour
 * (factor or embedded PNG), alphaMode. No three.js needed for seven meshes.
 */
import { mat4 } from "./math";

export type Primitive = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
  indices: Uint16Array | Uint32Array;
  color: [number, number, number, number];
  roughness: number;
  metallic: number;
  image: ImageBitmap | null;
  blend: boolean;
  name: string;
  matrix: Float32Array;
};

type Json = {
  nodes: { mesh?: number; name?: string; translation?: number[]; rotation?: number[]; scale?: number[]; children?: number[] }[];
  meshes: { primitives: { attributes: Record<string, number>; indices: number; material?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string; min?: number[]; max?: number[] }[];
  bufferViews: { byteOffset?: number; byteLength: number }[];
  materials?: {
    name?: string;
    alphaMode?: string;
    pbrMetallicRoughness?: { baseColorFactor?: number[]; baseColorTexture?: { index: number }; metallicFactor?: number; roughnessFactor?: number };
  }[];
  textures?: { source: number }[];
  images?: { bufferView: number; mimeType: string }[];
  scenes?: { nodes: number[] }[];
};

const SIZE: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

export async function loadGlb(src: string | ArrayBuffer): Promise<{ prims: Primitive[]; min: number[]; max: number[] }> {
  const buf = typeof src === "string" ? await (await fetch(src)).arrayBuffer() : src;
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("Not a GLB");
  const jsonLen = dv.getUint32(12, true);
  const json: Json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const binStart = 20 + jsonLen + 8;

  const view = (i: number) => {
    const bv = json.bufferViews[i];
    return { offset: binStart + (bv.byteOffset ?? 0), length: bv.byteLength };
  };

  const accessor = (i: number) => {
    const a = json.accessors[i];
    const v = view(a.bufferView);
    const n = a.count * SIZE[a.type];
    const off = v.offset + (a.byteOffset ?? 0);
    // slice() copies, so alignment of the source buffer never matters
    switch (a.componentType) {
      case 5126: return new Float32Array(buf.slice(off, off + n * 4));
      case 5123: return new Uint16Array(buf.slice(off, off + n * 2));
      case 5125: return new Uint32Array(buf.slice(off, off + n * 4));
      case 5121: return Uint16Array.from(new Uint8Array(buf, off, n));
      default: throw new Error("Unsupported component type " + a.componentType);
    }
  };

  const images = await Promise.all(
    (json.images ?? []).map(async (img) => {
      const v = view(img.bufferView);
      const blob = new Blob([new Uint8Array(buf, v.offset, v.length)], { type: img.mimeType });
      // glTF UVs have origin top-left; keep the bitmap unflipped
      return createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "none" });
    }),
  );

  const prims: Primitive[] = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  const visit = (ni: number, parent: Float32Array) => {
    const node = json.nodes[ni];
    const local = mat4.fromTRS(node.translation ?? [0, 0, 0], node.rotation ?? [0, 0, 0, 1], node.scale ?? [1, 1, 1]);
    const world = mat4.multiply(parent, local);
    if (node.mesh !== undefined) {
      for (const p of json.meshes[node.mesh].primitives) {
        const m = json.materials?.[p.material ?? -1];
        const pbr = m?.pbrMetallicRoughness ?? {};
        const tex = pbr.baseColorTexture ? json.textures?.[pbr.baseColorTexture.index] : undefined;
        const positions = accessor(p.attributes.POSITION) as Float32Array;
        for (let k = 0; k < positions.length; k += 3) {
          const w = mat4.transformPoint(world, positions[k], positions[k + 1], positions[k + 2]);
          for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], w[a]); max[a] = Math.max(max[a], w[a]); }
        }
        prims.push({
          positions,
          normals: accessor(p.attributes.NORMAL) as Float32Array,
          uvs: p.attributes.TEXCOORD_0 !== undefined ? (accessor(p.attributes.TEXCOORD_0) as Float32Array) : null,
          indices: accessor(p.indices) as Uint16Array | Uint32Array,
          color: (pbr.baseColorFactor ?? [1, 1, 1, 1]) as [number, number, number, number],
          roughness: pbr.roughnessFactor ?? 1,
          metallic: pbr.metallicFactor ?? 1,
          image: tex ? images[tex.source] : null,
          blend: m?.alphaMode === "BLEND",
          name: m?.name ?? "",
          matrix: world,
        });
      }
    }
    node.children?.forEach((c) => visit(c, world));
  };

  const roots = json.scenes?.[0]?.nodes ?? json.nodes.map((_, i) => i);
  roots.forEach((r) => visit(r, mat4.identity()));
  return { prims, min, max };
}

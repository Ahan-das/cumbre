import { loadGlb, type Primitive } from "./glb";
import { mat4 } from "./math";
import { CUP_FRAG, CUP_VERT, STEAM_FRAG, STEAM_VERT } from "./shaders";

export type CupPose = {
  yaw: number;    // radians around Y
  pitch: number;  // radians around X
  roll: number;   // radians around Z
  scale: number;  // 1 = cup fills ~72% of canvas height
  x: number;      // view-space offset, in cup heights
  y: number;
  steam: number;  // 0..1
  fade: number;   // 0..1
};

type GpuPrim = {
  vao: WebGLVertexArrayObject;
  count: number;
  type: number;
  src: Primitive;
  tex: WebGLTexture | null;
  grain: number;
  decal: boolean;
};

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
  const u = new Map<string, WebGLUniformLocation | null>();
  return {
    program: p,
    loc(name: string) {
      if (!u.has(name)) u.set(name, gl.getUniformLocation(p, name));
      return u.get(name)!;
    },
  };
}

/**
 * Renders the Blender cup with a hand-written PBR-ish shader and a GLSL
 * steam plume. ~7 kB instead of a full scene-graph library, which is the
 * right trade for one hero object with seven meshes.
 */
export class CupRenderer {
  private gl: WebGL2RenderingContext;
  private cup = null as ReturnType<typeof compile> | null;
  private steam = null as ReturnType<typeof compile> | null;
  private prims: GpuPrim[] = [];
  private steamVao: WebGLVertexArrayObject | null = null;
  private center = [0, 0, 0];
  private height = 1;
  private topY = 0.5;
  private dpr = 1;
  private decal: { image: ImageBitmap; params: number[]; arcScale: number } | null = null;
  private decalTex: WebGLTexture | null = null;
  ready = false;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
  }

  async load(src: string | ArrayBuffer) {
    const gl = this.gl;
    const { prims, min, max } = await loadGlb(src);
    this.cup = compile(gl, CUP_VERT, CUP_FRAG);
    this.steam = compile(gl, STEAM_VERT, STEAM_FRAG);
    this.center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    this.height = max[1] - min[1];
    this.topY = (max[1] - this.center[1]) / this.height;

    // The Blender label is a flat plane floating in front of the sleeve. Rather than
    // draw it, project its texture onto the cup body in the shader.
    const body = prims.find((p) => p.name === "cup-paper");
    const decal = prims.find((p) => p.blend && p.image);
    if (body && decal) {
      const bm = body.matrix, dm = decal.matrix;
      const sx = Math.hypot(bm[0], bm[1], bm[2]);
      const sy = Math.hypot(bm[4], bm[5], bm[6]);
      let half = 0;
      for (let k = 0; k < decal.positions.length; k += 3) half = Math.max(half, Math.abs(decal.positions[k]));
      const ds = Math.hypot(dm[0], dm[1], dm[2]) * half; // world half-size
      this.decal = {
        image: decal.image!,
        params: [dm[12] - bm[12], ds, (dm[13] - bm[13]) / sy, ds / sy],
        arcScale: sx,
      };
    }
    const drawable = prims.filter((p) => !(p.blend && p.image));

    for (const p of drawable) {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const attr = (loc: number, data: Float32Array, size: number) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      };
      attr(0, p.positions, 3);
      attr(1, p.normals, 3);
      attr(2, p.uvs ?? new Float32Array((p.positions.length / 3) * 2), 2);
      const ib = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, p.indices, gl.STATIC_DRAW);

      let tex: WebGLTexture | null = null;
      const isBody = p.name === "cup-paper" || p.name === "paper";
      const img = p.image ?? (isBody && this.decal ? this.decal.image : null);
      if (img && isBody && this.decalTex) {
        tex = this.decalTex;
      } else if (img) {
        tex = gl.createTexture();
        if (isBody) this.decalTex = tex;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      }
      this.prims.push({
        vao,
        count: p.indices.length,
        type: p.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
        src: p,
        tex,
        grain: p.name === "cup-paper" ? 1 : p.name === "paper" ? 0.5 : 0,
        decal: isBody && !!this.decal,
      });
    }
    // opaque first, decal last
    this.prims.sort((a, b) => Number(a.src.blend) - Number(b.src.blend));

    this.steamVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.steamVao);
    const sb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.ready = true;
  }

  resize(maxDpr = 2) {
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * this.dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /** Screen-space footprint of the cup base, in CSS px: centre x/y and radius. */
  base = { x: 0, y: 0, r: 0 };

  render(pose: CupPose, time: number) {
    if (!this.ready || !this.cup || !this.steam) return;
    const gl = this.gl;
    const { width, height } = this.canvas;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fov = (26 * Math.PI) / 180;
    const aspect = width / height;
    const proj = mat4.perspective(fov, aspect, 0.1, 50);
    // distance at which a unit-height object spans the canvas height
    const dist = 0.5 / Math.tan(fov / 2);
    const view = mat4.multiply(mat4.translation(pose.x, pose.y, -dist / 0.72), mat4.rotationX(0.16));

    const s = pose.scale / this.height;
    let scene = mat4.translation(-this.center[0], -this.center[1], -this.center[2]);
    scene = mat4.multiply(mat4.scaling(s), scene);
    scene = mat4.multiply(mat4.rotationY(pose.yaw), scene);
    scene = mat4.multiply(mat4.rotationX(pose.pitch), scene);
    scene = mat4.multiply(mat4.rotationZ(pose.roll), scene);

    // project the base centre and rim so the DOM contact shadow can sit exactly under the cup
    {
      const vp = mat4.multiply(proj, view);
      const tilt = mat4.multiply(mat4.rotationZ(pose.roll), mat4.rotationX(pose.pitch));
      const bottom = -0.5 * pose.scale;
      const radius = 0.34 * pose.scale;
      const toCss = (x: number, y: number, z: number) => {
        const [px, py, pz] = mat4.transformPoint(tilt, x, y, z);
        const m = vp;
        const cx = m[0] * px + m[4] * py + m[8] * pz + m[12];
        const cy = m[1] * px + m[5] * py + m[9] * pz + m[13];
        const cw = m[3] * px + m[7] * py + m[11] * pz + m[15];
        return [((cx / cw) * 0.5 + 0.5) * (width / this.dpr), ((-cy / cw) * 0.5 + 0.5) * (height / this.dpr)];
      };
      const c = toCss(0, bottom, 0);
      const e = toCss(radius, bottom, 0);
      this.base = { x: c[0], y: c[1], r: Math.abs(e[0] - c[0]) };
    }

    gl.useProgram(this.cup.program);
    gl.uniformMatrix4fv(this.cup.loc("uProj"), false, proj);
    gl.uniformMatrix4fv(this.cup.loc("uView"), false, view);
    gl.uniform1f(this.cup.loc("uFade"), pose.fade);
    gl.uniform1i(this.cup.loc("uTex"), 0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    for (const p of this.prims) {
      const model = mat4.multiply(scene, p.src.matrix);
      const mv = mat4.multiply(view, model);
      gl.uniformMatrix4fv(this.cup.loc("uModel"), false, model);
      gl.uniformMatrix3fv(this.cup.loc("uNormalMat"), false, mat4.normalMatrix(mv));
      gl.uniform4fv(this.cup.loc("uColor"), p.src.color);
      // kraft paper reads better as a dielectric with a satin sheen than as a half-metal
      gl.uniform1f(this.cup.loc("uMetal"), Math.min(p.src.metallic, 0.12));
      gl.uniform1f(this.cup.loc("uRough"), p.grain > 0 ? Math.max(p.src.roughness, 0.62) : p.src.roughness);
      gl.uniform1f(this.cup.loc("uGrain"), p.grain);
      gl.uniform1f(this.cup.loc("uUseTex"), p.tex && !p.decal ? 1 : 0);
      gl.uniform1f(this.cup.loc("uUseDecal"), p.decal ? 1 : 0);
      if (p.decal && this.decal) {
        gl.uniform4fv(this.cup.loc("uDecal"), this.decal.params);
        gl.uniform1f(this.cup.loc("uArcScale"), this.decal.arcScale);
      }
      if (p.src.blend) {
        gl.depthMask(false);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-2, -2);
      }
      if (p.tex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, p.tex);
      }
      gl.bindVertexArray(p.vao);
      gl.drawElements(gl.TRIANGLES, p.count, p.type, 0);
      if (p.src.blend) {
        gl.depthMask(true);
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }
    }

    if (pose.steam > 0.01 && this.steamVao) {
      // anchor at the lid centre, in view space
      const lid = mat4.transformPoint(mat4.multiply(view, mat4.multiply(mat4.rotationZ(pose.roll), mat4.rotationX(pose.pitch))), 0, this.topY * pose.scale - 0.02, 0);
      gl.useProgram(this.steam.program);
      gl.uniformMatrix4fv(this.steam.loc("uProj"), false, proj);
      gl.uniform3fv(this.steam.loc("uCenterV"), lid);
      gl.uniform2f(this.steam.loc("uSize"), pose.scale * 0.8, pose.scale * 1.0);
      gl.uniform1f(this.steam.loc("uTime"), time);
      gl.uniform1f(this.steam.loc("uAmount"), pose.steam * pose.fade);
      gl.depthMask(false);
      gl.bindVertexArray(this.steamVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.depthMask(true);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    const texs = new Set(this.prims.map((p) => p.tex));
    this.prims.forEach((p) => gl.deleteVertexArray(p.vao));
    texs.forEach((t) => t && gl.deleteTexture(t));
    if (this.cup) gl.deleteProgram(this.cup.program);
    if (this.steam) gl.deleteProgram(this.steam.program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.ready = false;
  }
}

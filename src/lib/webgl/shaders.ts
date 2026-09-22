/* GLSL ES 3.00 sources for the hero cup. */

export const CUP_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
uniform mat4 uModel;      // node world * scene transform
uniform mat4 uView;
uniform mat4 uProj;
uniform mat3 uNormalMat;  // view-space normal matrix
out vec3 vN;
out vec3 vPosV;
out vec3 vObj;
out vec2 vUv;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vec4 vp = uView * wp;
  vPosV = vp.xyz;
  vN = uNormalMat * aNormal;
  vObj = aPos;
  vUv = aUv;
  gl_Position = uProj * vp;
}`;

export const CUP_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec3 vN;
in vec3 vPosV;
in vec3 vObj;
in vec2 vUv;
uniform vec4 uColor;
uniform float uRough;
uniform float uMetal;
uniform float uGrain;      // paper fibre strength
uniform float uUseTex;
uniform sampler2D uTex;
uniform float uFade;       // intro fade
uniform float uUseDecal;   // print the label straight onto the sleeve
uniform vec4 uDecal;       // arc centre, arc half-width, local y centre, local y half-height
uniform float uArcScale;   // local radius -> world arc length
out vec4 outColor;

const float PI = 3.14159265;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}

vec3 srgbToLinear(vec3 c) { return pow(c, vec3(2.2)); }

// GGX / Smith / Schlick
vec3 brdf(vec3 N, vec3 V, vec3 L, vec3 albedo, float rough, float metal, vec3 lightCol) {
  vec3 H = normalize(V + L);
  float NdL = max(dot(N, L), 0.0);
  float NdV = max(dot(N, V), 1e-3);
  float NdH = max(dot(N, H), 0.0);
  float a = rough * rough;
  float a2 = a * a;
  float d = NdH * NdH * (a2 - 1.0) + 1.0;
  float D = a2 / (PI * d * d);
  float k = (rough + 1.0) * (rough + 1.0) / 8.0;
  float G = (NdV / (NdV * (1.0 - k) + k)) * (NdL / (NdL * (1.0 - k) + k));
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  vec3 spec = D * G * F / (4.0 * NdV * NdL + 1e-4);
  vec3 kd = (1.0 - F) * (1.0 - metal);
  // wrapped diffuse keeps the terminator soft, like a studio softbox
  float wrap = max((dot(N, L) + 0.35) / 1.35, 0.0);
  return (kd * albedo / PI * wrap + spec * NdL) * lightCol;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vPosV);

  vec4 base = uColor;
  if (uUseTex > 0.5) {
    vec4 t = texture(uTex, vUv);
    base = vec4(srgbToLinear(t.rgb), t.a) * uColor;
    if (base.a < 0.02) discard;
  }

  // kraft fibres: low-frequency mottling plus fine speckle
  float fib = noise(vObj * vec3(9.0, 60.0, 9.0)) * 0.6 + noise(vObj * 140.0) * 0.4;
  vec3 albedo = base.rgb * mix(1.0, 0.82 + 0.3 * fib, uGrain);
  float rough = clamp(uRough + (fib - 0.5) * 0.12 * uGrain, 0.08, 1.0);

  // cylindrical projection: the label wraps the paper like real print
  if (uUseDecal > 0.5 && gl_FrontFacing) {
    float ang = atan(vObj.x, vObj.z);
    float arc = ang * length(vObj.xz) * uArcScale;
    vec2 duv = vec2(0.5 + (arc - uDecal.x) / (2.0 * uDecal.y), 0.5 - (vObj.y - uDecal.z) / (2.0 * uDecal.w));
    if (all(greaterThan(duv, vec2(0.0))) && all(lessThan(duv, vec2(1.0))) && abs(ang) < 1.5) {
      vec4 ink = texture(uTex, duv);
      albedo = mix(albedo, srgbToLinear(ink.rgb) * 0.92, ink.a);
      rough = mix(rough, 0.42, ink.a);
    }
  }

  // three-light studio rig, fixed to the camera so highlights slide as the cup turns
  vec3 col = vec3(0.0);
  col += brdf(N, V, normalize(vec3(-0.55, 0.65, 0.75)), albedo, rough, uMetal, vec3(1.0, 0.94, 0.86) * 5.2);
  col += brdf(N, V, normalize(vec3(0.9, 0.05, 0.45)), albedo, rough, uMetal, vec3(1.0, 0.72, 0.56) * 1.6);
  col += brdf(N, V, normalize(vec3(0.35, 0.5, -1.0)), albedo, max(rough, 0.3), uMetal, vec3(1.0, 0.86, 0.72) * 4.0);

  // warm hemisphere: peach sky, roasted ground bounce
  float hemi = N.y * 0.5 + 0.5;
  vec3 amb = mix(vec3(0.42, 0.22, 0.13), vec3(1.0, 0.82, 0.7), hemi);
  col += albedo * amb * 0.42 * (1.0 - uMetal * 0.5);

  // fresnel sheen picks up the page colour on the silhouette
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  col += vec3(1.0, 0.78, 0.62) * fr * 0.35 * (1.0 - rough * 0.5);

  col = aces(col * 1.05);
  col = pow(col, vec3(1.0 / 2.2));
  float a = base.a * uFade;
  outColor = vec4(col * a, a);
}`;

/* Steam: a camera-facing quad above the lid, fbm wisps drifting upward. */
export const STEAM_VERT = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec2 aCorner;
uniform vec3 uCenterV;   // view-space anchor (top of lid)
uniform vec2 uSize;
uniform mat4 uProj;
out vec2 vUv;
void main() {
  vUv = aCorner * 0.5 + 0.5;
  vec3 p = uCenterV + vec3(aCorner.x * uSize.x * 0.5, (aCorner.y * 0.5 + 0.5) * uSize.y, 0.0);
  gl_Position = uProj * vec4(p, 1.0);
}`;

export const STEAM_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime;
uniform float uAmount;
out vec4 outColor;

float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * n(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.22;
  // domain-warped column that sways as it rises
  float sway = (fbm(vec2(uv.y * 2.0 - t, 3.1)) - 0.5) * 0.55 * uv.y;
  vec2 p = vec2((uv.x - 0.5 - sway) * 3.2, uv.y * 2.4 - t * 2.2);
  float w = fbm(p + fbm(p * 1.4 + t) * 1.3);
  float column = exp(-pow((uv.x - 0.5 - sway) * 4.2 / (0.35 + uv.y), 2.0));
  float band = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.45, uv.y);
  float d = smoothstep(0.42, 0.95, w) * column * band;
  float a = d * 0.8 * uAmount;
  vec3 c = vec3(1.0, 0.97, 0.93);
  outColor = vec4(c * a, a);
}`;

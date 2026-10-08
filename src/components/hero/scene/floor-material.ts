import { NoBlending, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

/** Hex cell size on the floor, in world units (≈ CSS px at the near edge). */
const CELL = 56;

/** Shared GLSL: rolling terrain, flattened into a plateau under the terminal. */
const terrain = /* glsl */ `
uniform float uTime;
uniform vec4 uRect;

float waves(vec2 p) {
  return 0.55 * sin(p.x * 0.0021 + uTime * 0.22)
       + 0.45 * sin(p.y * 0.0017 - uTime * 0.17 + p.x * 0.0009)
       + 0.25 * sin((p.x + p.y) * 0.0042 + uTime * 0.31);
}

/** 0 on the terminal's footprint, rising to 1 a few cells away from it. */
float plateau(vec2 p) {
  vec2 q = abs(p - uRect.xy) - uRect.zw;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return smoothstep(60.0, 520.0, sd);
}
`;

const vertexShader = /* glsl */ `
${terrain}
uniform float uAmp;
varying vec2 vLocal;
varying float vDepth;
varying float vHeight;

void main() {
  vLocal = position.xy;
  float h = waves(position.xy) * plateau(position.xy);
  vHeight = h;
  vec3 p = position + vec3(0.0, 0.0, h * uAmp);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

/**
 * Hive topology as a line drawing on rolling ground: hairline hex edges in a
 * single warm grey, crests catching a little more light. With distance the
 * lines soften (a cheap depth-of-field: the anti-aliasing width grows while
 * opacity falls) and the field dissolves into a faint haze. Runtime events
 * send ripples through it. Output is premultiplied alpha.
 */
const fragmentShader = /* glsl */ `
${terrain}
uniform float uIntro;
uniform float uPulse;
uniform float uIntensity;
uniform vec2 uRes;
uniform float uCeil;
uniform float uPx;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uRipple;

varying vec2 vLocal;
varying float vDepth;
varying float vHeight;

float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}

vec4 hexCell(vec2 p) {
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, hc.xy) : vec4(h.zw, hc.zw + 0.5);
}

float hexEdge(vec2 p) {
  p = abs(p);
  return max(dot(p, vec2(0.5, 0.8660254)), p.x);
}

void main() {
  // Distance → blur: 0 near, 1 where the field dissolves.
  float far = smoothstep(uFogNear, uFogFar, vDepth);
  float blur = 1.0 + far * 7.0;

  vec2 p = vLocal / ${CELL.toFixed(1)};
  vec4 h = hexCell(p);
  float e = 0.5 - hexEdge(h.xy);
  float fw = fwidth(e) * blur;
  // Hairline: ~1px at the near edge, softening (and fading) with distance.
  float line = (1.0 - smoothstep(0.012, 0.012 + fw, e)) / sqrt(blur);

  float crest = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
  float shimmer = vnoise(vLocal * 0.003 + vec2(uTime * 0.04, -uTime * 0.03));
  float packet = pow(0.5 + 0.5 * sin(dot(h.zw, vec2(0.7, 0.4)) * 1.1 - uTime * 1.0), 10.0);

  float rip = 0.0;
  if (uRipple.z > -5.0) {
    float age = uTime - uRipple.z;
    float d = length(vLocal - uRipple.xy);
    rip = exp(-pow((d - age * 620.0) / 80.0, 2.0)) * exp(-age * 1.1);
  }

  // Quieter under the terminal so it reads as resting on the floor.
  vec2 q = abs(vLocal - uRect.xy) - uRect.zw;
  float under = 1.0 - 0.75 * step(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0), 0.0);

  float span = uFogFar - uFogNear;
  float fog = 1.0 - smoothstep(uFogFar - span * 0.2, uFogFar + span * 0.5, vDepth);
  float yTop = uRes.y - gl_FragCoord.y;
  // Reaches up toward the copy, fading out well before the headline.
  float band = smoothstep(uCeil - 180.0 * uPx, uCeil + 220.0 * uPx, yTop);
  float fade = band * uIntro * uIntensity;

  float a = line * (0.025 + 0.13 * crest * crest + 0.03 * shimmer + 0.04 * packet + 0.3 * rip + 0.08 * uPulse) * under * fog;
  // Haze: a faint drifting smoke where the field dissolves.
  float haze = far * (1.0 - smoothstep(uFogFar, uFogFar + span * 0.8, vDepth)) * 0.035
             * vnoise(vLocal * 0.0035 + vec2(uTime * 0.05, uTime * 0.02));

  float alpha = clamp((a + haze) * fade, 0.0, 1.0);
  gl_FragColor = vec4(vec3(0.82, 0.81, 0.78) * alpha, alpha);
}
`;

export function createFloorMaterial() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 240 },
      uIntro: { value: 0 },
      uPulse: { value: 0 },
      uIntensity: { value: 1 },
      uRes: { value: new Vector2(1, 1) },
      uCeil: { value: 0 },
      uPx: { value: 1 },
      uFogNear: { value: 1000 },
      uFogFar: { value: 2000 },
      uRipple: { value: new Vector3(0, 0, -10) },
      uRect: { value: new Vector4(0, 0, 0, 0) },
    },
  });
}

/**
 * Ground plane in local floor units, extending toward the camera and far
 * back into the haze. Subdivided so the waves have vertices to move.
 */
export function createFloorGeometry() {
  const width = 14000;
  const depth = 12000;
  return new PlaneGeometry(width, depth, 280, 240).translate(0, depth / 2 - 900, 0);
}

export type FloorMaterial = ReturnType<typeof createFloorMaterial>;

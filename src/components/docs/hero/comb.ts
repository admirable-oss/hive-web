import { CylinderGeometry, InstancedBufferAttribute, ShaderMaterial, Vector2, Vector4 } from "three";

/** Cell circumradius in world units; the comb is pointy-top hexes on the XZ plane. */
export const R = 1;
const SQRT3 = Math.sqrt(3);
/** Cells beyond this radius are not built at all; the shader fades well before it. */
const EXTENT = 8.6;
export const FADE: [number, number] = [3.4, 7.4];
export const RIPPLES = 4;

export interface Cell {
  x: number;
  z: number;
  /** Distance from the comb centre. */
  d: number;
  /** Grid address for the HUD, e.g. "07·04". */
  label: string;
}

/** The comb layout, sorted far-to-near so faded edge cells never occlude live ones. */
export function buildCells(): Cell[] {
  const cells: Cell[] = [];
  for (let r = -7; r <= 7; r++) {
    for (let c = -7; c <= 7; c++) {
      const x = (c + (r & 1 ? 0.5 : 0)) * SQRT3 * R;
      const z = r * 1.5 * R;
      const d = Math.hypot(x, z);
      const pad = (n: number) => String(n + 7).padStart(2, "0");
      if (d < EXTENT) cells.push({ x, z, d, label: `${pad(c)}·${pad(r)}` });
    }
  }
  return cells.sort((a, b) => a.z - b.z);
}

/** Nearest cell to a ground point, or -1 when the point is off the comb. */
export function cellAt(cells: Cell[], x: number, z: number, max = R): number {
  let best = -1;
  let bd = max * max;
  for (let i = 0; i < cells.length; i++) {
    const dx = cells[i].x - x;
    const dz = cells[i].z - z;
    const dd = dx * dx + dz * dz;
    if (dd < bd) {
      bd = dd;
      best = i;
    }
  }
  return best;
}

export function createCombGeometry(cells: Cell[]) {
  // One prism, top face at y=0; per-cell data rides instanced attributes.
  const g = new CylinderGeometry(R * 0.94, R * 0.94, 1, 6, 1);
  g.translate(0, -0.5, 0);
  const n = cells.length;
  const cell = new Float32Array(n * 3);
  cells.forEach((c, i) => cell.set([c.x, c.z, Math.random()], i * 3));
  g.setAttribute("aCell", new InstancedBufferAttribute(cell, 3));
  g.setAttribute("aFill", new InstancedBufferAttribute(new Float32Array(n), 1));
  g.setAttribute("aState", new InstancedBufferAttribute(new Float32Array(n), 1));
  return g;
}

const vertexShader = /* glsl */ `
attribute vec3 aCell;
attribute float aFill;
attribute float aState;

uniform float uTime;
uniform float uBeat;
uniform vec4 uRipples[${RIPPLES}];
uniform vec2 uBee;

varying vec2 vLocal;
varying float vTop;
varying float vY;
varying float vGlow;
varying float vFill;
varying float vState;
varying float vFade;

void main() {
  vec3 p = position;
  float top = step(-0.001, p.y);
  vec2 c = aCell.xy;
  float d = length(c);

  // Heartbeat: a ring leaves the centre every few seconds (uBeat is its radius).
  float ring = exp(-pow(d - uBeat, 2.0) * 0.9);

  // Event ripples (finished jobs, taps).
  float rip = 0.0;
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (age > 0.0 && age < 2.4) {
      float dd = length(c - r.xy);
      rip += exp(-pow(dd - age * 5.0, 2.0) * 1.3) * (1.0 - age / 2.4) * r.w;
    }
  }

  float breathe = sin(uTime * 1.1 + aCell.z * 6.2831) * 0.04;
  vec2 b = c - uBee;
  float sensed = exp(-dot(b, b) * 0.7);
  float hover = step(2.5, aState) * step(aState, 3.5);
  float lift = ring * 0.2 + rip * 0.45 + breathe + aFill * 0.1 + sensed * 0.12 + hover * 0.18;

  p.y = p.y * 0.7 + top * lift;
  vLocal = position.xz;
  vTop = step(0.5, normal.y);
  vY = position.y;
  vGlow = ring * 0.75 + rip;
  vFill = aFill;
  vState = aState;
  vFade = 1.0 - smoothstep(${FADE[0].toFixed(2)}, ${FADE[1].toFixed(2)}, d);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x + c.x, p.y, p.z + c.y, 1.0);
}
`;

/**
 * Line-drawn comb in the brand palette: shell-dark prisms with hairline bone
 * rims. Honey rims flash as the heartbeat and ripples pass, queued cells blink
 * like a cursor, and work fills a cell with honey from its centre outward.
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
varying vec2 vLocal;
varying float vTop;
varying float vY;
varying float vGlow;
varying float vFill;
varying float vState;
varying float vFade;

const vec3 BONE = vec3(0.929, 0.918, 0.890);
const vec3 HONEY = vec3(0.961, 0.725, 0.259);
const vec3 SHELL = vec3(0.071, 0.071, 0.067);
const vec3 INK = vec3(0.039, 0.039, 0.035);

void main() {
  vec3 col;
  if (vTop > 0.5) {
    vec2 q = abs(vLocal);
    float inr = ${(R * 0.94 * 0.8660254).toFixed(4)};
    float hd = max(q.x, q.x * 0.5 + q.y * 0.8660254);
    float edge = inr - hd;
    float aa = fwidth(edge) * 1.5;
    float rim = 1.0 - smoothstep(0.0, aa + 0.035, edge);
    float halo = 1.0 - smoothstep(0.0, 0.28, edge);

    float queued = step(0.5, vState) * step(vState, 1.5);
    float working = step(1.5, vState) * step(vState, 2.5);
    float hover = step(2.5, vState);
    float blink = step(0.5, fract(uTime * 1.6));

    col = SHELL;
    // Honey fills from the centre out; a filled cell keeps a faint glaze.
    float filled = step(hd, inr * vFill * 0.92);
    col = mix(col, HONEY * (0.34 + 0.2 * halo), filled * 0.85);
    col += BONE * rim * (0.09 + hover * 0.3);
    col += HONEY * rim * (vGlow * 0.9 + queued * blink * 0.85 + working * 0.9);
    col += HONEY * halo * (vGlow * 0.12 + working * 0.08);
  } else {
    // Walls: near-black, a touch of honey when a pulse runs through.
    float depth = clamp(-vY, 0.0, 1.0);
    col = mix(SHELL * 0.85, INK, depth) + HONEY * vGlow * 0.06 * (1.0 - depth);
  }
  gl_FragColor = vec4(col, vFade);
}
`;

export function createCombMaterial() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uBeat: { value: -10 },
      uBee: { value: new Vector2() },
      uRipples: { value: Array.from({ length: RIPPLES }, () => new Vector4(0, 0, -100, 0)) },
    },
  });
}

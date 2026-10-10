import {
  AdditiveBlending,
  DoubleSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  InstancedBufferAttribute,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import type { CombCell } from "./layout";

const rgb = (r: number, g: number, b: number) => new Vector3(r / 255, g / 255, b / 255);

// filler, shipped, building, planned, later.
const TOP = [rgb(58, 57, 53), rgb(201, 143, 46), rgb(245, 185, 66), rgb(84, 81, 74), rgb(66, 64, 59)];
const SIDE = [rgb(36, 35, 33), rgb(122, 84, 26), rgb(168, 116, 32), rgb(50, 48, 44), rgb(42, 41, 38)];
const INNER = [rgb(0, 0, 0), rgb(232, 178, 86), rgb(255, 214, 128), rgb(30, 29, 27), rgb(28, 27, 25)];

/** Rim radius, bevel inset and bevel drop of the prism (world units). */
const R = 0.9;
const INSET = 0.8;
const BEVEL = 0.07;

/**
 * A bevelled hex prism, pointy-top on XZ: flat top, a chamfer ring, walls.
 * Non-indexed with per-face normals for crisp facets. `position.y` is 0 at the
 * floor and 1 at the top; `aBevel` = 1 marks rim vertices that sit BEVEL below
 * the top, so the chamfer keeps its size whatever the cell's height.
 */
function prism() {
  const pos: number[] = [];
  const nrm: number[] = [];
  const bev: number[] = [];
  const corner = (r: number, k: number) => {
    const a = Math.PI / 2 + (k * Math.PI) / 3;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  };
  const tri = (vs: [number, number, number, number][], n: [number, number, number]) => {
    for (const [x, y, z, b] of vs) {
      pos.push(x, y, z);
      nrm.push(...n);
      bev.push(b);
    }
  };
  for (let k = 0; k < 6; k++) {
    const [ax, az] = corner(INSET, k);
    const [bx, bz] = corner(INSET, k + 1);
    const [cx, cz] = corner(R, k);
    const [dx, dz] = corner(R, k + 1);
    // Top.
    tri(
      [
        [0, 1, 0, 0],
        [bx, 1, bz, 0],
        [ax, 1, az, 0],
      ],
      [0, 1, 0],
    );
    // Chamfer: outward-and-up normal.
    const mx = (cx + dx) / 2;
    const mz = (cz + dz) / 2;
    const ml = Math.hypot(mx, mz);
    const slope = BEVEL / (R - INSET);
    const nl = Math.hypot(1, slope);
    const cn: [number, number, number] = [((mx / ml) * slope) / nl, 1 / nl, ((mz / ml) * slope) / nl];
    tri(
      [
        [ax, 1, az, 0],
        [bx, 1, bz, 0],
        [dx, 1, dz, 1],
      ],
      cn,
    );
    tri(
      [
        [ax, 1, az, 0],
        [dx, 1, dz, 1],
        [cx, 1, cz, 1],
      ],
      cn,
    );
    // Wall.
    const wn: [number, number, number] = [mx / ml, 0, mz / ml];
    tri(
      [
        [cx, 1, cz, 1],
        [dx, 1, dz, 1],
        [dx, 0, dz, 0],
      ],
      wn,
    );
    tri(
      [
        [cx, 1, cz, 1],
        [dx, 0, dz, 0],
        [cx, 0, cz, 0],
      ],
      wn,
    );
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nrm), 3));
  g.setAttribute("aBevel", new BufferAttribute(new Float32Array(bev), 1));
  return g;
}

export function createCombGeometry(cells: CombCell[]) {
  const g = prism();
  const n = cells.length;
  const cell = new Float32Array(n * 4);
  const shape = new Float32Array(n * 3);
  cells.forEach((c, i) => {
    cell.set([c.x, c.z, c.d, c.seed], i * 4);
    shape.set([c.h, c.kind, c.e], i * 3);
  });
  g.setAttribute("aCell", new InstancedBufferAttribute(cell, 4));
  g.setAttribute("aShape", new InstancedBufferAttribute(shape, 3));
  g.setAttribute("aLift", new InstancedBufferAttribute(new Float32Array(n), 1));
  return g;
}

/** Shared lighting: a warm key light, a cool fill, and a spotlight pool aimed straight down. */
const lighting = /* glsl */ `
uniform vec3 uSpot;
uniform float uSpotPower;

const vec3 KEY = vec3(-0.505, 0.781, 0.367);   // normalised (-0.55, 0.85, 0.4)

// Spotlight from uSpot pointing down: returns (pool, direction to light).
float spotPool(vec3 p, out vec3 L) {
  vec3 d = uSpot - p;
  float dist = length(d);
  L = d / dist;
  float cone = smoothstep(0.78, 0.97, L.y);
  return cone * uSpotPower / (1.0 + 0.012 * dist * dist);
}
`;

const vertexShader = /* glsl */ `
attribute vec4 aCell;    // x, z, distance, seed
attribute vec3 aShape;   // height, kind, edge (0 centre → 1 field edge)
attribute float aLift;
attribute float aBevel;

uniform float uTime;
uniform float uBuild;
uniform float uMotion;
uniform vec2 uPointer;
uniform float uPointerOn;

varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLocal;
varying float vTop;
varying float vY;
varying float vKind;
varying float vFade;

mat3 tilt(float ax, float az) {
  float cx = cos(ax), sx = sin(ax), cz = cos(az), sz = sin(az);
  return mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0) * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
}

void main() {
  float d = aCell.z;
  float seed = aCell.w;
  float kind = aShape.y;
  float filler = 1.0 - step(0.5, kind);
  float current = step(1.5, kind) * step(kind, 2.5);

  // Built from the centre outward.
  float rise = clamp(uBuild * 1.8 - d * 0.06, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - rise, 3.0);

  // The cursor presses a soft dent into the comb; tiles near it tip away.
  vec2 away = aCell.xy - uPointer;
  float pr = length(away);
  float near = uPointerOn * exp(-pr * pr * 0.16);
  vec2 dir = away / max(pr, 0.001);

  float h = aShape.x * e + aLift - near * 0.16 * filler;
  h += uMotion * (filler * sin(uTime * 0.9 + seed + d * 0.5) * 0.035 + current * sin(uTime * 1.6) * 0.05);
  h = max(0.05, h);

  vec3 p = position;
  p.y = p.y * h - aBevel * min(${BEVEL.toFixed(3)}, h * 0.5);

  // Wobble: every tile rocks a touch on its base.
  float wob = uMotion * (0.02 + near * 0.05);
  float ax = sin(uTime * 0.7 + seed * 3.1) * wob + near * dir.y * 0.07;
  float az = cos(uTime * 0.6 + seed * 2.3) * wob - near * dir.x * 0.07;
  mat3 T = tilt(ax, az);
  p = T * p;
  p *= step(0.001, rise);

  vec3 world = vec3(p.x + aCell.x, p.y, p.z + aCell.y);
  vWorld = world;
  vNormal = T * normal;
  vLocal = position.xz;
  vTop = step(0.99, normal.y);
  vY = position.y;
  vKind = kind;
  vFade = filler > 0.5 ? 1.0 - smoothstep(0.5, 1.0, aShape.z) : 1.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const fragmentShader = /* glsl */ `
${lighting}
uniform vec3 uTop[5];
uniform vec3 uSide[5];
uniform vec3 uInner[5];
uniform float uTime;
uniform float uFlash;
uniform float uMotion;
uniform vec3 uFog;
uniform float uPixelSize;

varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLocal;
varying float vTop;
varying float vY;
varying float vKind;
varying float vFade;

const vec3 HONEY = vec3(0.961, 0.725, 0.259);

// Small ordered-dither cells add a quiet pixel-art grain to the polished light.
float bayer4(vec2 p) {
  vec2 c = mod(floor(p), 4.0);
  float low = mod(2.0 * mod(c.x, 2.0) + 3.0 * mod(c.y, 2.0), 4.0);
  float high = mod(2.0 * floor(c.x * 0.5) + 3.0 * floor(c.y * 0.5), 4.0);
  return (low * 4.0 + high + 0.5) / 16.0;
}

void main() {
  int k = int(vKind + 0.5);
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  bool honey = k == 1 || k == 2;

  vec3 base;
  float gloss = 0.18;
  float glow = 0.0;
  if (vTop > 0.5) {
    vec2 q = abs(vLocal);
    float hd = max(q.x, q.x * 0.5 + q.y * 0.8660254);   // pointy-top hex distance (flat sides face ±x)
    base = uTop[k];
    if (k > 0) {
      float cap = 1.0 - smoothstep(0.5, 0.53, hd);
      vec3 inner = uInner[k];
      if (k == 1) inner *= 0.9 + 0.16 * (1.0 - hd / 0.52);                 // wax cap, domed
      if (k == 2) inner *= 0.9 + uMotion * 0.1 * sin(uTime * 2.2) + uFlash * 0.25;
      if (k >= 3) inner *= 0.75 + 0.25 * smoothstep(0.0, 0.5, hd);         // empty cell: a hollow
      base = mix(base, inner, cap);
      base *= 1.0 - 0.18 * smoothstep(0.42, 0.52, hd) * (1.0 - smoothstep(0.52, 0.56, hd));   // cap seam
      gloss = honey ? 0.55 : 0.22;
      glow = k == 2 ? (0.32 + uMotion * 0.12 * sin(uTime * 1.6) + uFlash * 0.4) * cap : k == 1 ? 0.06 * cap : 0.0;
    }
  } else if (N.y > 0.1) {
    base = mix(uTop[k], uSide[k], 0.35) * 1.12;   // chamfer catches the light
    gloss = honey ? 0.6 : 0.35;
  } else {
    base = uSide[k];
    base *= mix(0.5, 1.0, smoothstep(0.0, 0.85, vY));   // contact shadow at the floor
  }

  vec3 Ls;
  float pool = spotPool(vWorld, Ls);
  float key = max(dot(N, KEY), 0.0);
  float fill = max(dot(N, normalize(vec3(0.6, 0.4, -0.5))), 0.0);
  float spot = max(dot(N, Ls), 0.0) * pool;

  vec3 col = base * (0.24 + 0.52 * key + 0.1 * fill) + base * vec3(1.0, 0.86, 0.62) * spot * 1.4;
  vec3 H = normalize(Ls + V);
  vec3 Hk = normalize(KEY + V);
  float spec = pow(max(dot(N, H), 0.0), 60.0) * pool * 2.2 + pow(max(dot(N, Hk), 0.0), 40.0) * 0.35;
  float threshold = bayer4(floor(gl_FragCoord.xy / max(uPixelSize, 1.0)));
  float pixelSpec = floor(spec * 12.0 + threshold) / 12.0;
  spec = mix(spec, pixelSpec, 0.28);
  col += mix(vec3(1.0, 0.94, 0.84), HONEY, honey ? 0.5 : 0.0) * spec * gloss;
  col += HONEY * glow;
  // Honey reads warm and a little translucent at grazing angles.
  if (honey) col += uSide[k] * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.35;

  // Quantize only the lighting, not the silhouette or honeycomb geometry. The
  // shader stays in the existing instanced draw call, with no extra render pass.
  vec3 pixelTone = floor(col * 32.0 + threshold) / 32.0;
  col = mix(col, pixelTone, 0.2);
  col = mix(uFog, col, 0.35 + 0.65 * vFade);
  gl_FragColor = vec4(col, vFade);
}
`;

export function createCombMaterial() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: DoubleSide,
    uniforms: {
      uTop: { value: TOP },
      uSide: { value: SIDE },
      uInner: { value: INNER },
      uTime: { value: 0 },
      uBuild: { value: 0 },
      uFlash: { value: 0 },
      uMotion: { value: 1 },
      uPointer: { value: new Vector2(999, 999) },
      uPointerOn: { value: 0 },
      uSpot: { value: new Vector3(0, 8, 0) },
      uSpotPower: { value: 1 },
      uFog: { value: rgb(21, 21, 20) },
      uPixelSize: { value: 3 },
    },
  });
}

/** Floor: the spotlight's pool on the ground and a honey glow under the cell being built. */
export function createFloorMaterial(comb: ShaderMaterial) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSpot: comb.uniforms.uSpot,
      uSpotPower: comb.uniforms.uSpotPower,
      uCur: { value: new Vector2() },
      uFlash: comb.uniforms.uFlash,
      uTime: comb.uniforms.uTime,
      uMotion: comb.uniforms.uMotion,
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${lighting}
      uniform vec2 uCur;
      uniform float uFlash;
      uniform float uTime;
      uniform float uMotion;
      varying vec3 vWorld;
      void main() {
        vec3 L;
        float pool = spotPool(vWorld, L);
        float c = length(vWorld.xz - uCur);
        float glow = exp(-c * c * 0.18) * (0.28 + 0.06 * uMotion * sin(uTime * 1.6) + uFlash * 0.25);
        vec3 col = mix(vec3(1.0, 0.86, 0.62), vec3(0.961, 0.725, 0.259), glow / max(glow + pool * 0.2, 1e-3));
        gl_FragColor = vec4(col, pool * 0.16 + glow * 0.55);
      }`,
  });
}

/** Pollen: a few warm motes drifting up through the light. */
export function createMotes(count: number, rx: number, rz: number) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() * 2 - 1) * rx * 0.8, Math.random() * 5, (Math.random() * 2 - 1) * rz * 0.8], i * 3);
    seed[i] = Math.random();
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new BufferAttribute(seed, 1));
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uScale;
      varying float vA;
      void main() {
        vec3 p = position;
        float t = uTime * (0.08 + aSeed * 0.08) + aSeed * 10.0;
        p.y = mod(p.y + t, 5.0) + 0.4;
        p.x += sin(t * 2.3 + aSeed * 6.0) * 0.4;
        p.z += cos(t * 1.9 + aSeed * 4.0) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.4, 1.2, p.y) * (1.0 - smoothstep(3.8, 5.4, p.y)) * (0.35 + 0.65 * aSeed);
        gl_PointSize = max(1.0, (0.05 + aSeed * 0.05) * uScale / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * vA * (1.0 - smoothstep(0.2, 0.5, d)), 1.0);
      }`,
  });
  return { geometry: g, material: m };
}

/** A soft round shadow for the bees. */
export function createShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(0,0,0,.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

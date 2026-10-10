import type { Milestone, Status } from "@/lib/roadmap/parse";

/** Build-up radius in world units (cell circumradius = 1): cells rise from the centre outward. */
export const RAD = 9.5;

/** Shader kinds: index into the palette uniforms. */
export const KIND = { filler: 0, done: 1, current: 2, planned: 3, later: 4 } as const;
const KIND_OF: Record<Status, number> = { done: KIND.done, current: KIND.current, planned: KIND.planned, later: KIND.later };
const HEIGHT = [0, 1.05, 1.5, 0.62, 0.38];

export interface CombCell {
  x: number;
  z: number;
  /** Distance from the milestone path's centre (drives the build-up order). */
  d: number;
  /** Elliptical distance to the field's edge, 0 (centre) → 1 (edge): drives the fade. */
  e: number;
  kind: number;
  h: number;
  seed: number;
  /** Milestone index, for milestone cells. */
  mi?: number;
  id?: string;
  /** Selection lift (milestone cells), tweened by the scene. */
  lift?: number;
}

/** The filler field: an oval wide enough to run the full width of the hero. */
export interface Field {
  rx: number;
  rz: number;
}

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth value noise for gently rolling filler heights. */
const noise = (x: number, z: number) => {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

/**
 * Milestones walk a gentle zig-zag through the comb (right, up-right, right,
 * down…); filler cells fill an oval around them, rolling a little in height
 * and staying low near the path so the milestones read. Pointy-top axial hex
 * coordinates on the XZ plane.
 */
export function buildComb(milestones: Milestone[], field: Field) {
  const S3 = Math.sqrt(3);
  const ax = (q: number, r: number) => ({ x: S3 * (q + r / 2), z: 1.5 * r });
  const STEPS = [
    [1, 0],
    [1, -1],
    [1, 0],
    [0, 1],
  ];
  const path: [number, number][] = [];
  let q = 0;
  let r = 0;
  for (let i = 0; i < milestones.length; i++) {
    path.push([q, r]);
    const [dq, dr] = STEPS[i % 4];
    q += dq;
    r += dr;
  }
  const world = path.map(([pq, pr]) => ax(pq, pr));
  const cx = world.reduce((a, b) => a + b.x, 0) / Math.max(1, world.length);
  const cz = world.reduce((a, b) => a + b.z, 0) / Math.max(1, world.length);
  const taken = new Set(path.map((p) => p.join(",")));
  const pathPts = world.map((p) => ({ x: p.x - cx, z: p.z - cz }));
  const ell = (x: number, z: number) => Math.hypot(x / field.rx, z / field.rz);

  const cells: CombCell[] = [];
  const span = Math.ceil(Math.max(field.rx, field.rz) / 1.2) + 4;
  for (let qq = -span; qq <= span; qq++)
    for (let rr = -span; rr <= span; rr++) {
      if (taken.has(`${qq},${rr}`)) continue;
      const p = ax(qq, rr);
      const x = p.x - cx;
      const z = p.z - cz;
      const e = ell(x, z);
      if (e > 1) continue;
      const nearPath = Math.min(...pathPts.map((pp) => Math.hypot(pp.x - x, pp.z - z)));
      const roll = noise(x * 0.18 + 3.1, z * 0.18 - 1.7);
      const h = (0.08 + roll * 0.42 + hash(qq, rr) * 0.12) * (0.45 + 0.55 * Math.min(1, nearPath / 3.2));
      cells.push({ x, z, d: Math.hypot(x, z), e, kind: KIND.filler, h, seed: hash(rr, qq) * 6.28 });
    }

  const ms: CombCell[] = milestones.map((m, i) => {
    const x = pathPts[i].x;
    const z = pathPts[i].z;
    const kind = KIND_OF[m.status];
    return { x, z, d: Math.hypot(x, z), e: ell(x, z), kind, h: HEIGHT[kind], seed: i, mi: i, id: m.id, lift: 0 };
  });

  // Far rows first: the faded edge never covers the live cells in front of it.
  cells.sort((a, b) => a.z - b.z);
  return { cells: [...cells, ...ms], ms };
}

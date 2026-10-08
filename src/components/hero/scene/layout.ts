const DEG = Math.PI / 180;

export const FOV = 30;

export interface FloorLayout {
  /** Camera distance; the z=0 plane then maps 1 world unit → 1 CSS px. */
  zc: number;
  /** Terminal size in CSS px (= world units at its near edge). */
  wt: number;
  ht: number;
  /** World Y of the terminal's near edge (the ground pivot). */
  yn: number;
  /** Ground tilt away from the camera, radians. */
  theta: number;
  /** View-depth range over which the floor blurs, fades and dissolves into haze. */
  fogNear: number;
  fogFar: number;
  /** Too little room (short screens): floor only, no terminal. */
  visible: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Lay the runtime terminal flat on the hive floor so that its near edge
 * sits just above the bottom of the viewport at full size, and its far edge
 * recedes to just under the hero copy (`ceil`, px from the top).
 *
 * Camera at (0,0,zc) looking down -Z with zc chosen so z=0 is 1:1 with CSS
 * px. The ground pivots about the near edge by `theta`; a point `v` up the
 * terminal lands at world (y = yn + v·cosθ, z = −v·sinθ). Solving its
 * projection for the far-edge target gives the terminal height in closed form.
 */
export function computeFloorLayout(w: number, h: number, ceil: number): FloorLayout {
  const mobile = w < 640;
  const zc = h / 2 / Math.tan((FOV / 2) * DEG);
  const theta = (mobile ? 30 : 50) * DEG;
  const c = Math.cos(theta);
  const s = Math.sin(theta);

  const gutter = mobile ? 12 : clamp(w * 0.04, 16, 64);
  const wt = Math.min(1160, w - gutter * 2);
  const yNear = h - (mobile ? 14 : 32);
  const yFar = ceil + (mobile ? 12 : 4); // tuck just under the copy — the haze hides the seam

  const yn = h / 2 - yNear;
  const a = h / 2 - yFar;
  const denom = c * zc - a * s;
  const raw = denom > 0 ? (zc * (a - yn)) / denom : 0;
  const ht = clamp(raw, 0, 1100);

  const depth = ht * s;
  return {
    zc,
    wt,
    ht,
    yn,
    theta,
    // Sharp across the near half, softening and fading well past the far edge.
    fogNear: zc + depth * 0.35,
    fogFar: zc + depth * 2.6,
    visible: ht >= (mobile ? 200 : 240),
  };
}

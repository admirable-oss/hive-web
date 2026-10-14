/** Hex spacing for pointy-top cells with circumradius 1. */
const SQ3 = Math.sqrt(3);

export interface HexCell {
  x: number;
  z: number;
  /** 0 centre, 1 first ring, 2 second ring. */
  ring: number;
  seed: number;
}

/** Axial hex rings around the origin, out to `rings`, pointy-top on XZ. */
export function hexCluster(rings: number, spacing = 1): HexCell[] {
  const cells: HexCell[] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      const x = SQ3 * (q + r / 2) * spacing;
      const z = 1.5 * r * spacing;
      const s = Math.sin(q * 127.1 + r * 311.7) * 43758.5453;
      cells.push({ x, z, ring, seed: s - Math.floor(s) });
    }
  }
  return cells;
}

/** World anchors of the two combs: the grounded one you run, the one that floats (later). */
export const SELF = { x: -5, y: 0, z: 0 } as const;
export const CLOUD = { x: 5, y: 2.4, z: -0.4 } as const;

/** A 9×9 pixel padlock, top row first: `#` body, `o` shackle, `k` keyhole. */
export const PADLOCK = [
  "  ooooo  ",
  " oo   oo ",
  " o     o ",
  " o     o ",
  "#########",
  "###kkk###",
  "####k####",
  "####k####",
  "#########",
];

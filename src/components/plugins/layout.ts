const SQ3 = Math.sqrt(3);

export interface PluginCell {
  x: number;
  y: number;
  ring: number;
  seed: number;
}

/** Hex cells for the plugin hive, kept in a small layout module like the other scenes. */
export function pluginCells(rings = 3): PluginCell[] {
  const cells: PluginCell[] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      const raw = Math.sin(q * 127.1 + r * 311.7) * 43758.5453;
      cells.push({ x: SQ3 * (q + r / 2), y: 1.5 * r, ring, seed: raw - Math.floor(raw) });
    }
  }
  return cells;
}

export const PLUGIN_HUD = [
  "hive plugin install <plugin-id>",
  "registry  published release metadata",
  "source    immutable commit + checksum",
  "review    inspect trust before install",
] as const;

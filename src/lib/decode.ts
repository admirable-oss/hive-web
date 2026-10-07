import { hash } from "./math";

const GLYPHS = "▖▗▘▝▚▞▙▛▜▟░▒▓<>/\\#$%*+=?";
const NBSP = " ";

/**
 * Terminal-style "decode" of `text` at progress `p` (0..1).
 * `instant` scrambles every glyph at once (hover re-scramble) instead of
 * revealing left-to-right (intro).
 */
export function decode(text: string, p: number, seed: number, frame: number, instant = false) {
  if (p >= 1) return text;
  let out = "";
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const ch = text[i];
    if (ch === " ") {
      out += " ";
      continue;
    }
    const appear = instant ? 0 : (i / n) * 0.45;
    const resolve = instant ? 0.15 + hash(i + seed) * 0.85 : 0.4 + (i / n) * 0.4 + hash(i + seed) * 0.2;
    if (p < appear) out += NBSP;
    else if (p < resolve) out += GLYPHS[Math.floor(hash(i * 13 + seed + frame) * GLYPHS.length)];
    else out += ch;
  }
  return out;
}

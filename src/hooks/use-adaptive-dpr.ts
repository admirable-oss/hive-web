import { useRef } from "react";

const SAMPLE_MS = 1500;
const MIN_FPS = 45;

const maxDprFor = () => {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return Math.min(coarse ? 1.5 : 1.75, window.devicePixelRatio || 1);
};

/**
 * Frame-time monitor that steps the render resolution down (max → 1.25 → 1)
 * when the page can't hold ~45fps. One-way, so it never flip-flops.
 * Call `sample(now)` every frame; read `dpr()` when sizing.
 */
export function useAdaptiveDpr() {
  const state = useRef<{ dpr: number; frames: number; since: number } | null>(null);

  const ensure = () => (state.current ??= { dpr: maxDprFor(), frames: 0, since: performance.now() });

  return {
    dpr: () => ensure().dpr,
    /** Returns true when the dpr changed (caller should resize). */
    sample(now: number) {
      const s = ensure();
      s.frames++;
      const elapsed = now - s.since;
      if (elapsed < SAMPLE_MS) return false;
      const fps = (s.frames * 1000) / elapsed;
      s.frames = 0;
      s.since = now;
      if (fps >= MIN_FPS || s.dpr <= 1) return false;
      s.dpr = s.dpr > 1.25 ? 1.25 : 1;
      return true;
    },
  };
}

import { useCallback, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const DURATION = 300;
const COLORS = { base: "#0F0F0E", dark: "#1C1C1A", honey: "#F5B942" };

interface Block {
  x: number;
  y: number;
  k: number;
  color: string;
}

/**
 * Full-screen pixel-block wipe: blocks fill in from the top-right, `mid()`
 * runs while the screen is covered, then the blocks clear in the same order.
 */
export function usePixelSwap(disabled = false) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  const swap = useCallback(
    (mid: () => void) => {
      if (stop.current) return; // a wipe is already running
      const cv = canvasRef.current;
      const ctx = cv?.getContext("2d");
      if (!cv || !ctx || disabled) {
        mid();
        return;
      }

      const w = window.innerWidth;
      const h = window.innerHeight;
      cv.width = w;
      cv.height = h;
      cv.style.display = "block";

      const s = Math.max(18, Math.round(w / 70));
      const cols = Math.ceil(w / s);
      const rows = Math.ceil(h / s);
      const blocks: Block[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dx = (cols - c) / cols;
          const dy = r / rows;
          const roll = Math.random();
          blocks.push({
            x: c * s,
            y: r * s,
            k: Math.hypot(dx, dy * 0.8) + Math.random() * 0.45,
            color: roll < 0.03 ? COLORS.honey : roll < 0.13 ? COLORS.dark : COLORS.base,
          });
        }
      }
      blocks.sort((a, b) => a.k - b.k);

      const n = blocks.length;
      let t0 = performance.now();
      let drawn = 0;
      let phase: "cover" | "reveal" = "cover";

      const tick = () => {
        const now = performance.now();
        const p = Math.min(1, (now - t0) / DURATION);
        const upto = Math.floor(p * n);
        if (phase === "cover") {
          for (; drawn < upto; drawn++) {
            const b = blocks[drawn];
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, s, s);
          }
          if (p >= 1) {
            // Douse most amber sparks before revealing.
            ctx.fillStyle = COLORS.base;
            for (const b of blocks) if (b.color === COLORS.honey && Math.random() < 0.7) ctx.fillRect(b.x, b.y, s, s);
            mid();
            phase = "reveal";
            drawn = 0;
            t0 = now + 60;
          }
        } else if (now >= t0) {
          for (; drawn < upto; drawn++) ctx.clearRect(blocks[drawn].x, blocks[drawn].y, s, s);
          if (p >= 1) finish();
        }
      };

      const finish = () => {
        gsap.ticker.remove(tick);
        cv.style.display = "none";
        stop.current = null;
      };

      stop.current = finish;
      gsap.ticker.add(tick);
    },
    [disabled],
  );

  return { canvasRef, swap };
}

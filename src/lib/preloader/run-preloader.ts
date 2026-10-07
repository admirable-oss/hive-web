import { gsap } from "../gsap";
import { drawBee } from "../sprite/bee";
import { easeInOutCubic, easeInOutQuad, hash, lerp } from "../math";

const PANEL = "#0F0F0E";

export interface PreloaderCallbacks {
  /** Load progress 0..1 (throttled to ~20 Hz). */
  onProgress: (p: number) => void;
  /** Hold finished — hide the label/progress UI. */
  onHideText: () => void;
  /** Bee reached the floor — the curtain itself now carries the background. */
  onClearBackground: () => void;
  /** Curtain started lifting — kick off the page intro underneath. */
  onIntro: () => void;
  onDone: () => void;
}

/**
 * Canvas preloader: the bee hovers while fonts load, drops to the floor, then
 * rockets upward dragging a jagged pixel curtain off the page.
 * Phases: load → hold (0.24s) → drop (0.46s) → lift (1.1s) → done.
 */
export function runPreloader(cv: HTMLCanvasElement, cb: PreloaderCallbacks) {
  const ctx = cv.getContext("2d");
  if (!ctx) {
    cb.onIntro();
    cb.onDone();
    return () => {};
  }

  const t0 = performance.now();
  let fontsOk = false;
  let p = 0;
  let phase: "load" | "hold" | "drop" | "lift" | "done" = "load";
  let pt = 0;
  let lastEmit = 0;
  let fired = false;
  let last = t0;

  void (document.fonts?.ready ?? Promise.resolve()).then(() => (fontsOk = true));
  const fontTimeout = setTimeout(() => (fontsOk = true), 2600);

  const tick = () => {
    const now = performance.now();
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (cv.width !== window.innerWidth || cv.height !== window.innerHeight) {
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    }
    const w = cv.width;
    const h = cv.height;
    const mobile = w < 640;
    const S = mobile ? 9 : 10;
    const hh = 6.5 * S;
    const cx = w / 2;
    const cy = h / 2 - 30;

    let by = cy + Math.round(Math.sin(t * 3.2) * 4);
    let edge = h;
    let wingDown = Math.floor(t * 12) % 2 === 1;
    let ex = [0, -1, 0, 1][Math.floor(t / 0.7) % 4];
    let ey = 0;
    let arm = Math.floor(t * 6) % 2 ? -1 : 0;
    let leg = 0;
    let lag = 0;

    if (phase === "load") {
      const target = fontsOk && t > 1.15 ? 1 : Math.min(0.9, t / 1.3);
      p += (target - p) * Math.min(1, dt * 7);
      if (target === 1 && p > 0.992) {
        p = 1;
        phase = "hold";
        pt = t;
        cb.onProgress(1);
      } else if (now - lastEmit > 50) {
        lastEmit = now;
        cb.onProgress(p);
      }
    } else if (phase === "hold" && t - pt > 0.24) {
      phase = "drop";
      pt = t;
      cb.onHideText();
    }

    if (phase === "drop") {
      const f = Math.min(1, (t - pt) / 0.46);
      by = lerp(cy, h - hh - 14, easeInOutQuad(f));
      ex = ey = 0;
      arm = leg = 1;
      wingDown = Math.floor(t * 8) % 2 === 1;
      if (f >= 1) {
        phase = "lift";
        pt = t;
        cb.onClearBackground();
      }
    }

    if (phase === "lift") {
      const f = Math.min(1, (t - pt) / 1.1);
      by = lerp(h - hh - 14, -hh * 2 - 80, easeInOutCubic(f));
      edge = by + hh + 4;
      arm = 1;
      ey = -1;
      ex = 0;
      wingDown = Math.floor(t * 26) % 2 === 1;
      lag = 1 - f;
      if (!fired && f > 0.1) {
        fired = true;
        cb.onIntro();
      }
      if (f >= 1) phase = "done";
    }

    ctx.clearRect(0, 0, w, h);
    if (phase === "done") {
      stop();
      cb.onDone();
      return;
    }

    if (edge >= h) {
      ctx.fillStyle = PANEL;
      ctx.fillRect(0, 0, w, h);
    } else {
      // Jagged curtain: each column trails behind the bee by its distance.
      const blk = mobile ? 12 : 16;
      for (let x = 0; x < w; x += blk) {
        const dx = Math.abs(x + blk / 2 - cx) / w;
        const off = Math.round((hash(x / blk) * 8 + Math.pow(dx, 1.15) * 260 * lag + Math.pow(dx, 2) * 40) / 4) * 4;
        const y2 = Math.max(0, Math.round(edge + off));
        ctx.fillStyle = PANEL;
        ctx.fillRect(x, 0, blk, y2);
        ctx.fillStyle = "rgba(245,185,66,.5)";
        ctx.fillRect(x, y2 - 2, blk, 2);
        if (hash(x * 1.7 + Math.floor(t * 12)) > 0.82) {
          ctx.fillStyle = "rgba(15,15,14,.85)";
          ctx.fillRect(x + Math.floor(hash(x) * (blk - 4)), y2, 4, 4);
        }
      }
    }

    const blink = phase === "load" && t % 2.8 < 0.1;
    drawBee(ctx, cx, by, S, { wingDown, ex, ey, arm, leg, eyes: blink ? "shut" : "open" });
  };

  const stop = () => {
    gsap.ticker.remove(tick);
    clearTimeout(fontTimeout);
  };

  gsap.ticker.add(tick);
  return stop;
}

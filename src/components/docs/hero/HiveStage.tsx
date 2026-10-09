import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { WebGLBoundary } from "@/components/shared/WebGLBoundary";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { BeeStatus } from "./brain";

// three.js + R3F load in their own chunk, after the hero copy has painted.
const HiveStageScene = lazy(() => import("./HiveStageScene"));

const BAR = 10;
const pad = (n: number) => String(n).padStart(2, "0");

/** No WebGL: the bee at work over the still comb the frame already draws. */
function StillBee() {
  return (
    <img
      src="/brand/mascot/hive-agent-working.svg"
      alt=""
      className="pixelated absolute top-1/2 left-1/2 w-[22%] -translate-x-1/2 -translate-y-1/2"
    />
  );
}

/**
 * Docs-home hero stage: the living comb (HiveStageScene) plus a mono HUD that
 * reads out what the bee's brain is doing. HUD text is written straight to
 * the DOM from the scene's status callback, so the 3D loop never re-renders React.
 */
export function HiveStage() {
  const reducedMotion = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  const label = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);
  const stats = useRef<HTMLSpanElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const onStatus = useRef<((s: BeeStatus) => void) | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const start = performance.now();
    onStatus.current = (s) => {
      if (label.current) label.current.textContent = reducedMotion ? "idle" : s.label;
      const on = Math.round(s.progress * BAR);
      if (bar.current) bar.current.textContent = "▮".repeat(on) + "▯".repeat(BAR - on);
      if (pct.current) pct.current.textContent = `${pad(Math.round(s.progress * 99))}%`;
      if (stats.current) stats.current.textContent = `queue ${s.queued} · built ${s.built}`;
      if (clock.current) {
        const sec = Math.floor((performance.now() - start) / 1000);
        clock.current.textContent = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`;
      }
    };
  }, [reducedMotion]);

  return (
    <div
      ref={root}
      className="absolute inset-0"
      data-stage-ready={ready ? "" : undefined}
      role="img"
      aria-label="Hive agent at work: a bee building honeycomb cells. Tap the comb to queue work."
    >
      <div className="absolute inset-[-8%] [mask-image:radial-gradient(closest-side,#000_62%,transparent)]">
        <WebGLBoundary fallback={<StillBee />}>
          <Suspense fallback={null}>
            <HiveStageScene
              active={visible && !reducedMotion}
              reducedMotion={reducedMotion}
              onReady={() => setReady(true)}
              onStatus={onStatus}
            />
          </Suspense>
        </WebGLBoundary>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col justify-between font-mono text-[11.5px] leading-none text-stone transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex items-center gap-2">
            <span className="size-1.5 bg-honey" />
            <span className="tracking-[.12em]">BEE-01</span>
            <span className="text-dim">·</span>
            <span ref={label} className="text-bone" />
          </span>
          <span className="flex gap-2 max-sm:hidden">
            <span className="text-ash">uptime</span>
            <span ref={clock} className="tabular-nums" />
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <span className="flex items-center gap-2">
            <span ref={bar} className="tracking-[-.08em] text-honey" />
            <span ref={pct} className="tabular-nums" />
          </span>
          <span ref={stats} className="tabular-nums" />
        </div>
      </div>
    </div>
  );
}

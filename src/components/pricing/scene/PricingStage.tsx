import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { WebGLBoundary } from "@/components/shared/WebGLBoundary";
import type { Plan } from "./PricingScene";

// three.js + R3F + drei load in their own chunk, off the critical path.
const PricingScene = lazy(() => import("./PricingScene"));

interface Props {
  focus: Plan | null;
  onFocus: (plan: Plan | null) => void;
  reducedMotion: boolean;
}

const anchor = "absolute top-0 left-0 flex items-center opacity-0 transition-opacity duration-500";
const tag = "flex items-center gap-2 border bg-[#1e1e1c]/90 px-2 py-1 font-mono text-[11px] whitespace-nowrap transition-colors";

/** The pricing hero's canvas plus the two tags that ride above each comb. */
export function PricingStage({ focus, onFocus, reducedMotion }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className="absolute inset-0">
      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }}>
        <WebGLBoundary
          fallback={
            <div className="absolute inset-0 grid grid-cols-2 place-items-center">
              <img src="/brand/mascot/hive-agent-working.svg" alt="" className="pixelated w-20" />
              <img src="/brand/mascot/hive-agent-idle.svg" alt="" className="pixelated w-20 opacity-40" />
            </div>
          }
        >
          <Suspense fallback={null}>
            <PricingScene
              focus={focus}
              onFocus={onFocus}
              active={visible}
              reducedMotion={reducedMotion}
              overlay={overlay}
              onReady={() => setReady(true)}
            />
          </Suspense>
        </WebGLBoundary>
      </div>

      <div ref={overlay} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden max-sm:hidden">
        <div data-anchor="self" className={`${anchor} flex-col`} style={{ transform: "translate(-9999px,0)" }}>
          <span className={tag} style={{ borderColor: focus === "self" ? "#F5B942" : "rgba(245,185,66,.5)", color: "#F5B942" }}>
            <span className="size-1.5 animate-blink bg-honey" />
            your machine · running
          </span>
          <span className="h-4 w-px bg-honey/50" />
        </div>
        {/* Hangs below the floating comb, so it never collides with the padlock. */}
        <div data-anchor="cloud" className={`${anchor} flex-col-reverse`} style={{ transform: "translate(-9999px,0)" }}>
          <span className={tag} style={{ borderColor: focus === "cloud" ? "rgba(237,234,227,.5)" : "rgba(237,234,227,.18)", color: "#A9A59B" }}>
            <span className="size-1.5 bg-[#5A5850]" />
            hive cloud · sealed
          </span>
          <span className="h-4 w-px bg-bone/20" />
        </div>
      </div>
    </div>
  );
}

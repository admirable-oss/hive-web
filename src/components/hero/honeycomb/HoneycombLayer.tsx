import { useEffect, useRef, useState, type Ref } from "react";
import { useAdaptiveDpr } from "@/hooks/use-adaptive-dpr";
import { useGsapTicker } from "@/hooks/use-gsap-ticker";
import type { HeroSignals } from "@/lib/hero-signals";
import { HoneycombRenderer } from "@/lib/webgl/honeycomb-renderer";

interface HoneycombLayerProps {
  signals: HeroSignals;
  /** Render every tick; when false a single frame is drawn (and redrawn on resize). */
  active: boolean;
  intensity?: number;
  ref?: Ref<HTMLDivElement>;
}

/**
 * WebGL honeycomb terrain behind the hero. Rides the shared GSAP ticker,
 * reads the mascot's signals (pointer parallax, crash ripples, hive pulse)
 * and degrades to nothing when WebGL is unavailable.
 */
export function HoneycombLayer({ signals, active, intensity = 1, ref }: HoneycombLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<HoneycombRenderer | null>(null);
  const adaptive = useAdaptiveDpr();
  const size = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = HoneycombRenderer.create(cv);
    if (!r) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      size.current = { w: width, h: height };
      r.resize(width, height, adaptive.dpr());
      r.render(signals, intensity); // avoid a blank frame after resize
    });
    ro.observe(cv);
    setRenderer(r);

    return () => {
      ro.disconnect();
      r.dispose();
      setRenderer(null);
    };
    // Mount-only: signals are a live mutable object and intensity is read per frame.
  }, []);

  useGsapTicker((now) => {
    if (!renderer) return;
    if (adaptive.sample(now)) renderer.resize(size.current.w, size.current.h, adaptive.dpr());
    renderer.render(signals, intensity);
  }, active && !!renderer);

  // Static mode (reduced motion / menu open): draw one frame. Deferred a
  // frame so the mascot engine (a parent effect) has seeded the signals.
  useEffect(() => {
    if (!renderer || active) return;
    const id = requestAnimationFrame(() => renderer.render(signals, intensity));
    return () => cancelAnimationFrame(id);
  }, [renderer, active, signals, intensity]);

  return (
    <div ref={ref} data-reveal="gl" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} aria-hidden className="block size-full" />
    </div>
  );
}

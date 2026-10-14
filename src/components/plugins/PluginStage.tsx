import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { WebGLBoundary } from "@/components/shared/WebGLBoundary";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const PluginScene = lazy(() => import("./PluginScene"));

export function PluginStage() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={root}
      className="absolute inset-[-6%] [mask-image:radial-gradient(ellipse_at_center,#000_52%,transparent_88%)]"
      role="img"
      aria-label="A glowing plugin hive with bees moving between published extensions."
    >
      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }}>
        <WebGLBoundary fallback={<div className="absolute right-[12%] top-[20%] size-72 rounded-full bg-honey/[.08] blur-3xl" />}>
          <Suspense fallback={null}>
            <PluginScene active={visible} reducedMotion={reducedMotion} onReady={() => setReady(true)} />
          </Suspense>
        </WebGLBoundary>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 font-mono text-[10px] tracking-[.1em] text-[#8E8A80]">
        <div className="absolute right-[6%] top-[14%] flex items-center gap-2 border border-bone/[.12] bg-[#10100f]/80 px-3 py-1.5 backdrop-blur-sm max-sm:hidden">
          <span className="size-1.5 bg-honey animate-pulse" />
          <span>PLUGIN HIVE · REGISTRY V1</span>
        </div>
        <div className="absolute bottom-[10%] left-[8%] flex items-center gap-2 text-[#726E64] max-sm:hidden">
          <span className="tracking-[-.08em] text-honey">▮▮▮▮▮▯▯</span>
          <span>release graph online</span>
        </div>
      </div>
    </div>
  );
}

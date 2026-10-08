import { useRef, type CSSProperties } from "react";
import { cn } from "cn";
import { useRuntimeDemo } from "@/hooks/use-runtime-demo";
import type { HeroSignals } from "@/lib/hero-signals";
import { AgentPane } from "./AgentPane";
import { RuntimeSidebar } from "./RuntimeSidebar";
import { RuntimeTopBar } from "./RuntimeTopBar";
import { TestPane } from "./TestPane";

interface RuntimeDemoProps {
  signals: HeroSignals;
  reducedMotion: boolean;
  introAt: number | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * The Hive runtime TUI: one status line, then cells · agent · watcher.
 * Columns collapse by the window's own width (container queries), because
 * in 3D its width isn't the viewport's. Illustrative only → aria-hidden.
 */
export function RuntimeDemo({ signals, reducedMotion, introAt, className, style }: RuntimeDemoProps) {
  const root = useRef<HTMLDivElement>(null);
  useRuntimeDemo(root, { signals, reducedMotion, introAt });

  return (
    <div
      ref={root}
      aria-hidden
      data-mascot-target="demo"
      style={style}
      className={cn(
        "@container flex flex-col overflow-hidden rounded-[4px] border border-bone/12 bg-[#0B0B0A]/85 font-mono text-[13px] text-bone @max-xl:text-[12px] transition-transform duration-120 select-none",
        className
      )}
    >
      <RuntimeTopBar />
      <div className="flex min-h-0 flex-1">
        <RuntimeSidebar />
        <AgentPane />
        <TestPane />
      </div>
    </div>
  );
}

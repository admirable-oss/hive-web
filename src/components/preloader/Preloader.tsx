import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { hiveActions } from "@/lib/hive-store";
import { runPreloader } from "@/lib/preloader/run-preloader";

export type PreloaderMode = "always" | "once" | "off";

const SEEN_KEY = "hive-preloaded";
const CELLS = 24;

const label = (p: number) =>
  p < 0.3 ? "BOOTING RUNTIME" : p < 0.62 ? "MOUNTING CELLS" : p < 0.97 ? "WAKING A WORKER" : "READY";

function hasSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Preloader island. Server-rendered as an opaque overlay so nothing flashes
 * before hydration; CSS hides it up-front for reduced motion and for repeat
 * visits in `once` mode.
 */
export default function Preloader({ mode = "always" }: { mode?: PreloaderMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textHidden, setTextHidden] = useState(false);
  const [transparent, setTransparent] = useState(false);

  useEffect(() => {
    const skip = reducedMotion || mode === "off" || (mode === "once" && hasSeen());
    if (skip || !canvasRef.current) {
      setDone(true);
      hiveActions.beginIntro(false);
      return;
    }
    markSeen();
    return runPreloader(canvasRef.current, {
      onProgress: setProgress,
      onHideText: () => setTextHidden(true),
      onClearBackground: () => setTransparent(true),
      onIntro: () => hiveActions.beginIntro(true),
      onDone: () => setDone(true),
    });
  }, [mode, reducedMotion]);

  if (done) return null;

  const filled = Math.round(progress * CELLS);
  const fade = cn("transition-opacity duration-300 ease-[steps(3)]", textHidden && "opacity-0");

  return (
    <div
      data-preloader
      data-mode={mode}
      role="progressbar"
      aria-label="Loading Hive"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className={cn("fixed inset-0 z-150", transparent ? "bg-transparent" : "bg-panel")}
    >
      <canvas ref={canvasRef} className="pixelated absolute inset-0 size-full" />
      <div aria-hidden className={cn("scanlines pointer-events-none absolute inset-0 opacity-50", fade)} />
      <div
        aria-hidden
        className={cn(
          "absolute top-[calc(50%+62px)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-3.5 font-mono text-[11px] tracking-[.16em] whitespace-nowrap text-ash",
          fade
        )}
      >
        <div className="flex gap-0.75">
          {Array.from({ length: CELLS }, (_, i) => (
            <span key={i} className={cn("size-1.5", i < filled ? "bg-honey" : "bg-graphite-hi")} />
          ))}
        </div>
        <div className="flex gap-4.5">
          <span>{label(progress)}</span>
          <span className="text-bone">{String(Math.round(progress * 100)).padStart(3, "0")}%</span>
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-[clamp(16px,4vw,64px)] bottom-[calc(24px+env(safe-area-inset-bottom))] flex justify-between font-mono text-[11px] tracking-[.14em] text-dim",
          fade
        )}
      >
        <span>[HIVE] V0.1 ALPHA</span>
        <span>ADMIRABLE-OSS/HIVE</span>
      </div>
    </div>
  );
}

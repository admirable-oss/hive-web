import { Suspense, lazy, useEffect, useState } from "react";
import { RuntimeDemo } from "@/components/hero/runtime/RuntimeDemo";
import { WebGLBoundary } from "@/components/shared/WebGLBoundary";
import type { HiveSceneProps } from "./HiveScene";

// three.js + R3F + drei load in their own chunk, off the critical path.
const HiveScene = lazy(() => import("./HiveScene"));

/** No WebGL: the same terminal, tilted with plain CSS 3D — never a broken hero. */
function FlatTerminal({ signals, reducedMotion, introAt }: Pick<HiveSceneProps, "signals" | "reducedMotion" | "introAt">) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 [perspective:1400px] max-sm:[@media(max-height:760px)]:hidden [@media(max-height:640px)]:hidden">
      <RuntimeDemo
        className="h-[46vh] w-full max-w-[1120px] origin-bottom [transform:rotateX(40deg)] [mask-image:linear-gradient(to_top,black_45%,rgb(0_0_0/.25)_100%)]"
        signals={signals}
        reducedMotion={reducedMotion}
        introAt={introAt}
      />
    </div>
  );
}

export function HiveSceneLayer(props: HiveSceneProps) {
  // Keep the DOM version in the first paint. Start the Three/R3F chunk after
  // the hero has painted and the browser has an idle slice; skip it entirely
  // when the visitor has asked for reduced motion.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (props.reducedMotion) return;

    let idleId: number | undefined;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const timer = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(() => setMounted(true), { timeout: 1200 });
      } else {
        setMounted(true);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
    };
  }, [props.reducedMotion]);

  return (
    <div className="absolute inset-0">
      {mounted ? (
        <WebGLBoundary fallback={<FlatTerminal {...props} />}>
          <Suspense fallback={<FlatTerminal {...props} />}>
            <HiveScene {...props} />
          </Suspense>
        </WebGLBoundary>
      ) : (
        <FlatTerminal {...props} />
      )}
    </div>
  );
}

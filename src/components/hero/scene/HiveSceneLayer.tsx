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
  // Client-only: never pull three.js into the server render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="absolute inset-0">
      {mounted && (
        <WebGLBoundary fallback={<FlatTerminal {...props} />}>
          <Suspense fallback={null}>
            <HiveScene {...props} />
          </Suspense>
        </WebGLBoundary>
      )}
    </div>
  );
}

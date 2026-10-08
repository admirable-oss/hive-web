import { useCallback, useRef, useState } from "react";
import { useHeroIntro } from "@/hooks/use-hero-intro";
import { useMascot } from "@/hooks/use-mascot";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { createHeroSignals } from "@/lib/hero-signals";
import { useHive } from "@/lib/hive-store";
import { SUBHEAD } from "./copy";
import { HeroActions, HeroAgents } from "./HeroActions";
import { HeroEyebrow } from "./HeroEyebrow";
import { HeroHeadline } from "./HeroHeadline";
import { HiveSceneLayer } from "./scene/HiveSceneLayer";

/**
 * Hero island. Copy at the top; below it a 3D hive floor with the runtime
 * terminal lying on it, receding into haze.
 * Layers (back → front): 3D floor · scanlines · far-bee canvas · terminal
 * (portalled from the scene) · copy · near-bee/particle canvas.
 * The bee is confined below the copy.
 */
export default function Hero({ intensity = 1 }: { intensity?: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const htmlLayerRef = useRef<HTMLDivElement>(null);
  const [signals] = useState(createHeroSignals);

  const reducedMotion = useReducedMotion();
  const introAt = useHive((s) => s.introAt);
  const menuOpen = useHive((s) => s.menuOpen);

  useHeroIntro(sectionRef, { introAt, reducedMotion });
  useMascot({ section: sectionRef, back: backRef, front: frontRef, signals, reducedMotion });

  /** Bottom of the copy block in section px (layout-based, ignores intro transforms). */
  const getCeiling = useCallback(() => {
    const section = sectionRef.current;
    const el = section?.querySelector<HTMLElement>("[data-mascot-ceiling]");
    if (!section || !el) return 0;
    let y = el.offsetHeight;
    for (let n: HTMLElement | null = el; n && n !== section; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
    return y;
  }, []);

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="absolute inset-0 cursor-crosshair touch-pan-y overflow-hidden"
    >
      <HiveSceneLayer
        signals={signals}
        active={!reducedMotion && !menuOpen}
        reducedMotion={reducedMotion}
        introAt={introAt}
        htmlLayer={htmlLayerRef}
        getCeiling={getCeiling}
        intensity={intensity}
      />
      <div aria-hidden className="scanlines pointer-events-none absolute inset-0 opacity-20" />
      <canvas ref={backRef} aria-hidden className="pixelated pointer-events-none absolute inset-0 size-full" />
      <div ref={htmlLayerRef} className="pointer-events-none absolute inset-0 z-2" />

      <div className="pointer-events-none relative z-3 mx-auto box-border flex w-full max-w-300 flex-col items-start gap-0 px-4 pt-[76px] text-left sm:items-center sm:gap-[clamp(12px,2.2vh,20px)] sm:px-[clamp(16px,4vw,64px)] sm:pt-[clamp(88px,11.5vh,116px)] sm:text-center">
        <HeroEyebrow />
        <HeroHeadline />
        <p
          data-reveal="b"
          className="m-0 mt-3 max-w-[38ch] text-sm leading-[1.55] text-pretty text-stone sm:mt-0 sm:max-w-140 sm:text-[clamp(14px,min(1.15vw,2vh),17px)]"
        >
          {SUBHEAD}
        </p>
        <HeroActions />
        <HeroAgents />
      </div>

      <canvas ref={frontRef} aria-hidden className="pixelated pointer-events-none absolute inset-0 z-4 size-full" />
    </section>
  );
}

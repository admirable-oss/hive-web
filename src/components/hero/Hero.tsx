import { useRef, useState } from "react";
import { useHeroIntro } from "@/hooks/use-hero-intro";
import { useMascot } from "@/hooks/use-mascot";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { createHeroSignals } from "@/lib/hero-signals";
import { useHive } from "@/lib/hive-store";
import { SUBHEAD } from "./copy";
import { HeroActions, HeroAgents } from "./HeroActions";
import { HeroEyebrow } from "./HeroEyebrow";
import { HeroHeadline } from "./HeroHeadline";
import { HoneycombLayer } from "./honeycomb/HoneycombLayer";

/**
 * Hero island. Layer stack (back → front):
 * WebGL honeycomb · scanlines · far-bee canvas · copy · near-bee/particle canvas.
 */
export default function Hero({ intensity = 1 }: { intensity?: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const [signals] = useState(createHeroSignals);

  const reducedMotion = useReducedMotion();
  const introAt = useHive((s) => s.introAt);
  const menuOpen = useHive((s) => s.menuOpen);

  useHeroIntro(sectionRef, { introAt, reducedMotion });
  useMascot({ section: sectionRef, back: backRef, front: frontRef, signals, reducedMotion });

  return (
    <section
      id="top"
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="absolute inset-0 cursor-crosshair touch-pan-y"
    >
      <HoneycombLayer signals={signals} active={!reducedMotion && !menuOpen} intensity={intensity} />
      <div aria-hidden className="scanlines pointer-events-none absolute inset-0 opacity-50" />
      <canvas ref={backRef} aria-hidden className="pixelated pointer-events-none absolute inset-0 size-full" />

      <div
        className="pointer-events-none relative z-[2] mx-auto box-border flex h-full max-w-[1200px] flex-col items-start justify-end gap-[18px] px-5 pt-24 pb-[calc(28px+env(safe-area-inset-bottom))] text-left sm:items-center sm:justify-center sm:gap-[clamp(14px,3.2vh,32px)] sm:px-[clamp(16px,4vw,64px)] sm:pt-[clamp(72px,11vh,96px)] sm:pb-[clamp(32px,6vh,56px)] sm:text-center"
      >
        <HeroEyebrow />
        <HeroHeadline />
        <p
          data-reveal="b"
          className="m-0 max-w-[34ch] text-base leading-normal text-pretty text-stone sm:max-w-[600px] sm:text-[length:clamp(15px,min(1.45vw,2.4vh),21px)]"
        >
          {SUBHEAD}
        </p>
        <HeroActions />
        <HeroAgents />
      </div>

      <canvas ref={frontRef} aria-hidden className="pixelated pointer-events-none absolute inset-0 z-[3] size-full" />
    </section>
  );
}

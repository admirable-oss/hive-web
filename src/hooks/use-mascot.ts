import { useEffect, useRef, type RefObject } from "react";
import { useGsapTicker } from "./use-gsap-ticker";
import { useHiveAudio } from "./use-hive-audio";
import type { HeroSignals } from "@/lib/hero-signals";
import { hiveStore, introElapsed } from "@/lib/hive-store";
import { MascotEngine, type MascotTarget } from "@/lib/mascot/engine";

interface UseMascotOptions {
  section: RefObject<HTMLElement | null>;
  back: RefObject<HTMLCanvasElement | null>;
  front: RefObject<HTMLCanvasElement | null>;
  signals: HeroSignals;
  reducedMotion: boolean;
}

/**
 * Owns the mascot engine's lifecycle. Targets are found by data attributes
 * (`data-mascot-target`, `data-mascot-ceiling`) so the bee can visit elements
 * in other islands (e.g. the navbar's Install button) without shared refs.
 */
export function useMascot({ section, back, front, signals, reducedMotion }: UseMascotOptions) {
  const engine = useRef<MascotEngine | null>(null);
  const sfx = useHiveAudio();

  useEffect(() => {
    const s = section.current;
    const b = back.current;
    const f = front.current;
    if (!s || !b || !f) return;

    let e: MascotEngine;
    try {
      e = new MascotEngine({
        section: s,
        back: b,
        front: f,
        signals,
        sfx,
        findTarget: (key: MascotTarget) => document.querySelector<HTMLElement>(`[data-mascot-target="${key}"]`),
        ceiling: () => s.querySelector<HTMLElement>("[data-mascot-ceiling]"),
        introElapsed,
        preloaded: () => hiveStore.get().preloaded,
        motion: !reducedMotion,
      });
    } catch {
      return; // no 2D canvas — skip the mascot entirely
    }
    engine.current = e;

    // Freeze while the full-screen menu covers the hero.
    const sync = () => (e.paused = hiveStore.get().menuOpen);
    sync();
    const unsubscribe = hiveStore.subscribe(sync);

    return () => {
      unsubscribe();
      e.dispose();
      engine.current = null;
    };
  }, [section, back, front, signals, sfx, reducedMotion]);

  useGsapTicker((now) => engine.current?.frame(now), !reducedMotion);
}

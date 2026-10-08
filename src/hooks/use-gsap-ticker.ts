import { useEffect, useEffectEvent } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Runs `callback(nowMs)` on GSAP's shared ticker while `active`. Every canvas
 * loop on the page (preloader, mascot, 3D floor, menu wipe) rides this single
 * rAF instead of spinning its own.
 */
export function useGsapTicker(callback: (now: number) => void, active = true) {
  const onTick = useEffectEvent(callback);
  useEffect(() => {
    if (!active) return;
    const tick = () => onTick(performance.now());
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [active]);
}

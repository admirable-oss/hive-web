import { useCallback, useRef } from "react";
import { FullscreenMenu } from "@/components/menu/FullscreenMenu";
import { usePixelSwap } from "@/hooks/use-pixel-swap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useHiveAudio } from "@/hooks/use-hive-audio";
import { gsap, useGSAP } from "@/lib/gsap";
import { hiveActions, introElapsed, useHive } from "@/lib/hive-store";
import { Navbar } from "./Navbar";

/** Header island: navbar + full-screen menu + the pixel wipe between them. */
export default function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const menuOpen = useHive((s) => s.menuOpen);
  const introAt = useHive((s) => s.introAt);
  const reducedMotion = useReducedMotion();
  const { canvasRef, swap } = usePixelSwap(reducedMotion);
  useHiveAudio();

  // Fade in with the intro (stepped, like the rest of the boot sequence).
  useGSAP(
    () => {
      const el = headerRef.current;
      if (!el) return;
      if (reducedMotion) return void gsap.set(el, { opacity: 1 });
      if (introAt === null) return;
      gsap.to(el, { opacity: 1, duration: 0.6, ease: "steps(6)", delay: Math.max(0, 0.06 - introElapsed()) });
    },
    { dependencies: [introAt, reducedMotion] },
  );

  const openMenu = useCallback(() => swap(() => hiveActions.setMenuOpen(true)), [swap]);
  const closeMenu = useCallback(() => swap(() => hiveActions.setMenuOpen(false)), [swap]);

  return (
    <>
      <Navbar ref={headerRef} onOpenMenu={openMenu} menuOpen={menuOpen} />
      <FullscreenMenu isOpen={menuOpen} onRequestClose={closeMenu} reducedMotion={reducedMotion} />
      <canvas ref={canvasRef} aria-hidden className="pixelated pointer-events-none fixed inset-0 z-120 hidden h-screen w-screen" />
    </>
  );
}

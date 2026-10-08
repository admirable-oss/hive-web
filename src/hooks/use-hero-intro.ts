import type { RefObject } from "react";
import { EYEBROW } from "@/components/hero/copy";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

const write = (el: HTMLElement, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

/**
 * Hero boot choreography on a single GSAP timeline.
 *
 * Markup contract (scoped to `scope`):
 *   [data-reveal="a|b|c|d"]          reveals (the 3D scene animates itself)
 *   [data-headline]                  h1, split into masked lines
 *   [data-eyebrow] [data-eyebrow-caret]
 */
export function useHeroIntro(
  scope: RefObject<HTMLElement | null>,
  { introAt, reducedMotion }: { introAt: number | null; reducedMotion: boolean },
) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const q = (sel: string) => root.querySelector<HTMLElement>(sel);
      const eyebrow = q("[data-eyebrow]");
      const eyeCaret = q("[data-eyebrow-caret]");
      const headline = q("[data-headline]");

      if (reducedMotion) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        if (eyebrow) write(eyebrow, EYEBROW);
        return;
      }
      if (introAt === null) return;

      const tl = gsap.timeline();
      if (eyebrow) write(eyebrow, "");

      tl.set('[data-reveal="a"], [data-eyebrow]', { opacity: 1 }, 0.06);

      // Mono eyebrow types out at 24ms/char with a block caret.
      const typer = { n: 0 };
      tl.to(
        typer,
        {
          n: EYEBROW.length,
          duration: EYEBROW.length * 0.024,
          ease: "none",
          onStart: () => eyeCaret && (eyeCaret.style.opacity = "1"),
          onUpdate: () => eyebrow && write(eyebrow, EYEBROW.slice(0, Math.floor(typer.n))),
          onComplete: () => eyeCaret && (eyeCaret.style.opacity = "0"),
        },
        0.12,
      );

      // Grotesk headline: lines rise through a mask, then the split is
      // reverted so the text reflows naturally on resize.
      if (headline) {
        const split = SplitText.create(headline, { type: "lines", mask: "lines" });
        tl.set(headline, { opacity: 1 }, 0.25);
        tl.from(split.lines, { yPercent: 110, duration: 0.9, ease: "power3.out", stagger: 0.09 }, 0.25);
        tl.call(() => split.revert(), [], 1.3);
      }

      const rise = { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" };
      tl.fromTo('[data-reveal="b"]', { opacity: 0, y: 12 }, rise, 0.7);
      tl.fromTo('[data-reveal="c"]', { opacity: 0, y: 12 }, rise, 0.85);
      tl.fromTo('[data-reveal="d"]', { opacity: 0, y: 8 }, rise, 1.0);

      // Islands may hydrate after the intro began — jump to "now".
      const elapsed = (performance.now() - introAt) / 1000;
      if (elapsed > 0.05) tl.time(elapsed);
    },
    { scope, dependencies: [introAt, reducedMotion], revertOnUpdate: true },
  );
}

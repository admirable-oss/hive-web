import type { RefObject } from "react";
import { EYEBROW, SEGMENTS } from "@/components/hero/copy";
import { decode } from "@/lib/decode";
import { gsap, useGSAP } from "@/lib/gsap";

const GLYPH_FPS = 22;
const SCRAMBLE_READY_AT = 2.2;
const SCRAMBLE_COOLDOWN = 0.6;

const write = (el: HTMLElement, text: string) => {
  if (el.textContent !== text) el.textContent = text;
};

/**
 * Hero boot choreography on a single GSAP timeline (times match the
 * wireframe). Text is written straight to the DOM — the decode runs at
 * 60fps without a single React render.
 *
 * Markup contract (all scoped to `scope`):
 *   [data-reveal="a|b|c|d|gl"]  stepped reveals
 *   [data-line="1|2"]           headline lines
 *   [data-seg=key]              headline segments (see copy.ts)
 *   [data-eyebrow] [data-eyebrow-caret] [data-period] [data-caret]
 */
export function useHeroIntro(
  scope: RefObject<HTMLElement | null>,
  { introAt, reducedMotion }: { introAt: number | null; reducedMotion: boolean },
) {
  useGSAP(
    (_, contextSafe) => {
      const root = scope.current;
      if (!root) return;
      const q = (sel: string) => root.querySelector<HTMLElement>(sel);
      const segs = SEGMENTS.flatMap((s) => {
        const el = q(`[data-seg="${s.key}"]`);
        return el ? [{ ...s, el }] : [];
      });
      const eyebrow = q("[data-eyebrow]");
      const eyeCaret = q("[data-eyebrow-caret]");
      const caret = q("[data-caret]");
      const startCaret = () => {
        if (!caret) return;
        caret.style.opacity = "1";
        caret.classList.add("animate-blink");
      };

      if (reducedMotion) {
        gsap.set("[data-reveal], [data-line], [data-period]", { opacity: 1, y: 0 });
        segs.forEach((s) => write(s.el, s.text));
        if (eyebrow) write(eyebrow, EYEBROW);
        startCaret();
        return;
      }
      if (introAt === null) return;

      const tl = gsap.timeline();

      // Clear SSR text so the decode starts from nothing.
      segs.forEach((s) => write(s.el, decode(s.text, -1, s.seed, 0)));
      if (eyebrow) write(eyebrow, "");

      tl.to('[data-reveal="gl"]', { opacity: 1, duration: 1.6, ease: "power1.inOut" }, 0.05);
      tl.set('[data-reveal="a"], [data-eyebrow]', { opacity: 1 }, 0.06);

      // Eyebrow types out at 28ms/char with a block caret.
      const typer = { n: 0 };
      tl.to(
        typer,
        {
          n: EYEBROW.length,
          duration: EYEBROW.length * 0.028,
          ease: "none",
          onStart: () => eyeCaret && (eyeCaret.style.opacity = "1"),
          onUpdate: () => eyebrow && write(eyebrow, EYEBROW.slice(0, Math.floor(typer.n))),
          onComplete: () => eyeCaret && (eyeCaret.style.opacity = "0"),
        },
        0.15,
      );

      // Headline decode — one clock drives every segment.
      tl.set('[data-line="1"]', { opacity: 1 }, 0.34);
      tl.set('[data-line="2"]', { opacity: 1 }, 0.94);
      const clock = { t: 0 };
      tl.to(
        clock,
        {
          t: 2.4,
          duration: 2.4,
          ease: "none",
          onUpdate: () => {
            const fr = Math.floor(clock.t * GLYPH_FPS);
            for (const s of segs) write(s.el, decode(s.text, (clock.t - s.at) / s.d, s.seed, fr));
          },
        },
        0,
      );
      tl.set("[data-period]", { opacity: 1 }, 1.9);
      tl.call(startCaret, [], 1.9);

      // Supporting copy steps in.
      const step = { opacity: 1, y: 0, duration: 0.5, ease: "steps(5)" };
      tl.fromTo('[data-reveal="b"]', { opacity: 0, y: 10 }, step, 1.5);
      tl.fromTo('[data-reveal="c"]', { opacity: 0, y: 10 }, step, 1.7);
      tl.to('[data-reveal="d"]', { opacity: 1, duration: 0.5, ease: "steps(5)" }, 1.95);

      // Islands may hydrate after the intro began — jump to "now".
      const elapsed = (performance.now() - introAt) / 1000;
      if (elapsed > 0.05) tl.time(elapsed);

      // Hover re-scramble on the key words once the intro has settled.
      const lastScramble = new Map<string, number>();
      const cleanups = segs
        .filter((s) => s.word)
        .map((s) => {
          const onEnter = contextSafe!(() => {
            const now = performance.now() / 1000;
            if (tl.time() < SCRAMBLE_READY_AT || now - (lastScramble.get(s.key) ?? -9) < SCRAMBLE_COOLDOWN) return;
            lastScramble.set(s.key, now);
            const p = { v: 0 };
            gsap.to(p, {
              v: 1,
              duration: 0.55,
              ease: "none",
              onUpdate: () =>
                write(s.el, decode(s.text, p.v, s.seed + 5, Math.floor((performance.now() / 1000) * GLYPH_FPS), true)),
              onComplete: () => write(s.el, s.text),
            });
          });
          s.el.addEventListener("pointerenter", onEnter);
          return () => s.el.removeEventListener("pointerenter", onEnter);
        });

      return () => cleanups.forEach((c) => c());
    },
    { scope, dependencies: [introAt, reducedMotion], revertOnUpdate: true },
  );
}

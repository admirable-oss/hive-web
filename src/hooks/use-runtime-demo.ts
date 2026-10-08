import type { RefObject } from "react";
import { COVERAGE_BAR, DEMO } from "@/components/hero/runtime/script";
import { gsap, useGSAP } from "@/lib/gsap";
import type { HeroSignals } from "@/lib/hero-signals";
import { hiveStore, introElapsed } from "@/lib/hive-store";

const SPINNER = ["·", "∴", "∵", "∴"];
/** Demo starts once the window has risen in (see HiveScene). */
const START_AT = 2.6;
/** Where reduced motion freezes the story: everything shown, job done. */
const STILL_FRAME = 12.6;

const write = (el: HTMLElement | null, text: string) => {
  if (el && el.textContent !== text) el.textContent = text;
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const duration = (s: number) => (s < 60 ? `${Math.floor(s)}s` : `${Math.floor(s / 60)}m ${String(Math.floor(s % 60)).padStart(2, "0")}s`);
const bar = (lit: number) => "█".repeat(lit) + "░".repeat(COVERAGE_BAR - lit);

/**
 * Drives the runtime demo as one looping GSAP timeline (~16s): an agent
 * gets a task, the laptop "sleeps", tests keep ticking, the agent reports
 * back. Text is written straight to the DOM. Key moments pulse the hex
 * topology through `signals`, so the floor reacts to the runtime.
 */
export function useRuntimeDemo(
  root: RefObject<HTMLElement | null>,
  { signals, reducedMotion, introAt }: { signals: HeroSignals; reducedMotion: boolean; introAt: number | null },
) {
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = (k: string) => el.querySelector<HTMLElement>(`[data-rt="${k}"]`);
      const qa = (k: string) => [...el.querySelectorAll<HTMLElement>(`[data-rt="${k}"]`)];
      const { agent, tests, elapsed } = DEMO;

      const n = {
        prompt: q("prompt"),
        prompt2: q("prompt2"),
        reply: q("reply-text"),
        reply2: q("reply2-text"),
        lid: q("lid"),
        passing: q("passing"),
        covered: q("covered"),
        covBar: q("cov-bar"),
        elapsed: q("elapsed"),
        spinGlyph: q("spinner-glyph"),
        spinTime: q("spinner-time"),
        authDetail: q("cell-auth-detail"),
        authGlyph: q("cell-auth-glyph"),
      };
      const auth = DEMO.cells.find((c) => c.id === "auth");

      const setLid = (asleep: boolean) => {
        write(n.lid, asleep ? "laptop asleep" : "laptop awake");
        n.lid?.classList.toggle("text-honey", asleep);
      };
      const setAuthDone = (done: boolean) => {
        if (auth && "then" in auth) write(n.authDetail, done ? auth.then : auth.detail);
        n.authDetail?.classList.toggle("text-violet", done);
        n.authGlyph?.classList.toggle("text-violet", done);
      };
      const reset = () => {
        [n.prompt, n.prompt2, n.reply, n.reply2].forEach((e) => write(e, ""));
        write(n.passing, "0");
        write(n.covered, "0");
        write(n.covBar, bar(0));
        write(n.elapsed, clock(elapsed.from));
        write(n.spinTime, "0s");
        setLid(false);
        setAuthDone(false);
      };

      /** Shockwave on the hex floor, centred under the terminal. */
      const ripple = (strength: number) => {
        const r = el.getBoundingClientRect();
        signals.ripple = [(r.left + r.width / 2) / window.innerWidth, 1 - (r.top + r.height * 0.6) / window.innerHeight, signals.t];
        signals.pulse = Math.max(signals.pulse, strength);
      };

      const tl = gsap.timeline({ paused: true, repeat: -1, onRepeat: reset });

      const type = (target: HTMLElement | null, text: string, at: number, cps: number, caretKey?: string) => {
        const caret = caretKey ? q(caretKey) : null;
        const p = { n: 0 };
        tl.to(
          p,
          {
            n: text.length,
            duration: text.length / cps,
            ease: "none",
            onStart: () => caret && (caret.style.opacity = "1"),
            onUpdate: () => write(target, text.slice(0, Math.round(p.n))),
            onComplete: () => caret && (caret.style.opacity = "0"),
          },
          at,
        );
      };
      const show = (key: string, at: number, display = "flex") => {
        const t = q(key);
        if (!t) return;
        tl.set(t, { display }, at);
        tl.fromTo(t, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, at);
      };
      const hide = (key: string, at: number) => {
        const t = q(key);
        if (!t) return;
        tl.to(t, { opacity: 0, duration: 0.2 }, at).set(t, { display: "none" }, at + 0.2);
      };
      const count = (from: number, to: number, at: number, dur: number, onValue: (v: number) => void) => {
        const p = { v: from };
        tl.to(p, { v: to, duration: dur, ease: "none", onUpdate: () => onValue(p.v) }, at);
      };

      // 0–3s · the ask
      type(n.prompt, agent.prompt, 0.3, 34, "prompt-caret");
      show("reply", 1.9);
      type(n.reply, agent.reply, 1.9, 140);
      show("plan", 3.0);
      tl.fromTo(qa("plan-item"), { opacity: 0 }, { opacity: 1, duration: 0.2, stagger: 0.18, immediateRender: false }, 3.1);

      // 3.5–10s · the agent works; the watcher ticks
      show("spinner", 3.5);
      count(0, 252, 3.5, 6.8, (v) => {
        write(n.spinTime, duration(v));
        write(n.spinGlyph, SPINNER[Math.floor(v / 3) % SPINNER.length]);
      });
      qa("case").forEach((c, i) => {
        const at = 4 + i * 0.6;
        tl.fromTo(c, { opacity: 0, x: -4 }, { opacity: 1, x: 0, duration: 0.25, immediateRender: false }, at);
        tl.call(() => {
          write(n.passing, String(i + 1));
          signals.pulse = Math.max(signals.pulse, 0.35);
        }, [], at);
      });
      const lit = Math.round((tests.covered / tests.total) * COVERAGE_BAR);
      count(0, lit, 4, 5, (v) => write(n.covBar, bar(Math.round(v))));
      count(0, tests.covered, 4, 5, (v) => write(n.covered, String(Math.round(v))));
      count(elapsed.from, elapsed.to, 0, 16, (v) => write(n.elapsed, clock(v)));

      // 6–10s · lid closes, nothing stops
      tl.call(() => {
        setLid(true);
        ripple(1);
      }, [], 6);
      show("event", 6.1);
      tl.call(() => setLid(false), [], 10);

      // 10.3–12.5s · back at the keyboard
      hide("spinner", 10.2);
      show("prompt2-row", 10.4);
      type(n.prompt2, agent.prompt2, 10.5, 22, "prompt2-caret");
      show("reply2", 11.4);
      type(n.reply2, agent.reply2, 11.4, 80);
      count(tests.cases.length, tests.total, 11.4, 0.6, (v) => write(n.passing, String(Math.round(v))));
      tl.call(() => {
        setAuthDone(true);
        ripple(0.6);
      }, [], 11.6);

      // Hold the finished frame, then loop.
      tl.to({}, { duration: 3.4 }, 12.6);

      reset();
      if (reducedMotion) {
        tl.time(STILL_FRAME);
        return;
      }
      if (introAt === null) return;

      gsap.delayedCall(Math.max(0, START_AT - introElapsed()), () => tl.play());

      // The menu covers the hero: stop the story underneath it.
      const unsubscribe = hiveStore.subscribe(() => {
        if (hiveStore.get().menuOpen) tl.pause();
        else if (tl.time() > 0 || introElapsed() > START_AT) tl.resume();
      });
      return unsubscribe;
    },
    { scope: root, dependencies: [introAt, reducedMotion], revertOnUpdate: true },
  );
}

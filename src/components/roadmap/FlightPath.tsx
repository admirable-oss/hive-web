import { useEffect, useLayoutEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "@/lib/gsap";
import { COLORS, STATUS, idColor, progressOf, shortId } from "@/lib/roadmap/derive";
import type { Signals } from "@/lib/roadmap/github";
import type { Milestone } from "@/lib/roadmap/parse";
import { ProgressCells } from "./ProgressCells";
import { SectionHead } from "./SectionHead";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  milestones: Milestone[];
  sel: string | null;
  onSelect: (id: string) => void;
  intro: string;
  signals: Signals | null;
  reducedMotion: boolean;
}

const HEX = "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)";

/**
 * "Flight path": milestone cards on a horizontal track with a hairline rail
 * above them. Hex nodes mark each milestone, a honey trail runs up to the one
 * being built, and a small bee glides along the rail to whichever milestone is
 * selected. Native scroll + snap underneath (touch and trackpads stay
 * natural); GSAP only eases the paging, the bee and the reveal.
 */
export function FlightPath({ milestones, sel, onSelect, intro, signals, reducedMotion }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const bee = useRef<HTMLImageElement>(null);
  const placed = useRef(false);
  const drag = useRef({ on: false, x: 0, left: 0, moved: 0 });

  const centers = () => {
    const cards = strip.current ? [...strip.current.querySelectorAll<HTMLElement>("[data-card]")] : [];
    return cards.map((c) => c.offsetLeft + c.offsetWidth / 2);
  };

  /** Rail spans first→last node; the trail runs to the milestone being built. */
  const layoutRail = () => {
    const cs = centers();
    if (!cs.length || !rail.current || !trail.current) return;
    const curIdx = Math.max(0, milestones.findIndex((m) => m.status === "current"));
    rail.current.style.left = `${cs[0]}px`;
    rail.current.style.width = `${cs[cs.length - 1] - cs[0]}px`;
    trail.current.style.left = `${cs[0]}px`;
    trail.current.style.width = `${cs[curIdx] - cs[0]}px`;
  };

  const scrollToCard = (i: number, center = false) => {
    const el = track.current;
    const card = strip.current?.querySelectorAll<HTMLElement>("[data-card]")[i];
    if (!el || !card) return;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const target = center ? card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2 : card.offsetLeft - pad;
    const left = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, target));
    if (reducedMotion) {
      el.scrollLeft = left;
      return;
    }
    // Snap would fight the tween; park it until we land.
    el.style.scrollSnapType = "none";
    gsap.to(el, { scrollLeft: left, duration: 0.8, ease: "power3.out", overwrite: true, onComplete: () => void (el.style.scrollSnapType = "") });
  };

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
    const cs = centers();
    const cards = strip.current!.querySelectorAll<HTMLElement>("[data-card]");
    const lefts = [...cards].map((c) => c.offsetLeft - pad);
    const now = el.scrollLeft;
    const i = dir > 0 ? lefts.findIndex((l) => l > now + 4) : lefts.findLastIndex((l) => l < now - 4);
    if (i >= 0 && cs.length) scrollToCard(i);
  };

  // Rail geometry follows layout.
  useLayoutEffect(() => {
    layoutRail();
    const ro = new ResizeObserver(layoutRail);
    if (strip.current) ro.observe(strip.current);
    return () => ro.disconnect();
  }, [milestones]); // eslint-disable-line react-hooks/exhaustive-deps

  // The bee hops along the rail to the selected node.
  useEffect(() => {
    const i = milestones.findIndex((m) => m.id === sel);
    const x = centers()[i];
    if (x == null || !bee.current) return;
    const el = bee.current;
    if (!placed.current || reducedMotion) {
      placed.current = true;
      gsap.set(el, { x, y: 0 });
      return;
    }
    const from = Number(gsap.getProperty(el, "x"));
    const dur = Math.min(1.1, 0.45 + Math.abs(x - from) / 1600);
    gsap
      .timeline({ overwrite: true })
      .to(el, { x, duration: dur, ease: "power2.inOut" }, 0)
      .to(el, { y: -10, duration: dur / 2, ease: "sine.out" }, 0)
      .to(el, { y: 0, duration: dur / 2, ease: "sine.in" }, dur / 2);
    scrollToCard(i, true);
  }, [sel, milestones]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quiet reveal: the rail draws in, cards settle in sequence.
  useEffect(() => {
    if (reducedMotion || !strip.current) return;
    const ctx = gsap.context(() => {
      const st = { trigger: strip.current, start: "top 88%", once: true };
      gsap.from([rail.current, trail.current], { scaleX: 0, transformOrigin: "0 50%", duration: 1.1, ease: "power2.out", scrollTrigger: st });
      gsap.from("[data-card]", { y: 14, autoAlpha: 0, duration: 0.6, stagger: 0.05, ease: "power2.out", scrollTrigger: st });
      gsap.from("[data-node]", { scale: 0, duration: 0.4, stagger: 0.05, ease: "back.out(2)", delay: 0.3, scrollTrigger: st });
    }, strip);
    return () => ctx.revert();
  }, [reducedMotion, milestones.length]);

  // Mouse drag-to-scroll (touch uses native scrolling).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !track.current) return;
    drag.current = { on: true, x: e.clientX, left: track.current.scrollLeft, moved: 0 };
    gsap.killTweensOf(track.current);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = track.current;
    if (!d.on || !el) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    if (d.moved > 4) {
      el.style.scrollSnapType = "none";
      el.style.cursor = "grabbing";
      el.scrollLeft = d.left - dx;
    }
  };
  const endDrag = () => {
    const el = track.current;
    if (!drag.current.on || !el) return;
    drag.current.on = false;
    el.style.cursor = "";
    if (drag.current.moved > 4) {
      // Settle on the nearest card.
      const pad = parseFloat(getComputedStyle(el).scrollPaddingLeft) || 0;
      const lefts = [...strip.current!.querySelectorAll<HTMLElement>("[data-card]")].map((c) => c.offsetLeft - pad);
      let best = 0;
      lefts.forEach((l, i) => Math.abs(l - el.scrollLeft) < Math.abs(lefts[best] - el.scrollLeft) && (best = i));
      scrollToCard(best);
    }
  };

  return (
    <section className="pt-[clamp(64px,8vw,104px)]" aria-labelledby="flight-title">
      <div className="mx-auto max-w-[1440px] px-[clamp(20px,3vw,32px)]">
        <SectionHead
          index="01"
          eyebrow="FLIGHT PATH"
          id="flight-title"
          title="One tagged release at a time."
          aside={
            <div className="flex gap-1.5">
              {([-1, 1] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => page(dir)}
                  aria-label={dir < 0 ? "Scroll milestones left" : "Scroll milestones right"}
                  className="size-10 cursor-pointer border border-bone/10 bg-bone/[.03] text-bone transition-colors hover:border-honey/40 hover:text-honey"
                >
                  {dir < 0 ? "←" : "→"}
                </button>
              ))}
            </div>
          }
        >
          {intro}
        </SectionHead>
      </div>

      <div
        ref={track}
        role="region"
        aria-label="Roadmap milestones"
        tabIndex={0}
        className="snap-x snap-mandatory overflow-x-auto scroll-px-[clamp(20px,3vw,32px)] [scrollbar-width:none] select-none [&::-webkit-scrollbar]:hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") page(1);
          if (e.key === "ArrowLeft") page(-1);
        }}
      >
        <div ref={strip} className="relative flex w-max gap-3 px-[clamp(20px,3vw,32px)] pt-11 pb-5">
          {/* Rail, shipped trail, and the bee riding it. */}
          <div ref={rail} aria-hidden="true" className="absolute top-[21px] h-px bg-[repeating-linear-gradient(90deg,rgba(237,234,227,.22)_0_4px,transparent_4px_8px)]" />
          <div ref={trail} aria-hidden="true" className="absolute top-[21px] h-px bg-[#C98F2E]" />
          <img
            ref={bee}
            src="/brand/mascot/hive-agent-flying.svg"
            alt=""
            aria-hidden="true"
            className="pixelated pointer-events-none absolute top-[2px] left-0 z-[2] h-[18px] w-auto -translate-x-1/2"
          />

          {milestones.map((m) => {
            const on = m.id === sel;
            const p = progressOf(m, signals);
            const node = m.status === "done" ? COLORS.shipped : m.status === "current" ? COLORS.honey : "transparent";
            return (
              <div key={m.id} data-card className="relative w-[min(78vw,280px)] flex-none snap-start">
                <span
                  data-node
                  aria-hidden="true"
                  className="absolute -top-[29px] left-1/2 size-[11px] -translate-x-1/2"
                  style={{ clipPath: HEX, background: m.status === "planned" || m.status === "later" ? "#6E6B63" : node }}
                >
                  <span
                    className="absolute inset-[2px]"
                    style={{ clipPath: HEX, background: m.status === "planned" || m.status === "later" ? "#0F0F0E" : node }}
                  />
                </span>
                <button
                  type="button"
                  onClick={() => (drag.current.moved > 4 ? undefined : onSelect(m.id))}
                  aria-pressed={on}
                  className="flex h-full w-full cursor-pointer flex-col gap-3 border border-bone/[.07] p-[18px] pb-4 text-left text-bone transition-colors duration-200 hover:border-bone/[.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey"
                  style={{
                    background: on ? "#1A1A18" : "#131312",
                    borderTop: `2px solid ${on ? COLORS.honey : m.status === "done" ? "rgba(201,143,46,.6)" : "rgba(237,234,227,.1)"}`,
                  }}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[28px] leading-none font-medium tracking-[-.04em]" style={{ color: idColor(m) }}>
                      {shortId(m)}
                    </span>
                    <span className="flex flex-col items-end gap-[3px] font-mono text-[11px]">
                      <span style={{ color: STATUS[m.status].color }}>{STATUS[m.status].label}</span>
                      <span className="text-[#8E8A80]">{m.version}</span>
                    </span>
                  </span>
                  <span className="text-[16.5px] leading-[1.25] font-medium tracking-[-.015em]">{m.title}</span>
                  <span className="line-clamp-3 min-h-[63px] text-[13.5px] leading-[1.55] text-[#A9A59B]">{m.blurb}</span>
                  <span className="mt-auto flex items-center justify-between gap-3 border-t border-bone/[.07] pt-2.5 font-mono text-[11px] text-[#8E8A80]">
                    <span>{m.status === "later" ? `${m.items.length} ideas` : `${m.items.length} items`}</span>
                    <ProgressCells cells={p.cells} size="sm" />
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <span className="sr-only">Use the arrow buttons or arrow keys to move along the milestones.</span>
    </section>
  );
}

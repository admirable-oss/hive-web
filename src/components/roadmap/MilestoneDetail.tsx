import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { idColor, progressOf, shortId, STATUS } from "@/lib/roadmap/derive";
import { ROADMAP_URL, type Signals } from "@/lib/roadmap/github";
import type { Milestone } from "@/lib/roadmap/parse";
import { ProgressCells } from "./ProgressCells";
import { Segs } from "./Segs";

interface Props {
  m: Milestone | undefined;
  signals: Signals | null;
  signalsErr?: boolean;
  reducedMotion: boolean;
}

export function MilestoneDetail({ m, signals, signalsErr = false, reducedMotion }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Cross-fade the content when the selection changes (not on first paint).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reducedMotion || !root.current) return;
    const t = gsap.fromTo(root.current.querySelectorAll("[data-detail]"), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power2.out" });
    return () => void t.kill();
  }, [m?.id, reducedMotion]);

  if (!m) return null;
  const st = STATUS[m.status];
  const p = progressOf(m, signals, signalsErr);

  return (
    <section id="detail" className="mx-auto max-w-[1440px] scroll-mt-16 px-[clamp(20px,3vw,32px)] pt-[clamp(40px,5vw,64px)]" aria-live="polite">
      <div
        ref={root}
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-x-[clamp(32px,5vw,72px)] gap-y-8 border border-bone/[.08] border-t-2 border-t-honey/40 bg-[#151514] p-[clamp(24px,3vw,40px)]"
      >
        <div data-detail className="flex min-w-0 flex-col gap-4">
          <div className="flex items-end gap-[18px]">
            <span className="font-mono text-[clamp(72px,9vw,128px)] leading-[.85] font-medium tracking-[-.06em]" style={{ color: idColor(m) }}>
              {shortId(m)}
            </span>
            <span className="flex flex-col gap-1 pb-1.5 font-mono text-xs">
              <span style={{ color: st.color }}>{st.label}</span>
              <span className="text-[#A9A59B]">{m.version}</span>
            </span>
          </div>
          <h2 className="m-0 text-[clamp(26px,2.6vw,34px)] leading-[1.1] font-medium tracking-[-.03em]">{m.title}</h2>
          {m.blurb && <p className="m-0 max-w-[520px] text-base leading-[1.6] text-pretty text-[#C9C5BB]">{m.blurb}</p>}
          {(m.status === "current" || m.status === "planned") && (
            <div className="flex flex-col gap-2 border-y border-bone/[.08] py-3.5">
              <ProgressCells cells={p.cells} size="lg" />
              <span className="font-mono text-xs text-[#A9A59B]">{p.label}</span>
            </div>
          )}
          {m.accept && (
            <div className="flex flex-col gap-2 border-l-2 bg-black/[.14] p-4" style={{ borderColor: st.color }}>
              <span className="font-mono text-[11.5px] tracking-[.14em]" style={{ color: st.color }}>
                {(m.acceptLabel || "Acceptance").toUpperCase()}
              </span>
              <span className="text-[14.5px] leading-[1.6] text-[#C9C5BB]">
                <Segs text={m.accept} />
              </span>
            </div>
          )}
          <a href={ROADMAP_URL} target="_blank" rel="noopener" className="self-start font-mono text-[12.5px] text-[#A9A59B] hover:text-honey">
            Read {shortId(m)} in ROADMAP.md ↗
          </a>
        </div>

        <div data-detail className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-bone/10 pb-3 font-mono text-[10.5px] tracking-[.14em] text-[#8E8A80]">
            <span>MILESTONE WORK</span>
            <span>{String(m.items.length).padStart(2, "0")} ITEMS</span>
          </div>
          <ol className="m-0 flex min-w-0 list-none flex-col p-0">
            {m.items.map((it, i) => {
              const g = p.sigs[i];
              return (
                <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-bone/[.07] py-3.5 last:border-b-0">
                  <span className="pt-0.5 font-mono text-xs text-[#8E8A80]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex min-w-0 flex-col gap-[5px]">
                    <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                      <span className="text-[15.5px] font-medium text-bone">
                        <Segs text={it.title} />
                      </span>
                      {g.sig && (
                        <span title={g.title} className="pt-0.5 font-mono text-[11.5px] whitespace-nowrap" style={{ color: g.color }}>
                          {g.sig}
                        </span>
                      )}
                    </span>
                    {it.desc && (
                      <span className="text-sm leading-[1.6] [overflow-wrap:anywhere] text-[#A9A59B]">
                        <Segs text={it.desc} />
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

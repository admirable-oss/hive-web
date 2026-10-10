import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { ago, COLORS, destOf, fmt, progressOf, STATUS } from "@/lib/roadmap/derive";
import { ROADMAP_URL } from "@/lib/roadmap/github";
import { REPO } from "@/lib/site";
import { CombStage } from "./comb/CombStage";
import { ProgressCells } from "./ProgressCells";
import type { RoadmapLive } from "./use-roadmap-live";

interface Props {
  live: RoadmapLive;
  sel: string | null;
  onSelect: (id: string) => void;
  onOpenCurrent: () => void;
  reducedMotion: boolean;
}

const pixelClip =
  "polygon(0 4px,4px 4px,4px 0,calc(100% - 4px) 0,calc(100% - 4px) 4px,100% 4px,100% calc(100% - 4px),calc(100% - 4px) calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 4px),0 calc(100% - 4px))";

const label = "font-mono text-[11px] tracking-[.16em] text-[#8E8A80]";

export function RoadmapHero({ live, sel, onSelect, onOpenCurrent, reducedMotion }: Props) {
  const { rm, repo, release, contribs, commits, signals, now, notify } = live;
  const ms = rm.milestones;
  const main = ms.filter((m) => m.status !== "later");
  const cur = ms.find((m) => m.status === "current") ?? main.find((m) => m.status === "planned") ?? ms[0];
  const curP = cur ? progressOf(cur, signals, !!live.errors.signals) : null;
  const done = main.filter((m) => m.status === "done").length;
  const beeCommits = (commits ?? []).map((c) => ({ sha: c.sha, short: c.sha.slice(0, 7), msg: c.msg, dest: destOf(c, ms).id }));

  const heroRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (reducedMotion || !heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", { y: 16, autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: "power3.out", delay: 0.1 });
      gsap.from("[data-block]", { autoAlpha: 0, duration: 0.01, stagger: 0.09, delay: 0.9 });
    }, heroRef);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative overflow-hidden border-b border-bone/[.06] bg-[radial-gradient(ellipse_95%_80%_at_50%_44%,#1E1E1C_0%,#151514_52%,#0C0C0B_100%)]"
    >
      <div className="relative mx-auto flex max-w-[1440px] flex-col lg:static lg:min-h-[clamp(660px,calc(100svh-56px),880px)]">
        {/* Title */}
        <div className="pointer-events-none relative z-[2] flex max-w-[540px] flex-col gap-[18px] px-[clamp(20px,3vw,32px)] pt-8 lg:pt-12">
          <div data-hero className="flex items-center gap-3 font-mono text-xs tracking-[.22em] text-[#A9A59B]">
            <span className="size-2 bg-honey" />
            ROADMAP · READ LIVE FROM MAIN
          </div>
          <h1 data-hero className="m-0 text-[clamp(44px,5.6vw,80px)] leading-[.98] font-medium tracking-[-.045em] text-balance">
            Building the comb<span className="text-honey">.</span>
          </h1>
          <p data-hero className="m-0 max-w-[470px] text-[clamp(16px,1.3vw,17.5px)] leading-[1.6] text-pretty text-[#C9C5BB]">
            Every cell is a milestone from ROADMAP.md. Capped cells have shipped, the lit cell is being built, and every bee is a
            real commit on main, flying to the work it touches.
          </p>
          <div data-hero className="pointer-events-auto flex flex-wrap gap-2.5">
            <a
              href="#detail"
              onClick={(e) => {
                e.preventDefault();
                onOpenCurrent();
              }}
              className="flex h-11 items-center gap-2.5 bg-honey px-[18px] text-[15px] font-medium text-[#141412] hover:bg-[#FFC85A] hover:text-[#141412]"
              style={{ clipPath: pixelClip }}
            >
              See what's building <span aria-hidden="true">→</span>
            </a>
            <a
              href={ROADMAP_URL}
              target="_blank"
              rel="noopener"
              className="flex h-11 items-center gap-2 border-t border-bone/16 bg-bone/[.07] px-4 text-[15px] text-bone hover:bg-bone/12 hover:text-bone"
            >
              ROADMAP.md <span className="text-[#A9A59B]">↗</span>
            </a>
          </div>
        </div>

        {/* The comb: in flow on small screens, the full-bleed stage on large ones. */}
        <div className="relative -mt-2 h-[min(96vw,440px)] sm:h-[480px] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto">
          <CombStage
            milestones={ms}
            sel={sel}
            onSelect={onSelect}
            commits={beeCommits}
            reducedMotion={reducedMotion}
            onNewBee={(b) => notify(`New commit ${b.short} on main. A bee is heading to ${b.home.id}.`)}
          />
        </div>

        {/* Scrims: keep the title readable over the comb, and ease the comb into the strip. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] max-lg:hidden">
          <div className="absolute inset-y-0 left-0 w-[52%] bg-[linear-gradient(90deg,#0f0f0e_0%,rgba(15,15,14,.82)_38%,transparent_100%)]" />
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(#0f0f0e,transparent)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(transparent,rgba(12,12,11,.85))]" />
        </div>

        {/* Legend */}
        <div
          data-hero
          className="pointer-events-none relative z-[2] flex flex-wrap justify-center gap-x-[18px] gap-y-1.5 px-5 pb-4 font-mono text-[11px] text-[#A9A59B] lg:absolute lg:top-12 lg:right-[clamp(20px,3vw,32px)] lg:justify-end lg:p-0"
        >
          {[
            ["shipped", COLORS.shipped],
            ["building", COLORS.honey],
            ["planned", "#54514A"],
          ].map(([t, c]) => (
            <span key={t} className="flex items-center gap-[7px]">
              <span className="size-2.5" style={{ background: c }} />
              {t}
            </span>
          ))}
          <span className="flex items-center gap-[7px]">
            <img src="/brand/mascot/hive-agent.svg" alt="" className="pixelated h-2.5 w-auto" />
            commit on main
          </span>
        </div>

        {/* Status strip: progress · now building · repository, one structured bar. */}
        <div className="relative z-[2] mt-auto px-[clamp(20px,3vw,32px)] pb-[clamp(20px,3vw,28px)]">
          <div
            data-hero
            className="grid border border-bone/[.08] bg-[#121211]/72 shadow-[0_24px_60px_-30px_rgba(0,0,0,.9)] backdrop-blur-md lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] [&>*]:border-bone/[.08] [&>*+*]:border-t lg:[&>*+*]:border-t-0 lg:[&>*+*]:border-l"
          >
            {/* To v1 */}
            <div className="flex flex-col gap-3 p-4 lg:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={label}>TO v1.0.0</span>
                <span className="font-mono text-[11.5px] text-[#C9C5BB]">
                  {release === undefined ? "latest tag …" : release ? `latest ${release.tag}${release.date ? ` · ${ago(release.date, now)}` : ""}` : "no tag yet"}
                </span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono text-[30px] leading-none font-medium tracking-[-.03em] tabular-nums">
                  {done}
                  <span className="text-[#6E6B63]">/{Math.max(1, main.length)}</span>
                </span>
                <span className="text-[13.5px] text-[#A9A59B]">milestones shipped</span>
              </div>
              <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${Math.max(1, main.length)},minmax(0,1fr))` }}>
                {main.map((m) => {
                  const fill = m.status === "current" ? Math.round(Math.max(0.12, progressOf(m, signals).frac) * 100) : 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      data-block
                      onClick={() => onSelect(m.id)}
                      title={`${m.id} · ${m.title} · ${STATUS[m.status].label}`}
                      aria-label={`${m.id} · ${m.title} · ${STATUS[m.status].label}`}
                      className="relative h-3 cursor-pointer overflow-hidden border p-0"
                      style={{
                        background: m.status === "done" ? COLORS.shipped : "transparent",
                        borderColor: m.status === "done" ? COLORS.shipped : m.status === "current" ? COLORS.honey : "#5A5850",
                        outline: m.id === sel ? "1px solid rgba(237,234,227,.5)" : undefined,
                        outlineOffset: 1,
                      }}
                    >
                      <span className="absolute inset-y-0 left-0 bg-honey" style={{ width: `${fill}%` }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Now building */}
            <div className="flex flex-col gap-3 bg-bone/[.015] p-4 lg:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.15em] text-[#A9A59B]">
                  <span className="size-1.5 bg-[#D5A044]" />
                  BUILDING NOW
                </span>
                {cur?.version && <span className="border border-bone/[.08] px-1.5 py-0.5 font-mono text-[10.5px] text-[#8E8A80]">{cur.version}</span>}
              </div>
              <div className="flex min-w-0 items-baseline gap-2.5">
                {cur && <span className="font-mono text-[13px] text-[#D5A044]">{cur.id}</span>}
                <span className="min-w-0 text-[16px] leading-[1.25] font-medium tracking-[-.01em] text-[#E2DED5]">
                  {cur?.title ?? "Reading roadmap…"}
                </span>
              </div>
              {curP && <ProgressCells cells={curP.cells} />}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-bone/[.07] pt-2">
                <span className="font-mono text-[10.5px] leading-[1.5] text-[#8E8A80]">{curP?.label}</span>
                {cur && (
                  <a
                    href="#detail"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenCurrent();
                    }}
                    className="text-[13px] font-medium text-[#C9C5BB] hover:text-honey focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey"
                  >
                    Details <span aria-hidden="true">→</span>
                  </a>
                )}
              </div>
            </div>

            {/* Repository */}
            <div className="flex flex-col gap-3 p-4 lg:p-5">
              <a href={REPO} target="_blank" rel="noopener" className="flex items-baseline justify-between font-mono text-[11px] tracking-[.16em] text-[#8E8A80] hover:text-honey">
                ADMIRABLE-OSS/HIVE <span>↗</span>
              </a>
              <dl className="m-0 grid grid-cols-4 gap-2">
                {(["stars", "forks", "issues", "watchers"] as const).map((k) => (
                  <div key={k} className="flex flex-col-reverse gap-0.5">
                    <dt className="font-mono text-[10.5px] tracking-[.08em] text-[#8E8A80]">{k.toUpperCase()}</dt>
                    <dd className="m-0 font-mono text-[19px] leading-none font-medium tracking-[-.02em] tabular-nums">{repo ? fmt(repo[k]) : "—"}</dd>
                  </div>
                ))}
              </dl>
              <span className="truncate font-mono text-[11.5px] text-[#A9A59B]">
                {repo
                  ? [
                      `pushed ${ago(repo.pushed, now)}`,
                      contribs ? `${contribs.length}${contribs.length >= 30 ? "+" : ""} contributors` : null,
                      [repo.lang, repo.license].filter(Boolean).join(" · "),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : live.errors.repo === "rate"
                    ? "GitHub rate limit reached. Stats will refresh later."
                    : live.errors.repo
                      ? "Couldn’t load repository stats."
                      : "reading repository…"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

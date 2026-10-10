import { useEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "@/lib/gsap";
import { ago, COLORS, destOf, fmt } from "@/lib/roadmap/derive";
import type { Milestone } from "@/lib/roadmap/parse";
import type { RoadmapLive } from "./use-roadmap-live";

gsap.registerPlugin(ScrollTrigger);

const LEVELS = 8;
const ACT_MSG: Record<RoadmapLive["actState"], string> = {
  computing: "GitHub is computing activity stats…",
  auth: "GitHub rejected the token (401).",
  forbidden: "GitHub denied access to activity data.",
  rate: "GitHub rate limit reached",
  http: "activity unavailable",
  ok: "no commits in this window",
} as const;
const COMMIT_ERR: Record<NonNullable<RoadmapLive["errors"]["commits"]>, string> = {
  auth: "GitHub rejected the token (401). Check that it is current.",
  forbidden: "GitHub denied access. Check the token’s repository permissions.",
  rate: "GitHub rate limit reached. Commits will refresh later.",
  http: "Recent commits are unavailable right now.",
  computing: "GitHub is preparing recent activity.",
};

const head = "font-mono text-[11px] tracking-[.16em] text-[#8E8A80]";

/** "The hive, this year": commit cadence as a pixel equaliser, the contributors, and the live bee log. */
export function Pulse({ live, milestones, reducedMotion }: { live: RoadmapLive; milestones: Milestone[]; reducedMotion: boolean }) {
  const { activity, actState, contribs, commits, now } = live;
  const commitsErr = live.errors.commits ? COMMIT_ERR[live.errors.commits] : null;
  const eq = useRef<HTMLDivElement>(null);
  const weeks = (activity ?? []).slice(-52);
  const max = Math.max(1, ...weeks.map((w) => w.t));
  const total = (activity ?? []).reduce((a, b) => a + b.t, 0);
  const hasAct = actState === "ok" && weeks.length > 0;
  const summary = hasAct ? `${fmt(total)} commits in 52 weeks · busiest week ${max}` : "—";
  const cur = milestones.find((m) => m.status === "current");

  useEffect(() => {
    const el = eq.current;
    if (!el || reducedMotion) return;
    const t = gsap.from(el.querySelectorAll("[data-eq]"), {
      scaleY: 0,
      transformOrigin: "50% 100%",
      duration: 0.5,
      ease: `steps(${LEVELS})`,
      stagger: 0.012,
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
    return () => void t.scrollTrigger?.kill();
  }, [hasAct, reducedMotion]);

  return (
    <section className="mx-auto max-w-[1440px] px-[clamp(20px,3vw,32px)] pt-[clamp(64px,8vw,104px)]" aria-labelledby="pulse-title">
      <div data-reveal className="mb-7 flex flex-col gap-2.5">
        <div className="font-mono text-xs tracking-[.22em] text-[#A9A59B]">PULSE</div>
        <h2 id="pulse-title" className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.05] font-medium tracking-[-.035em]">
          The hive, this year.
        </h2>
      </div>

      <div className="grid gap-px border border-bone/[.08] bg-bone/[.08] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Cadence + contributors */}
        <div data-reveal className="flex min-w-0 flex-col gap-5 bg-[#181817] p-[clamp(18px,2.4vw,28px)]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <span className={head}>
              COMMITS PER WEEK · <span className="md:hidden">26</span>
              <span className="max-md:hidden">52</span> WEEKS
            </span>
            <span className="font-mono text-xs text-[#C9C5BB]">{summary}</span>
          </div>
          {hasAct ? (
            <div
              ref={eq}
              role="img"
              aria-label={summary}
              className="grid h-[clamp(96px,12vw,136px)] grid-flow-col items-end gap-[2px] [grid-auto-columns:minmax(0,1fr)] max-md:[&>*:nth-child(-n+26)]:hidden"
            >
              {weeks.map((w) => {
                const lv = w.t ? Math.max(1, Math.ceil((w.t / max) * LEVELS)) : 0;
                return (
                  <span
                    key={w.week}
                    data-eq
                    title={`${new Date(w.week * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${w.t} commits`}
                    className="flex h-full flex-col-reverse gap-[2px]"
                  >
                    {Array.from({ length: LEVELS }, (_, k) => {
                      const l = k + 1;
                      const c = l <= lv ? (l >= 7 ? COLORS.honey : l >= 4 ? COLORS.shipped : "#8A6424") : "rgba(237,234,227,.05)";
                      return <span key={k} className="flex-1" style={{ background: c }} />;
                    })}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[clamp(96px,12vw,136px)] items-center justify-center border border-dashed border-bone/12 font-mono text-xs text-[#8E8A80]">
              {ACT_MSG[actState]}
            </div>
          )}
          <div className="mt-auto flex flex-col gap-3 border-t border-bone/[.07] pt-4">
            <span className={head}>
              CONTRIBUTORS{contribs ? ` · ${contribs.length}${contribs.length >= 30 ? "+" : ""}` : ""}
            </span>
            {!contribs && <span className="font-mono text-xs text-[#8E8A80]">unavailable right now</span>}
            <div className="grid grid-cols-[repeat(auto-fill,36px)] gap-1.5">
              {(contribs ?? []).slice(0, 24).map((c) => (
                <a
                  key={c.login}
                  href={c.url}
                  target="_blank"
                  rel="noopener"
                  title={`${c.login} · ${c.n} commits`}
                  className="block size-9 border border-bone/10 bg-[#33322E] transition-colors hover:border-honey"
                >
                  <img src={c.avatar} alt={c.login} width={36} height={36} loading="lazy" className="pixelated block size-full grayscale-[.35]" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bee log */}
        <div data-reveal className="flex min-w-0 flex-col bg-[#181817] p-[clamp(18px,2.4vw,28px)]">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <span className={head}>BEE LOG · MAIN</span>
            <span className="font-mono text-[11px] text-[#8E8A80]">checked every 5 min</span>
          </div>
          {commits === null && !commitsErr && <div className="py-3.5 font-mono text-[12.5px] text-[#8E8A80]">fetching commits…</div>}
          {commitsErr && <div className="py-3.5 font-mono text-[12.5px] text-[#FF8A7A]">{commitsErr}</div>}
          {(commits ?? []).slice(0, 8).map((c, i) => {
            const d = destOf(c, milestones);
            return (
              <a
                key={c.sha}
                href={c.url}
                target="_blank"
                rel="noopener"
                className="grid grid-cols-[18px_60px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-bone/[.06] py-2.5 text-bone hover:text-honey sm:grid-cols-[18px_60px_minmax(0,1fr)_auto]"
              >
                <img src="/brand/mascot/hive-agent.svg" alt="" className="pixelated h-[13px] w-auto" style={{ opacity: Math.max(0.35, 1 - i * 0.08) }} />
                <span className="font-mono text-xs text-honey">{c.sha.slice(0, 7)}</span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="truncate text-sm">{c.msg}</span>
                  <span className="font-mono text-[11px] text-[#8E8A80]">
                    {c.author} · {ago(c.date, now)}
                  </span>
                </span>
                <span
                  title={d.why}
                  className="font-mono text-[11px] whitespace-nowrap max-sm:col-start-3"
                  style={{ color: cur && d.id === cur.id ? COLORS.honey : "#A9A59B" }}
                >
                  → {d.id}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

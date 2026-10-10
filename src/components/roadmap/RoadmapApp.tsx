import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ago } from "@/lib/roadmap/derive";
import { ROADMAP_EDIT } from "@/lib/roadmap/github";
import { plain } from "@/lib/roadmap/parse";
import { REPO } from "@/lib/site";
import { FlightPath } from "./FlightPath";
import { MilestoneDetail } from "./MilestoneDetail";
import { Pulse } from "./Pulse";
import { RoadmapHero } from "./RoadmapHero";
import { SectionHead } from "./SectionHead";
import { useRoadmapLive, type RoadmapInitial } from "./use-roadmap-live";

gsap.registerPlugin(ScrollTrigger);

const HEX = "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)";

/**
 * /roadmap: Hive's ROADMAP.md as a living comb. Server-rendered from data
 * baked in at build time; in the browser it re-reads the file (on load and
 * three times a day) and keeps commits and repo stats fresh.
 */
export default function RoadmapApp({ initial }: { initial: RoadmapInitial }) {
  const live = useRoadmapLive(initial);
  const reducedMotion = useReducedMotion();
  const { rm, sync, checkedAt, now, fileCommit, toast, syncing, syncError } = live;
  const ms = rm.milestones;
  const cur = ms.find((m) => m.status === "current") ?? ms[0];
  const [sel, setSel] = useState<string | null>(cur?.id ?? null);
  const selM = ms.find((m) => m.id === sel) ?? cur;
  const later = ms.find((m) => m.status === "later");
  const root = useRef<HTMLDivElement>(null);

  // Keep the selection valid if the roadmap is redrawn.
  useEffect(() => {
    if (sel && !ms.some((m) => m.id === sel)) setSel(cur?.id ?? null);
  }, [ms, sel, cur]);

  const SYNC: Record<typeof sync, [string, string, string]> = {
    live: [`synced · ${ago(checkedAt, now)}`, "#F5B942", "Read from main on the server, three times a day."],
    stale: [`last good read ${ago(checkedAt, now)}`, "#FF9F43", "The latest refresh failed. Showing the last version that loaded."],
    snapshot: ["offline · snapshot", "#FF8A7A", "GitHub was unreachable. Showing the bundled snapshot of ROADMAP.md."],
    partial: ["partially synced", "#FF9F43", "Some GitHub data could not be refreshed. Showing available data."],
  };
  const [syncLabel, syncColor, syncLong] = SYNC[sync];

  const openCurrent = () => {
    if (cur) setSel(cur.id);
    requestAnimationFrame(() => {
      const el = document.getElementById("detail");
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 64, behavior: reducedMotion ? "auto" : "smooth" });
    });
  };

  // Below-the-fold sections settle in as they arrive.
  useEffect(() => {
    if (reducedMotion || !root.current) return;
    const items = [...root.current.querySelectorAll<HTMLElement>("main [data-reveal]")].filter((e) => e.getBoundingClientRect().top > innerHeight * 0.92);
    gsap.set(items, { autoAlpha: 0, y: 14 });
    const triggers = ScrollTrigger.batch(items, {
      start: "top 92%",
      once: true,
      onEnter: (b) => gsap.to(b, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "power2.out", overwrite: true }),
    });
    return () => {
      triggers.forEach((t) => t.kill());
      gsap.set(items, { clearProps: "opacity,visibility,transform" });
    };
  }, [reducedMotion]);

  return (
    <div ref={root} className="min-h-screen overflow-x-clip bg-[#0F0F0E] font-sans text-[16px] leading-normal text-bone">
      <header className="sticky top-0 z-40 h-14 border-b border-bone/[.06] bg-[#0f0f0e]/85 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-[clamp(16px,3vw,32px)]">
          <a href="/" aria-label="Hive" className="flex flex-none items-center gap-2.5">
            <img src="/brand/logo/hive-mark-dark.svg" alt="" className="pixelated h-5 w-auto" />
            <img src="/brand/logo/hive-wordmark-dark.svg" alt="hive" className="pixelated h-4 w-auto" />
          </a>
          <span className="font-mono text-[13px] text-[#8E8A80]">/</span>
          <span className="font-mono text-[13px]">roadmap</span>
          <span className="flex-1" />
          <nav aria-label="Primary" className="flex items-center gap-1 font-mono text-[12.5px]">
            <span className="flex max-md:hidden">
              <a href="/" className="px-2.5 py-2 text-[#A9A59B] hover:text-bone">
                site
              </a>
              <a href="/docs/" className="px-2.5 py-2 text-[#A9A59B] hover:text-bone">
                docs
              </a>
              <a href={REPO} target="_blank" rel="noopener" className="px-2.5 py-2 text-[#A9A59B] hover:text-bone">
                github ↗
              </a>
            </span>
            <span
              role="status"
              title={syncLong}
              className="ml-2 flex h-[30px] items-center gap-2 border border-bone/[.09] bg-bone/5 px-2.5 text-[11.5px] whitespace-nowrap text-[#C9C5BB]"
            >
              <span className="size-1.5" style={{ background: syncColor }} />
              {syncLabel}
            </span>
          </nav>
        </div>
      </header>

      <RoadmapHero live={live} sel={selM?.id ?? null} onSelect={setSel} onOpenCurrent={openCurrent} reducedMotion={reducedMotion} />

      <main>
        <FlightPath milestones={ms} sel={selM?.id ?? null} onSelect={setSel} intro={rm.intro} signals={live.signals} reducedMotion={reducedMotion} />
        <MilestoneDetail m={selM} signals={live.signals} signalsErr={!!live.errors.signals} reducedMotion={reducedMotion} />
        <Pulse live={live} milestones={ms} reducedMotion={reducedMotion} />

        {later && (
          <section className="mx-auto max-w-[1440px] px-[clamp(20px,3vw,32px)] pt-[clamp(72px,9vw,120px)]">
            <SectionHead index="04" eyebrow="WISHLIST" title="After 1.0, on the wishlist.">
              {later.blurb.replace(/:$/, ".")}
            </SectionHead>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-px border border-bone/[.07] bg-bone/[.07] p-0">
              {later.items.map((it) => (
                <li key={it.title} data-reveal className="group flex items-start gap-3 bg-[#121211] px-4 py-3.5 transition-colors hover:bg-[#161615]">
                  <span className="mt-[5px] h-[11px] w-2.5 flex-none bg-[#4A4842] transition-colors group-hover:bg-honey/70" style={{ clipPath: HEX }} />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[14.5px] text-[#D6D2C8]">{plain(it.title)}</span>
                    {it.desc && <span className="text-[13px] leading-[1.5] text-[#8E8A80]">{plain(it.desc)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mx-auto max-w-[1440px] px-[clamp(20px,3vw,32px)] pt-[clamp(72px,9vw,120px)] pb-[clamp(72px,9vw,112px)]">
          <SectionHead index="05" eyebrow="SYNC" title="Autosynced with ROADMAP.md." />
          <div data-reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-x-16 gap-y-8">
            <div className="flex flex-col gap-4">
              <p className="m-0 max-w-[540px] text-[15px] leading-[1.7] text-pretty text-[#A9A59B]">
                There's no second roadmap to keep in step. The server reads ROADMAP.md from main three times a day and serves
                this page from cache in between. Commits, stats and the source tree come through the same server, so your browser
                never talks to GitHub directly.
              </p>
              <p className="m-0 max-w-[540px] text-[15px] leading-[1.7] text-pretty text-[#A9A59B]">
                Item signals come from the source tree: when a package an item names exists on main, it gets a mark. A mark means
                code exists, not that the item is done. <span className="text-[#D6D2C8]">Acceptance criteria decide that.</span>
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => void live.refresh(true)}
                  disabled={syncing}
                  aria-busy={syncing}
                  className="flex h-10 cursor-pointer items-center gap-2 border border-bone/10 bg-bone/[.05] px-4 text-[14.5px] text-bone transition-colors hover:border-bone/20 hover:bg-bone/10 disabled:cursor-wait disabled:opacity-70"
                >
                  {syncing ? (
                    <span aria-hidden="true" className="size-3 animate-spin rounded-full border border-bone/25 border-t-honey" />
                  ) : (
                    <span aria-hidden="true" className="size-1.5 bg-honey" />
                  )}
                  {syncing ? "Syncing…" : "Sync now"}
                </button>
                <a href={ROADMAP_EDIT} target="_blank" rel="noopener" className="flex h-10 items-center px-2 text-[14.5px] text-[#A9A59B] hover:text-bone">
                  Propose a change ↗
                </a>
              </div>
              {syncError && (
                <p role="status" aria-live="polite" className="m-0 max-w-[540px] border-l-2 border-[#FF9F43]/60 pl-3 text-[13px] leading-[1.6] text-[#C9A77F]">
                  {syncError}
                </p>
              )}
            </div>
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] content-start border border-bone/[.07] bg-[#121211] px-5 py-2 font-mono text-[12.5px] [&>*]:border-b [&>*]:border-bone/[.06] [&>*]:py-2.5 [&>dd]:m-0 [&>dd]:text-[#C9C5BB] [&>dt]:pr-6 [&>dt]:text-[#8E8A80]">
              <dt>source</dt>
              <dd className="[overflow-wrap:anywhere]">admirable-oss/hive · main · ROADMAP.md</dd>
              <dt>file changed</dt>
              <dd>{fileCommit ? `${ago(fileCommit.date, now)} · ${fileCommit.sha.slice(0, 7)}` : "—"}</dd>
              <dt>last read</dt>
              <dd>{ago(checkedAt, now)}</dd>
              <dt>status</dt>
              <dd className="flex items-center gap-2" style={{ color: syncColor }}>
                <span className="size-1.5 flex-none" style={{ background: syncColor }} />
                {syncLong}
              </dd>
              <dt className="!border-b-0">in production</dt>
              <dd className="!border-b-0 font-sans text-[13.5px] leading-[1.6] !text-[#A9A59B]">
                Served from Vercel's edge cache and regenerated every eight hours. A server action refreshes commits and stats
                every few minutes from one shared, token-authenticated cache.
              </dd>
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-bone/[.06]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[clamp(20px,3vw,32px)] py-6 text-[13.5px] text-[#8E8A80]">
          <div className="flex items-center gap-3">
            <img src="/brand/logo/hive-wordmark-dark.svg" alt="hive" className="pixelated h-4 w-auto" />
            <span>The hive keeps going.</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-[22px] gap-y-2 font-mono text-[12.5px]">
            <a href="/docs/" className="text-[#8E8A80] hover:text-bone">
              docs
            </a>
            <a href={REPO} target="_blank" rel="noopener" className="text-[#8E8A80] hover:text-bone">
              github ↗
            </a>
            <a href={`${REPO}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener" className="text-[#8E8A80] hover:text-bone">
              contributing ↗
            </a>
            <span>Apache-2.0</span>
          </nav>
        </div>
      </footer>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] flex max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 border-t border-bone/18 bg-[#33322E] px-4 py-3 font-mono text-[12.5px] text-bone"
        >
          <span className="size-1.5 flex-none bg-honey" />
          {toast}
        </div>
      )}
    </div>
  );
}

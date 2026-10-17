import { useLayoutEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "cn";
import { SectionHead } from "@/components/roadmap/SectionHead";
import { CopyCommand } from "@/components/shared/CopyCommand";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { gsap } from "@/lib/gsap";
import { LICENSE_LABEL, LINKS, REPO } from "@/lib/site";
import { PricingStage } from "./scene/PricingStage";
import type { Plan } from "./scene/PricingScene";

gsap.registerPlugin(ScrollTrigger);

const HEX = "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)";
const label = "font-mono text-[11px] tracking-[.16em] text-[#8E8A80]";

const SELF_FEATURES = [
  ["Persistent runtimes", "Terminal, workspace and context survive disconnects, reboots and closed laptops."],
  ["Unlimited agents & machines", "No seats, no caps. Run as many bees as your hardware feeds."],
  ["Any CLI agent", "claude, codex, opencode, or whatever you run in a terminal."],
  ["Hive RC over SSH", "Drive agents on another box with the keys you already have."],
  ["Plugins, App Store & socket API", "Extend the hive and script it from anywhere."],
] as const;

const CLOUD_FEATURES = [
  ["Managed hives", "Nothing to install, patch or keep awake."],
  ["Always-on, off your laptop", "Agents keep working on our metal while yours sleeps."],
  ["Team workspaces", "Shared sessions, handoffs and an Overview for the whole crew."],
  ["Priority support", "A direct line when a bee goes quiet."],
] as const;

const COMPARE: [string, string, string][] = [
  ["Price", "$0, forever", "To be announced"],
  ["License", `${LICENSE_LABEL}, open source`, "Hosted service"],
  ["Where agents run", "Your machines", "Hive-managed infrastructure"],
  ["Agents & machines", "Unlimited", "Plan-based"],
  ["Persistent sessions", "✓", "✓"],
  ["Remote control", "✓ over SSH", "✓ in the browser"],
  ["Browser & phone monitoring", "✓ read-only web observer", "✓"],
  ["Plugins & App Store", "✓", "✓"],
  ["Support", "Community, on GitHub", "Priority"],
  ["Availability", "Now · macOS, Linux & Windows", "Coming soon"],
];

const FAQ = [
  [
    "Is self-hosted really free forever?",
    `Yes. Hive is ${LICENSE_LABEL} and the self-hosted runtime is the whole product, not a trial. There's no account, no telemetry gate and no feature that switches off after 14 days.`,
  ],
  [
    "Do I need an account to use Hive?",
    "No. Install it with one command and it runs on your machine. Your code, keys and agent transcripts never leave hardware you control.",
  ],
  [
    "What will Hive Cloud cost?",
    "We haven't set a price yet. When Cloud opens it will be listed here first, and the release notes on GitHub will say so too.",
  ],
  [
    "Will Cloud change anything about self-hosted?",
    "No. Cloud is the same open-source hive run for you. Self-hosted stays free, complete and first in line for every feature.",
  ],
] as const;

function Check({ locked }: { locked?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mt-[5px] h-[11px] w-2.5 flex-none transition-colors", locked ? "bg-[#3E3C37]" : "bg-honey")}
      style={{ clipPath: HEX }}
    />
  );
}

/** A 9×9 pixel padlock, the same bitmap the scene builds in voxels. */
function PadlockGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 9 9" aria-hidden="true" shapeRendering="crispEdges" className={cn("pixelated", className)} fill="currentColor">
      <path d="M2 0h5v1H2zM1 1h2v1H1zM6 1h2v1H6zM1 2h1v2H1zM7 2h1v2H7zM0 4h9v5H0z" />
      <path d="M3 5h3v1H3zM4 6h1v2H4z" fill="#141412" />
    </svg>
  );
}

interface CardProps {
  focus: Plan | null;
  onFocus: (plan: Plan | null) => void;
}

function SelfHostedCard({ focus, onFocus }: CardProps) {
  const on = focus === "self";
  return (
    <article
      data-hero
      aria-labelledby="plan-self"
      onPointerEnter={() => onFocus("self")}
      onPointerLeave={() => onFocus(null)}
      onFocus={() => onFocus("self")}
      onBlur={() => onFocus(null)}
      className={cn(
        "relative flex min-w-0 flex-col border bg-[#121211]/80 shadow-[0_24px_60px_-30px_rgba(0,0,0,.9)] backdrop-blur-md transition-colors duration-300",
        on ? "border-honey/45" : "border-bone/[.09]",
      )}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-honey to-transparent" />
      <div className="flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className={label}>01 · SELF-HOSTED</span>
          <span className="flex items-center gap-2 border border-honey/40 bg-honey/[.08] px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] text-honey">
            <span className="size-1.5 bg-honey" />
            OPEN SOURCE
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 id="plan-self" className="m-0 text-[22px] leading-tight font-medium tracking-[-.02em]">
            Your hive, your metal
          </h3>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[56px] leading-none font-medium tracking-[-.05em] tabular-nums">$0</span>
            <span className="text-[15px] text-[#A9A59B]">free forever</span>
          </div>
          <p className="m-0 max-w-[440px] text-[14.5px] leading-[1.6] text-pretty text-[#A9A59B]">
            The whole runtime, {LICENSE_LABEL}. Install it on a laptop, a build box or a rack, and keep every agent running.
          </p>
        </div>
        <CopyCommand size="md" className="w-full" />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
          <a href={`${LINKS.docs}/getting-started/installation/`} className="font-medium text-bone hover:text-honey">
            Installation guide <span aria-hidden="true">→</span>
          </a>
          <a href={REPO} target="_blank" rel="noopener" className="text-[#A9A59B] hover:text-bone">
            Star on GitHub ↗
          </a>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3.5 border-t border-bone/[.07] p-5 sm:px-7 sm:py-6">
        {SELF_FEATURES.map(([t, d]) => (
          <li key={t} className="flex items-start gap-3">
            <Check />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14.5px] text-[#E2DED5]">{t}</span>
              <span className="text-[13px] leading-[1.5] text-[#8E8A80]">{d}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function CloudCard({ focus, onFocus }: CardProps) {
  const on = focus === "cloud";
  return (
    <article
      data-hero
      aria-labelledby="plan-cloud"
      aria-describedby="plan-cloud-status"
      onPointerEnter={() => onFocus("cloud")}
      onPointerLeave={() => onFocus(null)}
      onFocus={() => onFocus("cloud")}
      onBlur={() => onFocus(null)}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden border bg-[#111110]/80 shadow-[0_24px_60px_-30px_rgba(0,0,0,.9)] backdrop-blur-md transition-colors duration-300",
        on ? "border-bone/25" : "border-bone/[.07]",
      )}
    >
      {/* Locked: hatched, scanlined, a touch dimmer than the plan you can have today. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(237,234,227,.025)_0_1px,transparent_1px_9px)]" />
      <div aria-hidden="true" className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className={label}>02 · HIVE CLOUD</span>
          <span
            id="plan-cloud-status"
            className="flex items-center gap-2 border border-bone/15 bg-bone/[.04] px-2 py-0.5 font-mono text-[10.5px] tracking-[.14em] text-[#C9C5BB]"
          >
            <PadlockGlyph className="size-2.5 text-[#A9A59B]" />
            COMING SOON
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 id="plan-cloud" className="m-0 text-[22px] leading-tight font-medium tracking-[-.02em] text-[#C9C5BB]">
            A hive we keep running
          </h3>
          <div className="flex items-baseline gap-3">
            <span aria-label="Price to be announced" className="relative font-mono text-[56px] leading-none font-medium tracking-[-.05em] text-[#4A4842] select-none">
              <span aria-hidden="true" className="blur-[6px]">
                $00
              </span>
              <PadlockGlyph className="absolute top-1/2 left-1/2 size-6 -translate-1/2 text-[#8E8A80]" />
            </span>
            <span className="text-[15px] text-[#8E8A80]">pricing TBA</span>
          </div>
          <p className="m-0 max-w-[440px] text-[14.5px] leading-[1.6] text-pretty text-[#8E8A80]">
            The same open-source hive, managed for you and your team. Sealed in wax until it's ready.
          </p>
        </div>
        <div className="flex h-13 items-center justify-between gap-3 border border-dashed border-bone/12 pr-1.5 pl-4 font-mono text-[13px] text-[#6E6B63]">
          <span className="flex items-center gap-2.5 truncate">
            <PadlockGlyph className="size-3 flex-none" />
            hive cloud · locked
          </span>
          <button
            type="button"
            disabled
            className="h-9.5 cursor-not-allowed bg-[#1C1C1A] px-3 font-mono text-[11px] tracking-[.16em] text-[#6E6B63]"
          >
            SOON
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">
          <a href={LINKS.changelog} target="_blank" rel="noopener" className="font-medium text-[#C9C5BB] hover:text-honey">
            Watch releases for the launch ↗
          </a>
          <a href={LINKS.roadmap} className="text-[#8E8A80] hover:text-bone">
            Roadmap <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
      <ul className="relative m-0 flex list-none flex-col gap-3.5 border-t border-bone/[.06] p-5 sm:px-7 sm:py-6">
        {CLOUD_FEATURES.map(([t, d]) => (
          <li key={t} className="flex items-start gap-3">
            <Check locked />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14.5px] text-[#A9A59B]">{t}</span>
              <span className="text-[13px] leading-[1.5] text-[#6E6B63]">{d}</span>
            </span>
          </li>
        ))}
        <li className="pt-1 font-mono text-[11px] tracking-[.06em] text-[#6E6B63]">Planned. Details may change before launch.</li>
      </ul>
    </article>
  );
}

/** /pricing: two plans over two combs. One you run today, free forever; one still sealed. */
export default function PricingApp() {
  const reducedMotion = useReducedMotion();
  const [focus, setFocus] = useState<Plan | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reveal = [...el.querySelectorAll<HTMLElement>("main [data-reveal]")];
    if (reducedMotion) {
      gsap.set(reveal, { autoAlpha: 1 });
      return () => gsap.set(reveal, { clearProps: "opacity,visibility" });
    }
    const ctx = gsap.context(() => {
      gsap.from("[data-hero]", { y: 16, autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: "power3.out", delay: 0.1 });
    }, el);
    // Sections settle in as they arrive; ones already on screen settle straight away.
    gsap.set(reveal, { autoAlpha: 0, y: 14 });
    const triggers = ScrollTrigger.batch(reveal, {
      start: "top 92%",
      once: true,
      onEnter: (b) => gsap.to(b, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: "power2.out", overwrite: true }),
    });
    return () => {
      ctx.revert();
      triggers.forEach((t) => t.kill());
      gsap.set(reveal, { clearProps: "opacity,visibility,transform" });
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
          <span className="font-mono text-[13px]">pricing</span>
          <span className="flex-1" />
          <nav aria-label="Primary" className="flex items-center gap-1 font-mono text-[12.5px]">
            <span className="flex max-md:hidden">
              <a href="/" className="px-2.5 py-2 text-[#A9A59B] hover:text-bone">
                site
              </a>
              <a href={`${LINKS.docs}/`} className="px-2.5 py-2 text-[#A9A59B] hover:text-bone">
                docs
              </a>
              <a href={LINKS.roadmap} className="px-2.5 py-2 text-[#A9A59B] hover:text-bone">
                roadmap
              </a>
              <a href={REPO} target="_blank" rel="noopener" className="px-2.5 py-2 text-[#A9A59B] hover:text-bone">
                github ↗
              </a>
            </span>
            <span className="ml-2 flex h-[30px] items-center gap-2 border border-bone/[.09] bg-bone/5 px-2.5 text-[11.5px] whitespace-nowrap text-[#C9C5BB]">
              <span className="size-1.5 bg-honey" />
              {LICENSE_LABEL}
            </span>
          </nav>
        </div>
      </header>

      <section
        id="top"
        className="relative overflow-hidden border-b border-bone/[.06] bg-[radial-gradient(ellipse_95%_80%_at_50%_30%,#1E1E1C_0%,#151514_52%,#0C0C0B_100%)]"
      >
        <div className="relative mx-auto flex max-w-[1440px] flex-col px-[clamp(20px,3vw,32px)] pb-[clamp(48px,6vw,80px)]">
          <div className="relative z-[2] flex flex-col items-center gap-[18px] pt-10 text-center lg:pt-14">
            <div data-hero className="flex items-center gap-3 font-mono text-xs tracking-[.22em] text-[#A9A59B]">
              <span className="size-2 bg-honey" />
              PRICING · TWO PLANS, ONE HIVE
            </div>
            <h1 data-hero className="m-0 text-[clamp(44px,5.6vw,80px)] leading-[.98] font-medium tracking-[-.045em] text-balance">
              Free where it runs<span className="text-honey">.</span>
            </h1>
            <p data-hero className="m-0 max-w-[540px] text-[clamp(16px,1.3vw,17.5px)] leading-[1.6] text-pretty text-[#C9C5BB]">
              Self-host the whole hive for nothing, for good. A managed cloud is on its way. Until then it stays sealed.
            </p>
          </div>

          {/* The two combs: one per plan, sitting over its card. */}
          <div className="relative -mx-[clamp(20px,3vw,32px)] h-[clamp(260px,38vw,500px)]">
            <PricingStage focus={focus} onFocus={setFocus} reducedMotion={reducedMotion} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(transparent,rgba(16,16,15,.9))]" />
          </div>

          <div className="relative z-[2] -mt-[clamp(32px,5vw,72px)] grid gap-4 md:grid-cols-2 lg:gap-6">
            <SelfHostedCard focus={focus} onFocus={setFocus} />
            <CloudCard focus={focus} onFocus={setFocus} />
          </div>
        </div>
      </section>

      <main>
        <section className="mx-auto max-w-[1440px] px-[clamp(20px,3vw,32px)] pt-[clamp(72px,9vw,120px)]">
          <SectionHead index="01" eyebrow="COMPARE" title="Same hive, two ways to run it.">
            Cloud is the open-source runtime, hosted. Everything in the left column ships today.
          </SectionHead>
          <div data-reveal className="overflow-x-auto border border-bone/[.07] bg-[#121211]">
            <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-bone/[.08] font-mono text-[11px] tracking-[.16em] text-[#8E8A80]">
                  <th scope="col" className="w-[34%] px-5 py-3.5 font-normal">
                    &nbsp;
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-normal text-honey">
                    SELF-HOSTED
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-normal">
                    <span className="flex items-center gap-2">
                      <PadlockGlyph className="size-2.5" />
                      CLOUD · SOON
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([k, a, b]) => (
                  <tr key={k} className="border-b border-bone/[.06] last:border-b-0 hover:bg-bone/[.015]">
                    <th scope="row" className="px-5 py-3 font-mono text-[12.5px] font-normal text-[#8E8A80]">
                      {k}
                    </th>
                    <td className="px-5 py-3 text-[#E2DED5]">{a}</td>
                    <td className="px-5 py-3 text-[#6E6B63]">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-[clamp(20px,3vw,32px)] pt-[clamp(72px,9vw,120px)] pb-[clamp(72px,9vw,112px)]">
          <SectionHead index="02" eyebrow="QUESTIONS" title="The small print, in large type." />
          <div className="grid gap-px border border-bone/[.07] bg-bone/[.07] md:grid-cols-2">
            {FAQ.map(([q, a]) => (
              <details key={q} data-reveal className="group bg-[#121211] px-5 py-4 open:bg-[#141413] [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15.5px] text-[#E2DED5] outline-none focus-visible:text-honey">
                  {q}
                  <span aria-hidden="true" className="mt-0.5 font-mono text-[13px] text-[#8E8A80] group-open:text-honey">
                    <span className="group-open:hidden">+</span>
                    <span className="hidden group-open:inline">−</span>
                  </span>
                </summary>
                <p className="m-0 max-w-[560px] pt-3 text-[14.5px] leading-[1.65] text-pretty text-[#A9A59B]">{a}</p>
              </details>
            ))}
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
            <a href={`${LINKS.docs}/`} className="text-[#8E8A80] hover:text-bone">
              docs
            </a>
            <a href={LINKS.roadmap} className="text-[#8E8A80] hover:text-bone">
              roadmap
            </a>
            <a href={REPO} target="_blank" rel="noopener" className="text-[#8E8A80] hover:text-bone">
              github ↗
            </a>
            <span>{LICENSE_LABEL}</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "cn";
import {
  IconGitBranch,
  IconGripVertical,
  IconLayoutSidebar,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";
import { Logo } from "@/components/brand/Logo";
import { useRuntimeDemo } from "@/hooks/use-runtime-demo";
import type { HeroSignals } from "@/lib/hero-signals";
import { AgentLines } from "./AgentPane";
import { DEMO } from "./script";
import { TestLines } from "./TestPane";

interface DesktopDemoProps {
  signals: HeroSignals;
  reducedMotion: boolean;
  introAt: number | null;
  className?: string;
  style?: CSSProperties;
}

const BRANCH = "feat/redis-sessions";
const TABS = [
  { id: "1", label: "shell", active: false },
  { id: "2", label: "claude · bun", active: true },
] as const;

/** Close · minimise · zoom, at their real size and inset. */
const TrafficLights = ({ className }: { className?: string }) => (
  <span className={cn("flex flex-none items-center gap-2", className)}>
    {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
      <span
        key={c}
        className="size-3 rounded-full shadow-[inset_0_0_0_.5px_rgb(0_0_0/.22),inset_0_1px_0_rgb(255_255_255/.18)]"
        style={{ background: c }}
      />
    ))}
  </span>
);

const SectionLabel = ({ children, aside }: { children: ReactNode; aside?: ReactNode }) => (
  <div className="flex items-center justify-between px-2.5 pt-4 pb-1 text-[11px] font-semibold text-[#EDEAE3]/45">
    {children}
    {aside}
  </div>
);

const Glyph = ({ glyph, rt }: { glyph: string; rt?: string }) => (
  <span
    data-rt={rt}
    className={cn(
      "w-3 flex-none text-center font-mono text-[10px] leading-none",
      glyph === "●" ? "text-[#9CC08A]" : glyph === "◆" ? "text-honey" : "text-ash",
    )}
  >
    {glyph}
  </span>
);

/** Translucent source list: who needs you, then environments and their tabs. */
function Sidebar() {
  const [active, setActive] = useState<string>("auth");

  return (
    <aside className="flex w-59 flex-none flex-col border-r border-black/70 bg-[linear-gradient(180deg,#2C2B29_0%,#252422_55%,#222120_100%)] shadow-[inset_-1px_0_0_rgb(255_255_255/.04)] @max-2xl:hidden">
      <div className="flex h-13 flex-none items-center justify-between pr-3 pl-5">
        <TrafficLights />
        <IconLayoutSidebar aria-hidden stroke={1.6} className="size-4 text-[#EDEAE3]/45" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2.5">
        <SectionLabel
          aside={
            <span data-rt="needs-count" className="min-w-4 rounded-full bg-honey px-1.25 text-center text-[10px] leading-4 font-semibold text-ink">
              1
            </span>
          }
        >
          Needs you
        </SectionLabel>
        <div className="flex items-start gap-2.5 rounded-md px-2.5 py-1.5">
          <span className="mt-1 size-2 flex-none rounded-full bg-honey shadow-[0_0_0_3px_rgb(245_185_66/.18)]" />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] text-[#EDEAE3]">billing-sync</span>
              <span className="flex-none text-[11px] text-[#EDEAE3]/40">2m</span>
            </span>
            <span className="block truncate text-[11px] text-[#EDEAE3]/50">codex · wants approval</span>
          </span>
        </div>

        <SectionLabel aside={<IconPlus aria-hidden stroke={1.8} className="size-3.5 text-[#EDEAE3]/40" />}>
          Environments
        </SectionLabel>
        <ul className="m-0 flex list-none flex-col gap-px p-0">
          {DEMO.cells.map((c) => {
            const on = c.id === active;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  tabIndex={-1}
                  data-mascot-target={`cell:${c.id}`}
                  onClick={() => setActive(c.id)}
                  className={cn(
                    "flex w-full cursor-default items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left",
                    on ? "bg-white/[.09] shadow-[inset_0_.5px_0_rgb(255_255_255/.06)]" : "hover:bg-white/[.04]",
                  )}
                >
                  <Glyph glyph={c.glyph} rt={c.id === "auth" ? "cell-auth-glyph" : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[#EDEAE3]">{c.name}</span>
                    <span
                      data-rt={c.id === "auth" ? "cell-auth-detail" : undefined}
                      className="flex items-center gap-1 truncate text-[11px] text-[#EDEAE3]/50"
                    >
                      {c.id !== "auth" && <IconGitBranch aria-hidden stroke={1.8} className="size-3 flex-none" />}
                      {c.detail}
                    </span>
                  </span>
                </button>
                {c.id === "auth" && (
                  <div className="ml-6.5 flex flex-col gap-px border-l border-white/[.08] py-1 pl-2.5">
                    {TABS.map((t) => (
                      <span
                        key={t.id}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-1 text-[12px]",
                          t.active ? "bg-honey/[.13] text-[#EDEAE3]" : "text-[#EDEAE3]/55",
                        )}
                      >
                        <span className={cn("font-mono text-[10px]", t.active ? "text-honey" : "text-[#EDEAE3]/35")}>{t.id}</span>
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex h-10 flex-none items-center justify-between border-t border-black/40 px-4 text-[11px] text-[#EDEAE3]/45 shadow-[inset_0_1px_0_rgb(255_255_255/.04)]">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#9CC08A]" />
          hive daemon · local
        </span>
        <IconSettings aria-hidden stroke={1.6} className="size-3.5" />
      </div>
    </aside>
  );
}

const ToolbarButton = ({ icon, children }: { icon: ReactNode; children?: string }) => (
  <span className="flex h-7 items-center gap-1.5 rounded-full bg-white/[.07] px-3 text-[12px] text-[#EDEAE3]/80 shadow-[inset_0_.5px_0_rgb(255_255_255/.12),0_0_0_.5px_rgb(0_0_0/.5)] @max-xl:px-2">
    {icon}
    {children && <span className="@max-xl:hidden">{children}</span>}
  </span>
);

function Toolbar() {
  return (
    <div className="flex h-13 flex-none items-center gap-4 border-b border-black/60 bg-[#1F1E1D] px-4 shadow-[inset_0_-1px_0_rgb(255_255_255/.03)]">
      <TrafficLights className="mr-1 hidden @max-2xl:flex" />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-semibold text-[#EDEAE3]">auth-refactor</div>
        <div className="flex items-center gap-1 truncate text-[11px] text-[#EDEAE3]/45">
          <IconGitBranch aria-hidden stroke={1.8} className="size-3 flex-none" />
          {BRANCH}
          <span className="px-1 @max-xl:hidden">·</span>
          <span className="@max-xl:hidden">{DEMO.cwd}</span>
        </div>
      </div>
      <div className="flex flex-none items-center gap-2">
        <ToolbarButton icon={<IconSparkles aria-hidden stroke={1.7} className="size-3.5 text-honey" />}>Prompt</ToolbarButton>
        <ToolbarButton icon={<IconPlus aria-hidden stroke={1.8} className="size-3.5" />}>New agent</ToolbarButton>
        <span className="flex size-7 items-center justify-center rounded-full bg-white/[.07] text-[#EDEAE3]/70 shadow-[inset_0_.5px_0_rgb(255_255_255/.12),0_0_0_.5px_rgb(0_0_0/.5)] @max-md:hidden">
          <IconSearch aria-hidden stroke={1.8} className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

/** Native window tabs: equal widths, the selected one lifted. */
function TabBar() {
  return (
    <div className="flex h-8 flex-none items-stretch border-b border-black/60 bg-[#171716] text-[12px]">
      {TABS.map((t) => (
        <span
          key={t.id}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 border-r border-black/50",
            t.active ? "bg-[#1C1C1A] text-[#EDEAE3] shadow-[inset_0_1px_0_rgb(255_255_255/.05)]" : "text-[#EDEAE3]/45",
          )}
        >
          <span className={cn("font-mono text-[10px]", t.active ? "text-honey" : "text-[#EDEAE3]/30")}>⌘{t.id}</span>
          {t.label}
        </span>
      ))}
      <span className="flex w-9 flex-none items-center justify-center text-[#EDEAE3]/40">
        <IconPlus aria-hidden stroke={1.8} className="size-3.5" />
      </span>
    </div>
  );
}

const PaneHead = ({ title, children, focused }: { title: string; children?: ReactNode; focused?: boolean }) => (
  <div className="flex h-7 flex-none items-center gap-1.5 border-b border-black/50 px-2 text-[11px]">
    <IconGripVertical aria-hidden stroke={1.6} className="size-3 text-[#EDEAE3]/25" />
    <span className={focused ? "text-[#EDEAE3]/85" : "text-[#EDEAE3]/50"}>{title}</span>
    <span className="ml-auto flex items-center gap-2">{children}</span>
  </div>
);

/** macOS-style banner the app posts when an agent is done. */
function Notification() {
  return (
    <div
      data-rt="notify"
      className="absolute top-15 right-3 z-10 flex w-[min(320px,calc(100%-24px))] translate-x-3 gap-3 rounded-[16px] border border-white/[.09] bg-[#2E2D2B]/[.97] p-3 opacity-0 shadow-[0_0_0_.5px_rgb(0_0_0/.6),0_18px_40px_-8px_rgb(0_0_0/.65)] transition-[opacity,translate] duration-500 ease-out data-on:translate-x-0 data-on:opacity-100"
    >
      <span className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-[linear-gradient(160deg,#2E2D2A,#0F0F0E)] shadow-[inset_0_0_0_.5px_rgb(255_255_255/.12)]">
        <Logo variant="mark" title="" className="h-3.5" />
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-[#EDEAE3]">auth-refactor is done</span>
          <span className="flex-none text-[11px] text-[#EDEAE3]/40">now</span>
        </span>
        <span className="block truncate text-[12px] text-[#EDEAE3]/65">48/48 passing · PR #212 is up for review</span>
      </span>
    </div>
  );
}

/**
 * Hive Desktop on macOS: sidebar · toolbar · tabs · live terminal panes.
 * Same `data-rt` keys as the TUI, so use-runtime-demo plays the same story
 * inside the app's terminals. Container queries collapse it by its own
 * width (in 3D that isn't the viewport's). Illustrative only → aria-hidden.
 */
export function DesktopDemo({ signals, reducedMotion, introAt, className, style }: DesktopDemoProps) {
  const root = useRef<HTMLDivElement>(null);
  useRuntimeDemo(root, { signals, reducedMotion, introAt });

  return (
    <div
      ref={root}
      aria-hidden
      data-mascot-target="demo"
      style={style}
      className={cn(
        "@container relative flex overflow-hidden rounded-[12px] bg-[#1C1C1A] font-system text-[13px] text-[#EDEAE3] antialiased shadow-[0_0_0_.5px_rgb(0_0_0/.9),0_40px_90px_-24px_rgb(0_0_0/.85)] select-none",
        className,
      )}
    >
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar />
        <TabBar />

        <div className="flex min-h-0 flex-1 gap-1 bg-[#111110] p-1">
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-[#181817] shadow-[0_0_0_1px_rgb(245_185_66/.28)]">
            <PaneHead title={DEMO.agent.name} focused>
              <span className="flex items-center gap-1 rounded-full bg-honey/[.12] px-1.5 py-px text-[10px] text-honey">
                <span className="size-1.5 animate-pulse rounded-full bg-honey" />
                running
              </span>
            </PaneHead>
            <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 pb-4 font-mono text-[12.5px] leading-[1.6] @max-xl:gap-2.5 @max-xl:px-3 @max-xl:pb-3 @max-xl:text-[11.5px]">
              <AgentLines />
            </div>
          </section>

          <section className="flex w-[36%] flex-none flex-col overflow-hidden rounded-md bg-[#161615] @max-4xl:hidden">
            <PaneHead title={DEMO.tests.runner}>
              <span className="text-[10px] text-[#9CC08A]">watching</span>
            </PaneHead>
            <div className="flex flex-col gap-3 px-4 pt-3 font-mono text-[12px] leading-[1.6]">
              <TestLines />
            </div>
          </section>
        </div>

        <div className="flex h-6 flex-none items-center justify-between gap-3 border-t border-black/60 bg-[#1A1A19] px-3 text-[11px] text-[#EDEAE3]/45">
          <span className="flex min-w-0 items-center gap-2 truncate">
            <span className="size-1.5 flex-none rounded-full bg-[#9CC08A]" />
            3 agents running
            <span>·</span>
            <span data-rt="lid">laptop awake</span>
          </span>
          <span className="flex-none @max-md:hidden">
            <span className="font-mono text-[10px] text-[#EDEAE3]/60">⌘K</span> Command palette
          </span>
        </div>
      </div>

      <Notification />
      {/* Hairline highlight over everything, like a real window edge. */}
      <span className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] shadow-[inset_0_0_0_.5px_rgb(255_255_255/.13)]" />
    </div>
  );
}

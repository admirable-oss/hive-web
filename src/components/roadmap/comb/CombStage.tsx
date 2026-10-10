import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { WebGLBoundary } from "@/components/shared/WebGLBoundary";
import { STATUS, shortId } from "@/lib/roadmap/derive";
import type { Milestone } from "@/lib/roadmap/parse";
import type { Bee, FlockCommit } from "./flock";

const CombScene = lazy(() => import("./CombScene"));

const WIDE = "(min-width: 1024px)";
const useWide = () =>
  useSyncExternalStore(
    (cb) => {
      const m = matchMedia(WIDE);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(WIDE).matches,
    () => true,
  );

interface Props {
  milestones: Milestone[];
  sel: string | null;
  onSelect: (id: string) => void;
  commits: (FlockCommit & { short: string })[];
  reducedMotion: boolean;
  onNewBee?: (bee: Bee) => void;
}

/** The comb hero's canvas plus its DOM overlay (milestone labels, lead commit tag). */
export function CombStage({ milestones, sel, onSelect, commits, reducedMotion, onNewBee }: Props) {
  const wide = useWide();
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [leadSha, setLeadSha] = useState<string | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const lead = commits.find((c) => c.sha === leadSha);
  const current = milestones.find((m) => m.status === "current");

  return (
    <div ref={root} className="absolute inset-0">
      <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }}>
        <WebGLBoundary
          fallback={
            <img src="/brand/mascot/hive-agent-working.svg" alt="" className="pixelated absolute top-1/2 left-1/2 w-24 -translate-1/2" />
          }
        >
          <Suspense fallback={null}>
            <CombScene
              milestones={milestones}
              sel={sel}
              commits={commits}
              active={visible}
              reducedMotion={reducedMotion}
              wide={wide}
              overlay={overlay}
              onReady={() => setReady(true)}
              onLeadBee={setLeadSha}
              onNewBee={onNewBee}
            />
          </Suspense>
        </WebGLBoundary>
      </div>

      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden">
        {milestones.map((m, i) => {
          const on = m.id === sel;
          const isCur = m.status === "current";
          const border = on ? "#F5B942" : isCur ? "rgba(245,185,66,.55)" : "rgba(237,234,227,.18)";
          return (
            <button
              key={m.id}
              type="button"
              data-ml={i}
              onClick={() => onSelect(m.id)}
              aria-label={`${m.id} ${m.title}, ${STATUS[m.status].label}`}
              aria-pressed={on}
              className={`pointer-events-auto absolute top-0 left-0 flex cursor-pointer flex-col items-center opacity-0 transition-opacity duration-200 ${on || isCur ? "" : "max-sm:hidden"}`}
              style={{ transform: "translate(-9999px,0)" }}
            >
              <span
                className="flex items-center gap-1.5 border bg-[#1e1e1c]/90 px-1.75 py-0.75 font-mono text-[11.5px] leading-[1.4] whitespace-nowrap"
                style={{ borderColor: border, color: isCur ? "#F5B942" : on ? "#EDEAE3" : "#C9C5BB" }}
              >
                {shortId(m)}
                {wide && (on || isCur) && <span className="text-[#A9A59B]">{m.version}</span>}
              </span>
              <span className="h-3 w-px" style={{ background: border }} />
            </button>
          );
        })}
        <div
          data-bee-tag
          aria-hidden="true"
          className="absolute top-0 left-0 flex items-center gap-2 border-l-2 border-honey bg-[#1e1e1c]/92 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-[#C9C5BB] opacity-0 transition-opacity duration-300 max-sm:hidden"
        >
          {lead && (
            <>
              <span className="text-honey">{lead.short}</span>
              <span>{lead.msg.length > 34 ? `${lead.msg.slice(0, 33)}…` : lead.msg}</span>
            </>
          )}
        </div>
      </div>

      <span className="sr-only">
        {current ? `Now building ${current.id}, ${current.title}.` : ""} Each bee is a recent commit on main.
      </span>
    </div>
  );
}

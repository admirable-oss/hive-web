import { ColumnHead } from "./RuntimeTopBar";
import { DEMO } from "./script";

const { agent } = DEMO;

const Prompt = ({ k, hidden = false }: { k: string; hidden?: boolean }) => (
  <div data-rt={`${k}-row`} className={hidden ? "hidden gap-2.5" : "flex gap-2.5"}>
    <span aria-hidden className="text-honey">›</span>
    <span className="text-bone">
      <span data-rt={k} />
      <span data-rt={`${k}-caret`} aria-hidden className="ml-px inline-block h-[1.05em] w-[.55em] translate-y-0.5 bg-honey/80 opacity-0" />
    </span>
  </div>
);

/**
 * The agent's conversation. `data-rt` keys are driven by use-runtime-demo;
 * shared by the TUI pane and the desktop app's terminal.
 */
export const AgentLines = () => (
  <>
    <Prompt k="prompt" />
    <div data-rt="reply" className="hidden gap-2.5">
      <span aria-hidden className="text-honey">●</span>
      <span data-rt="reply-text" className="text-fog" />
    </div>
    <div data-rt="plan" className="hidden flex-col gap-1 pl-5">
      {agent.plan.map((p) => (
        <span key={p} data-rt="plan-item" className="flex gap-2 text-fog">
          <span aria-hidden className="text-ash">·</span>
          {p}
        </span>
      ))}
    </div>
    <div data-rt="event" className="hidden flex-col gap-0.5 pl-5 text-honey/90">
      {agent.event.map((e) => (
        <span key={e}>{e}</span>
      ))}
    </div>
    <Prompt k="prompt2" hidden />
    <div data-rt="reply2" className="hidden gap-2.5">
      <span aria-hidden className="text-honey">●</span>
      <span data-rt="reply2-text" className="text-bone" />
    </div>
    <div data-rt="spinner" className="hidden items-center gap-2 text-ash">
      <span data-rt="spinner-glyph" aria-hidden className="w-3 text-honey">∴</span>
      <span className="text-fog">working…</span>
      <span data-rt="spinner-time">0s</span>
    </div>
  </>
);

/**
 * The agent's session — the star of the demo. Bottom-anchored like a real
 * terminal: new lines push older ones up and into the haze.
 */
export function AgentPane() {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-graphite/85">
      <ColumnHead>{agent.name}</ColumnHead>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-5 pb-6 leading-[1.6] @max-xl:gap-2.5 @max-xl:px-4 @max-xl:pb-4">
        <AgentLines />
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "cn";
import { FAMILY, measure, paint, type Metrics } from "@/lib/tui/canvas";
import type { Grid } from "@/lib/tui/grid";
import { MOBILE_WIDTH, render } from "@/lib/tui/render";
import { Session } from "@/lib/tui/session";
import { HIVE_THEME } from "@/lib/tui/theme";

/** Browser key → hive's key names ("ctrl+b", "enter", "%"); null leaves it to the browser. */
function keyName(e: KeyboardEvent): string | null {
  if (e.metaKey || e.nativeEvent.isComposing) return null;
  if (e.ctrlKey && !e.altKey) return e.key.length === 1 ? `ctrl+${e.key.toLowerCase()}` : null;
  switch (e.key) {
    case "Enter":
      return "enter";
    case "Escape":
      return "esc";
    case "Backspace":
      return "backspace";
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return "left";
    case "ArrowRight":
      return "right";
  }
  return e.key.length === 1 ? e.key : null;
}

/** One tap = a key sequence, for touch screens and the curious. */
const CHIPS: { keys: string[]; label: string; hint: string }[] = [
  { keys: ["ctrl+b", "%"], label: "C-b %", hint: "split" },
  { keys: ["ctrl+b", "c"], label: "C-b c", hint: "new tab" },
  { keys: ["ctrl+b", "O"], label: "C-b O", hint: "overview" },
  { keys: ["ctrl+b", "a"], label: "C-b a", hint: "next agent" },
  { keys: ["ctrl+b", "?"], label: "C-b ?", hint: "keys" },
];

const fontSize = (w: number) => (w >= 1100 ? 13 : w >= 760 ? 12 : 11);

interface TuiDemoProps {
  className?: string;
  /** Edge-to-edge terminal chrome (no site header/footer). */
  fullscreen?: boolean;
}

/**
 * Hive's multiplexer in the page: simulated session on a canvas cell grid,
 * driven by the real key bindings.
 */
export default function TuiDemo({ className, fullscreen = false }: TuiDemoProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const typer = useRef<HTMLTextAreaElement>(null);
  const [session] = useState(() => new Session());
  const [detached, setDetached] = useState(false);
  const view = useRef({
    cols: 0,
    rows: 0,
    m: null as Metrics | null,
    grid: null as Grid | null,
    blink: true,
    typedAt: 0,
    theme: HIVE_THEME,
    sized: false,
  });

  const exitDemo = useCallback(() => {
    window.location.assign("/");
  }, []);

  useEffect(() => {
    session.toast("Interactive demo · Ctrl+C at an empty prompt exits", "info");
  }, [session]);

  const draw = useCallback(() => {
    const v = view.current;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !v.m || v.cols === 0) return;
    const th = v.theme;
    v.grid = render(session, v.cols, v.rows, th);
    paint(ctx, v.grid, v.m, { cursor: v.blink, cursorColor: th.fg, cursorText: th.term });
    session.dirty = false;
  }, [session]);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let alive = true;
    const fit = () => {
      if (!alive) return;
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const m = measure(fontSize(r.width), dpr);
      const v = view.current;
      v.m = m;
      v.cols = Math.max(24, Math.floor(r.width / m.cw));
      v.rows = Math.max(10, Math.floor(r.height / m.ch));
      cv.width = Math.round(v.cols * m.cw * dpr);
      cv.height = Math.round(v.rows * m.ch * dpr);
      cv.style.width = `${v.cols * m.cw}px`;
      cv.style.height = `${v.rows * m.ch}px`;
      if (!v.sized) {
        if (v.cols < 96) session.sidebar = false;
        v.sized = true;
      }
      draw();
    };
    const sample = "─│╭╮╰╯┬├ abc ●◆✓";
    Promise.all([document.fonts.load(`400 13px ${FAMILY}`, sample), document.fonts.load(`600 13px ${FAMILY}`, sample)])
      .catch(() => undefined)
      .finally(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [draw, session]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(0.25, (t - last) / 1000);
      last = t;
      session.tick(dt);
      const v = view.current;
      const blink = t - v.typedAt < 700 || Math.floor(t / 530) % 2 === 0;
      if (session.dirty || blink !== v.blink) {
        v.blink = blink;
        draw();
      }
      setDetached(session.detached);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [draw, session]);

  useEffect(() => {
    const id = window.setTimeout(() => box.current?.focus({ preventScroll: true }), 50);
    return () => window.clearTimeout(id);
  }, []);

  const press = (keys: string[]) => {
    keys.forEach((k) => session.key(k));
    view.current.typedAt = performance.now();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const k = keyName(e);
    if (!k) return;
    e.preventDefault();
    e.stopPropagation();
    if (k === "ctrl+c" && session.pageExitOnCtrlC()) {
      session.toast("Leaving demo…", "info");
      window.setTimeout(exitDemo, 120);
      return;
    }
    press([k]);
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const v = view.current;
    if (!v.m || !v.grid) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / v.m.cw);
    const y = Math.floor((e.clientY - r.top) / v.m.ch);
    const hit = v.grid.hitAt(x, y);
    if (e.pointerType === "mouse") box.current?.focus({ preventScroll: true });
    if (!hit) return;
    session.click(hit.kind, hit.id);
    if ((hit.kind === "env" || hit.kind === "agent") && v.cols <= MOBILE_WIDTH) session.sidebar = false;
  };

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col",
        fullscreen ? "bg-graphite font-mono text-bone" : "",
        className,
      )}
    >
      <div
        ref={box}
        tabIndex={0}
        role="application"
        aria-roledescription="terminal"
        aria-label="Interactive Hive demo. Type into the focused pane. Press Control B, then question mark, for every key. Control C at an empty prompt exits."
        onKeyDown={onKeyDown}
        className={cn(
          "relative min-h-0 flex-1 cursor-text overflow-hidden outline-none",
          fullscreen && "h-full w-full",
        )}
        style={{ background: HIVE_THEME.term }}
      >
        <canvas ref={canvas} onPointerDown={onPointerDown} className="block touch-manipulation select-none" />
        <textarea
          ref={typer}
          aria-label="Type into the demo"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={onKeyDown}
          onInput={(e) => {
            const t = e.currentTarget;
            for (const ch of t.value) press([ch === "\n" ? "enter" : ch]);
            t.value = "";
          }}
          className="pointer-events-none absolute bottom-0 left-0 size-px resize-none opacity-0"
        />
      </div>

      <div
        className={cn(
          "flex flex-none flex-wrap items-center gap-1.5 border-t border-bone/8 font-mono text-[11px]",
          fullscreen
            ? "absolute inset-x-0 bottom-0 border-t border-graphite-hi/90 bg-shell/92 px-3 py-2 backdrop-blur-sm sm:px-4"
            : "bg-panel px-3 py-2.5 sm:px-4",
        )}
      >
        {detached ? (
          <Chip label="hive" hint="come back" onPress={() => press(["h", "i", "v", "e", "enter"])} highlight />
        ) : (
          <>
            {CHIPS.map((c) => (
              <Chip key={c.label} label={c.label} hint={c.hint} onPress={() => press(c.keys)} />
            ))}
            <Chip label="C-b d" hint="detach" onPress={() => press(["ctrl+b", "d"])} highlight />
            {fullscreen ? (
              <Chip label="^C" hint="exit demo" onPress={exitDemo} />
            ) : null}
          </>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => typer.current?.focus()}
            className="h-7 cursor-pointer border border-bone/10 px-2.5 text-fog transition-colors hover:border-bone/30 hover:text-bone sm:hidden"
          >
            ⌨ type
          </button>
        </span>
      </div>
    </div>
  );
}

function Chip({ label, hint, onPress, highlight = false }: { label: string; hint: string; onPress: () => void; highlight?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      className={cn(
        "flex h-7 cursor-pointer items-center gap-2 border px-2.5 transition-colors duration-150 ease-[steps(2)]",
        highlight ? "border-honey/40 text-honey hover:bg-honey hover:text-ink" : "border-bone/10 text-fog hover:border-bone/30 hover:text-bone",
      )}
    >
      <span className={highlight ? "" : "text-bone"}>{label}</span>
      <span className="opacity-70">{hint}</span>
    </button>
  );
}

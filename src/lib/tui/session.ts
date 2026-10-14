/**
 * A Hive session in the browser: environments, tabs of split panes, the
 * programs in them, and the multiplexer's modes and boxes, driven by the
 * same keys as `hive ui` (prefix ctrl+b). Nothing here touches the DOM;
 * render.ts draws it and TuiDemo feeds it keys, clicks and time.
 */
import * as layout from "./layout";
import { Agent, Logs, SCRIPTS, Shell, apiLog, devServer, type AgentState, type Host, type Line, type Program } from "./programs";

export type Mode = "terminal" | "prefix" | "navigate" | "resize";

export interface Env {
  id: string;
  cwd: string;
  branch: string;
  git: string;
}

export interface Proc {
  id: string;
  env: string;
  prog: Program;
  started: number;
}

export interface Pane {
  id: string;
  proc: string;
  name?: string;
}

export interface Tab {
  id: string;
  env: string;
  name: string;
  root: layout.Node;
  focused: string;
  zoomed?: string;
  activity: boolean;
  seen: number;
}

export type Overlay =
  | { kind: "help"; filter: string; scroll: number }
  | { kind: "overview"; sel: number }
  | { kind: "picker"; filter: string; sel: number }
  | { kind: "confirm"; title: string; text: string; yes: () => void }
  | { kind: "prompt"; title: string; value: string; ok: (v: string) => void };

export type ToastKind = "info" | "success" | "warning" | "error";

export interface Toast {
  text: string;
  kind: ToastKind;
  until: number;
}

type Action =
  | "close_pane" | "close_tab" | "detach" | "focus_down" | "focus_left" | "focus_right" | "focus_up" | "focus_next" | "focus_prev"
  | "goto" | "help" | "mode_navigate" | "mode_resize" | "mode_terminal" | "new_tab" | "next_agent" | "next_env" | "prev_env"
  | "next_tab" | "prev_tab" | "overview" | "rename_pane" | "rename_tab" | "resize_down" | "resize_left" | "resize_right"
  | "resize_up" | "split_down" | "split_right" | "toggle_sidebar" | "zoom" | "send_prefix"
  | "tab_1" | "tab_2" | "tab_3" | "tab_4" | "tab_5" | "tab_6" | "tab_7" | "tab_8" | "tab_9";

/** What each action does, as `ctrl+b ?` lists it. */
export const ACTION_HELP: Record<string, string> = {
  close_pane: "close the pane (asks first)",
  close_tab: "close the tab (asks first)",
  detach: "leave the UI (agents keep running)",
  focus_down: "focus the pane below",
  focus_left: "focus the pane to the left",
  focus_right: "focus the pane to the right",
  focus_up: "focus the pane above",
  focus_next: "focus the next pane",
  focus_prev: "focus the previous pane",
  goto: "go to an agent or pane (fuzzy)",
  help: "show key bindings",
  mode_navigate: "navigate mode (sticky)",
  mode_resize: "resize mode (sticky)",
  mode_terminal: "back to terminal mode",
  new_tab: "new tab",
  next_agent: "go to the next agent that is blocked or done",
  next_env: "next environment",
  prev_env: "previous environment",
  next_tab: "next tab",
  prev_tab: "previous tab",
  overview: "Overview dashboard (toggle)",
  rename_pane: "rename the pane",
  rename_tab: "rename the tab",
  resize_down: "move the bottom border",
  resize_left: "move the left border",
  resize_right: "move the right border",
  resize_up: "move the top border",
  split_down: "split the pane, new pane below",
  split_right: "split the pane, new pane on the right",
  toggle_sidebar: "show or hide the sidebar",
  zoom: "zoom the pane to fill the tab (toggle)",
  send_prefix: "send the prefix key to the pane",
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`tab_${n}`, `tab ${n}`])),
};

const tabKeys = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [String(n), `tab_${n}` as Action]));

/** Key bindings per mode, from hive's defaults (docs/keybindings.md). */
export const KEYS: Record<Exclude<Mode, "terminal">, [string[], Action][]> = {
  prefix: [
    [['%', '|'], "split_right"],
    [['"', "-"], "split_down"],
    [["x"], "close_pane"],
    [["&"], "close_tab"],
    [["z"], "zoom"],
    [["c"], "new_tab"],
    [["n"], "next_tab"],
    [["p"], "prev_tab"],
    [["1"], "tab_1"],
    [["2"], "tab_2"],
    [["3"], "tab_3"],
    [["h", "left"], "focus_left"],
    [["l", "right"], "focus_right"],
    [["k", "up"], "focus_up"],
    [["j", "down"], "focus_down"],
    [["o"], "focus_next"],
    [[";"], "focus_prev"],
    [["O"], "overview"],
    [["w", "s"], "goto"],
    [["a"], "next_agent"],
    [[")"], "next_env"],
    [["("], "prev_env"],
    [["d"], "detach"],
    [["b"], "toggle_sidebar"],
    [[","], "rename_tab"],
    [["."], "rename_pane"],
    [["H"], "resize_left"],
    [["L"], "resize_right"],
    [["K"], "resize_up"],
    [["J"], "resize_down"],
    [["space"], "mode_navigate"],
    [["r"], "mode_resize"],
    [["?"], "help"],
    [["esc"], "mode_terminal"],
    [["ctrl+b"], "send_prefix"],
  ],
  navigate: [
    [["h", "left"], "focus_left"],
    [["l", "right"], "focus_right"],
    [["k", "up"], "focus_up"],
    [["j", "down"], "focus_down"],
    [["o"], "focus_next"],
    [['%', '|'], "split_right"],
    [['"', "-"], "split_down"],
    [["x"], "close_pane"],
    [["z"], "zoom"],
    [["c"], "new_tab"],
    [["n", "tab"], "next_tab"],
    [["p"], "prev_tab"],
    [["w", "/"], "goto"],
    [["a"], "next_agent"],
    [[")"], "next_env"],
    [["("], "prev_env"],
    [["O"], "overview"],
    [["r"], "mode_resize"],
    [["?"], "help"],
    [["esc", "q", "enter", "i"], "mode_terminal"],
  ],
  resize: [
    [["h", "left"], "resize_left"],
    [["l", "right"], "resize_right"],
    [["k", "up"], "resize_up"],
    [["j", "down"], "resize_down"],
    [["esc", "q", "enter"], "mode_terminal"],
  ],
};

const lookup = (mode: Exclude<Mode, "terminal">, k: string): Action | undefined => {
  if (mode !== "resize" && tabKeys[k]) return tabKeys[k];
  return KEYS[mode].find(([keys]) => keys.includes(k))?.[1];
};

/** How keys read in hints: "C-b", "%". */
export const display = (k: string) => (k.startsWith("ctrl+") ? `C-${k.slice(5)}` : k);

const AGENT_KINDS = new Set(["claude", "codex"]);

export class Session implements Host {
  envs: Env[] = [];
  tabs: Tab[] = [];
  panes = new Map<string, Pane>();
  procs = new Map<string, Proc>();
  envId = "";
  /** The tab shown in each environment. */
  shown = new Map<string, string>();
  mode: Mode = "terminal";
  overlay: Overlay | null = null;
  sidebar = true;
  collapsed = new Set<string>();
  detached = false;
  outer: { lines: Line[]; input: string } = { lines: [], input: "" };
  toasts: Toast[] = [];
  now = 0;
  /** Set by every change; the view redraws and clears it. */
  dirty = true;
  /** The panes' rectangles on screen, from the last render (focus moves). */
  geo = new Map<string, layout.Rect>();
  private seq = 0;
  private away = 0;
  private versions = 0;
  constructor() {
    this.build();
  }

  /** ^C at an empty shell prompt (or idle agent) exits the full-screen demo. */
  pageExitOnCtrlC(): boolean {
    if (this.detached || this.overlay || this.mode !== "terminal") return false;
    const prog = this.procOf(this.focusedPane())?.prog;
    if (!prog) return true;
    if (prog instanceof Shell) return prog.atEmptyPrompt();
    if (prog instanceof Agent) return prog.state === "idle" && !prog.hasInput();
    return prog.kind === "logs";
  }

  // --- building ---

  private id(p: string) {
    return `${p}${++this.seq}`;
  }

  private spawn(env: string, prog: Program): Pane {
    const proc: Proc = { id: this.id("p"), env, prog, started: this.now };
    this.procs.set(proc.id, proc);
    const pane: Pane = { id: this.id("w"), proc: proc.id };
    this.panes.set(pane.id, pane);
    return pane;
  }

  private shell(env: Env, motd: Line[] = []) {
    return new Shell(this, env.cwd, env.branch, motd);
  }

  private addTab(env: string, name: string, root: layout.Node, focused: string): Tab {
    const t: Tab = { id: this.id("t"), env, name, root, focused, activity: false, seen: 0 };
    this.tabs.push(t);
    return t;
  }

  /** The session a visitor lands in: two projects, agents mid-task. */
  private build() {
    const api: Env = { id: "api", cwd: "~/acme/api", branch: "main", git: "main *" };
    const web: Env = { id: "web", cwd: "~/acme/web", branch: "feat/hero", git: "feat/hero ↑2" };
    this.envs = [api, web];

    const claude = new Agent(this, "claude", api.cwd);
    claude.ask("move sessions to redis and keep the suite green", SCRIPTS.redis("claude"));
    const codex = new Agent(this, "codex", api.cwd);
    codex.ask("make the flaky auth test deterministic", SCRIPTS.flaky("codex"));
    const sh = this.shell(api, [
      [{ t: "# This is Hive, simulated in your browser. Type here, or:", c: "dim" }],
      [{ t: "#   ctrl+b ?  every key   ctrl+b %  split   ctrl+b O  overview", c: "dim" }],
      [{ t: "#   ctrl+b d  detach (the agents keep working)", c: "dim" }],
      [{ t: "#   try: ", c: "dim" }, { t: "cd ~/acme/web", c: "yellow" }, { t: "  ", c: "dim" }, { t: "claude fix the login bug", c: "yellow" }],
    ]);
    const a = this.spawn("api", claude);
    const b = this.spawn("api", codex);
    const c = this.spawn("api", sh);
    const agents = this.addTab(
      "api",
      "agents",
      { kind: "split", dir: "right", ratio: 0.56, a: layout.leaf(a.id), b: { kind: "split", dir: "down", ratio: 0.55, a: layout.leaf(b.id), b: layout.leaf(c.id) } },
      c.id,
    );
    const logs = this.spawn("api", new Logs(this, "tail", apiLog, [[{ t: "$ tail -f log/api.log", c: "dim" }]]));
    this.addTab("api", "logs", layout.leaf(logs.id), logs.id);

    const hero = new Agent(this, "claude", web.cwd);
    hero.ask("tighten the hero copy", SCRIPTS.hero("claude"));
    const h = this.spawn("web", hero);
    const dev = this.spawn(
      "web",
      new Logs(
        this,
        "npm",
        devServer,
        [
          [{ t: "$ npm run dev", c: "dim" }],
          [],
          [{ t: "  VITE ", c: "green" }, { t: "v6.3.5", c: "green", b: true }, { t: "  ready in 312 ms", c: "dim" }],
          [],
          [{ t: "  ➜  ", c: "green" }, { t: "Local:   ", b: true }, { t: "http://localhost:4321/", c: "cyan" }],
          [],
        ],
        4.5,
      ),
    );
    const main = this.addTab("web", "main", { kind: "split", dir: "right", ratio: 0.6, a: layout.leaf(h.id), b: layout.leaf(dev.id) }, h.id);

    this.envId = "api";
    this.shown.set("api", agents.id);
    this.shown.set("web", main.id);
  }

  // --- queries ---

  env(id = this.envId) {
    return this.envs.find((e) => e.id === id);
  }

  tabsOf(env = this.envId) {
    return this.tabs.filter((t) => t.env === env);
  }

  tab(): Tab | undefined {
    const id = this.shown.get(this.envId);
    return this.tabs.find((t) => t.id === id) ?? this.tabsOf()[0];
  }

  focusedPane(): Pane | undefined {
    const t = this.tab();
    return t ? this.panes.get(t.focused) : undefined;
  }

  procOf(pane: Pane | undefined): Proc | undefined {
    return pane ? this.procs.get(pane.proc) : undefined;
  }

  paneOfProc(procId: string): { pane: Pane; tab: Tab } | undefined {
    for (const t of this.tabs) {
      for (const id of layout.panes(t.root)) {
        const p = this.panes.get(id);
        if (p?.proc === procId) return { pane: p, tab: t };
      }
    }
    return undefined;
  }

  isAgent(p: Proc) {
    return AGENT_KINDS.has(p.prog.kind);
  }

  name(p: Proc): string {
    return this.paneOfProc(p.id)?.pane.name || p.prog.title;
  }

  /** Processes in tab order, per environment (the sidebar's Agents). */
  procsIn(env: string): Proc[] {
    const out: Proc[] = [];
    for (const t of this.tabsOf(env)) {
      for (const id of layout.panes(t.root)) {
        const p = this.procOf(this.panes.get(id));
        if (p && !out.includes(p)) out.push(p);
      }
    }
    return out;
  }

  allProcs(): Proc[] {
    return this.envs.flatMap((e) => this.procsIn(e.id));
  }

  statusText(p: Proc): string {
    if (p.prog.status === "exited") return `exited ${p.prog.exitCode}`;
    if (this.isAgent(p) && p.prog.state) return p.prog.state;
    return "running";
  }

  elapsed(p: Proc): string {
    const s = Math.max(0, Math.floor(this.now - (this.isAgent(p) ? p.prog.since : p.started)));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
  }

  counts() {
    const all = this.allProcs();
    const by = (s: AgentState) => all.filter((p) => p.prog.status === "running" && p.prog.state === s).length;
    return {
      running: all.filter((p) => p.prog.status === "running" && (!this.isAgent(p) || p.prog.state === "working" || p.prog.state === "idle")).length,
      awaiting: by("blocked"),
      complete: by("done"),
      ended: all.filter((p) => p.prog.status === "exited").length,
    };
  }

  // --- Host (for programs) ---

  replace(from: Program, to: Program) {
    for (const p of this.procs.values()) {
      if (p.prog === from) {
        p.prog = to;
        to.tick(this.now);
      }
    }
    this.dirty = true;
  }

  stateChanged(prog: Program, prev: AgentState | undefined) {
    const proc = [...this.procs.values()].find((p) => p.prog === prog);
    if (!proc || prev === undefined) return;
    if (this.detached) {
      // Summed up on return instead.
      if (prog.state === "done" || prog.state === "blocked") this.away++;
      return;
    }
    const focused = this.procOf(this.focusedPane()) === proc;
    if (focused) return;
    const who = `${this.name(proc)} in ${proc.env}`;
    if (prog.state === "blocked") this.toast(`${who} needs you`, "warning");
    if (prog.state === "done") this.toast(`${who} is done`, "success");
  }

  agentsTable(): Line[] {
    const rows = this.allProcs();
    const out: Line[] = [[{ t: "AGENT     ENVIRONMENT  STATUS     FOR", c: "dim" }]];
    for (const p of rows) {
      const st = this.statusText(p);
      const c = st === "blocked" ? "orange" : st === "done" ? "green" : st === "working" ? "blue" : st.startsWith("exited") ? "red" : "fg";
      out.push([{ t: this.name(p).padEnd(10) }, { t: p.env.padEnd(13) }, { t: st.padEnd(11), c }, { t: this.elapsed(p), c: "dim" }]);
    }
    return out;
  }

  toast(text: string, kind: ToastKind) {
    this.toasts = [...this.toasts.slice(-2), { text, kind, until: this.now + 4.5 }];
    this.dirty = true;
  }

  // --- time ---

  tick(dt: number) {
    this.now += dt;
    for (const p of this.procs.values()) p.prog.tick(this.now);

    if (!this.detached && this.overlay?.kind !== "overview") this.procOf(this.focusedPane())?.prog.seen(this.now);

    const active = this.tab();
    let total = 0;
    for (const t of this.tabs) {
      const v = layout.panes(t.root).reduce((n, id) => n + (this.procOf(this.panes.get(id))?.prog.version ?? 0), 0);
      total += v;
      if (t === active && !this.detached) {
        t.seen = v;
        t.activity = false;
      } else if (v !== t.seen) {
        t.activity = true;
      }
    }
    if (total !== this.versions) {
      this.versions = total;
      this.dirty = true;
    }
    const live = this.toasts.filter((t) => t.until > this.now);
    if (live.length !== this.toasts.length) {
      this.toasts = live;
      this.dirty = true;
    }
  }

  // --- input ---

  /** One key, named like hive's keymap: "a", "%", "enter", "ctrl+b", "up". */
  key(k: string) {
    this.dirty = true;
    if (this.detached) return this.outerKey(k);
    if (this.overlay) return this.overlayKey(this.overlay, k);
    if (this.mode === "terminal") {
      if (k === "ctrl+b") {
        this.mode = "prefix";
        return;
      }
      this.procOf(this.focusedPane())?.prog.key(k);
      return;
    }
    const name = k === " " ? "space" : k;
    const act = lookup(this.mode, name);
    if (this.mode === "prefix") this.mode = "terminal";
    if (act) this.act(act);
  }

  /** A click on a hit area of the last render. */
  click(kind: string, id?: string) {
    this.dirty = true;
    if (this.detached) return;
    switch (kind) {
      case "env":
        if (id) this.showEnv(id);
        return;
      case "agent":
        if (id) this.goToProc(id);
        return;
      case "tab": {
        const t = this.tabs.find((x) => x.id === id);
        if (t) this.shown.set(t.env, t.id);
        return;
      }
      case "newtab":
        this.act("new_tab");
        return;
      case "pane": {
        const t = this.tab();
        if (t && id && this.panes.has(id)) t.focused = id;
        if (this.mode === "prefix") this.mode = "terminal";
        return;
      }
      case "header":
        if (id) this.collapsed.has(id) ? this.collapsed.delete(id) : this.collapsed.add(id);
        return;
      case "overview-row":
        if (this.overlay?.kind === "overview" && id) {
          const i = Number(id);
          if (this.overlay.sel === i) this.overlayKey(this.overlay, "enter");
          else this.overlay.sel = i;
        }
        return;
      case "picker-row":
        if (this.overlay?.kind === "picker" && id) {
          this.overlay.sel = Number(id);
          this.overlayKey(this.overlay, "enter");
        }
        return;
      case "confirm-yes":
      case "confirm-no":
        if (this.overlay?.kind === "confirm") this.overlayKey(this.overlay, kind === "confirm-yes" ? "y" : "n");
        return;
    }
  }

  private act(a: Action) {
    const t = this.tab();
    if (a.startsWith("tab_")) {
      const n = Number(a.slice(4)) - 1;
      const target = this.tabsOf()[n];
      if (target) this.shown.set(this.envId, target.id);
      return;
    }
    switch (a) {
      case "split_right":
      case "split_down": {
        if (!t) return;
        const env = this.env()!;
        const p = this.spawn(env.id, this.shell(env));
        t.root = layout.split(t.root, t.focused, a === "split_right" ? "right" : "down", p.id);
        t.focused = p.id;
        t.zoomed = undefined;
        return;
      }
      case "close_pane": {
        const pane = this.focusedPane();
        const proc = this.procOf(pane);
        if (!pane || !proc) return;
        this.overlay = {
          kind: "confirm",
          title: "Close pane",
          text: proc.prog.status === "running" ? `Close ${this.name(proc)}? Its process will be stopped.` : `Close ${this.name(proc)}?`,
          yes: () => this.closePane(pane.id),
        };
        return;
      }
      case "close_tab": {
        if (!t) return;
        const n = layout.panes(t.root).length;
        this.overlay = { kind: "confirm", title: "Close tab", text: `Close ${t.name} and its ${n} pane${n === 1 ? "" : "s"}?`, yes: () => layout.panes(t.root).forEach((id) => this.closePane(id)) };
        return;
      }
      case "zoom":
        if (t) t.zoomed = t.zoomed ? undefined : t.focused;
        return;
      case "new_tab": {
        const env = this.env()!;
        const p = this.spawn(env.id, this.shell(env));
        const nt = this.addTab(env.id, "zsh", layout.leaf(p.id), p.id);
        this.shown.set(env.id, nt.id);
        return;
      }
      case "next_tab":
      case "prev_tab": {
        const ts = this.tabsOf();
        if (!t || ts.length === 0) return;
        const i = ts.indexOf(t);
        this.shown.set(this.envId, ts[(i + (a === "next_tab" ? 1 : ts.length - 1)) % ts.length].id);
        return;
      }
      case "focus_next":
      case "focus_prev": {
        if (!t) return;
        const ids = layout.panes(t.root);
        const i = ids.indexOf(t.focused);
        t.focused = ids[(i + (a === "focus_next" ? 1 : ids.length - 1)) % ids.length];
        t.zoomed = t.zoomed ? t.focused : undefined;
        return;
      }
      case "focus_left":
      case "focus_right":
      case "focus_up":
      case "focus_down": {
        if (!t || t.zoomed) return;
        const n = layout.neighbor(this.geo, t.focused, a.slice(6) as layout.Dir);
        if (n) t.focused = n;
        return;
      }
      case "resize_left":
      case "resize_right":
      case "resize_up":
      case "resize_down":
        if (t) t.root = layout.resize(t.root, t.focused, a.slice(7) as layout.Dir);
        return;
      case "overview":
        this.overlay = { kind: "overview", sel: 0 };
        this.mode = "terminal";
        return;
      case "goto":
        this.overlay = { kind: "picker", filter: "", sel: 0 };
        this.mode = "terminal";
        return;
      case "help":
        this.overlay = { kind: "help", filter: "", scroll: 0 };
        this.mode = "terminal";
        return;
      case "next_agent": {
        const want = this.allProcs().filter((p) => p.prog.status === "running" && (p.prog.state === "blocked" || p.prog.state === "done"));
        want.sort((x, y) => (x.prog.state === y.prog.state ? x.prog.since - y.prog.since : x.prog.state === "blocked" ? -1 : 1));
        const cur = this.procOf(this.focusedPane());
        const next = want.find((p) => p !== cur) ?? want[0];
        if (next) this.goToProc(next.id);
        else this.toast("No agent is waiting for you", "info");
        return;
      }
      case "next_env":
      case "prev_env": {
        const i = this.envs.findIndex((e) => e.id === this.envId);
        const n = this.envs.length;
        this.showEnv(this.envs[(i + (a === "next_env" ? 1 : n - 1)) % n].id);
        return;
      }
      case "detach":
        this.detach();
        return;
      case "toggle_sidebar":
        this.sidebar = !this.sidebar;
        return;
      case "rename_tab":
        if (t) this.overlay = { kind: "prompt", title: "Rename tab", value: t.name, ok: (v) => v && (t.name = v) };
        return;
      case "rename_pane": {
        const pane = this.focusedPane();
        if (pane) this.overlay = { kind: "prompt", title: "Rename pane", value: pane.name ?? "", ok: (v) => (pane.name = v || undefined) };
        return;
      }
      case "mode_navigate":
        this.mode = "navigate";
        return;
      case "mode_resize":
        this.mode = "resize";
        return;
      case "mode_terminal":
        this.mode = "terminal";
        return;
      case "send_prefix":
        this.procOf(this.focusedPane())?.prog.key("ctrl+b");
        return;
    }
  }

  showEnv(id: string) {
    if (!this.env(id)) return;
    this.envId = id;
    if (this.mode === "prefix") this.mode = "terminal";
  }

  goToProc(procId: string) {
    const at = this.paneOfProc(procId);
    if (!at) return;
    this.envId = at.tab.env;
    this.shown.set(at.tab.env, at.tab.id);
    at.tab.focused = at.pane.id;
    if (at.tab.zoomed) at.tab.zoomed = at.pane.id;
    this.mode = "terminal";
  }

  closePane(id: string) {
    const tab = this.tabs.find((t) => layout.panes(t.root).includes(id));
    const pane = this.panes.get(id);
    if (!tab || !pane) return;
    this.panes.delete(id);
    this.procs.delete(pane.proc);
    const root = layout.remove(tab.root, id);
    if (!root) {
      const sibs = this.tabsOf(tab.env);
      const i = sibs.indexOf(tab);
      this.tabs = this.tabs.filter((t) => t !== tab);
      const rest = this.tabsOf(tab.env);
      if (rest.length > 0) this.shown.set(tab.env, rest[Math.min(i, rest.length - 1)].id);
      else this.shown.delete(tab.env);
      return;
    }
    tab.root = root;
    if (tab.zoomed === id) tab.zoomed = undefined;
    if (tab.focused === id) tab.focused = layout.panes(root)[0];
  }

  // --- detach: the point of Hive ---

  detach() {
    this.detached = true;
    this.away = 0;
    this.mode = "terminal";
    this.overlay = null;
    const n = this.allProcs().filter((p) => p.prog.status === "running").length;
    this.outer.lines.push(
      [{ t: "$ ", c: "green" }, { t: "hive ui" }],
      [{ t: `[detached from session default · ${n} processes keep running]`, c: "dim" }],
      [{ t: "Close the tab, the laptop, the SSH connection: nothing stops. Come back with ", c: "dim" }, { t: "hive", c: "yellow" }, { t: ".", c: "dim" }],
    );
  }

  private outerKey(k: string) {
    const o = this.outer;
    if (k === "enter") {
      const cmd = o.input.trim();
      o.input = "";
      o.lines.push([{ t: "$ ", c: "green" }, { t: cmd }]);
      if (/^hive( ui| attach)?$/.test(cmd)) {
        this.detached = false;
        o.lines = [];
        this.toast(this.away > 0 ? `Welcome back · ${this.away} agent update${this.away === 1 ? "" : "s"} while you were away` : "Welcome back · everything kept running", "info");
      } else if (/^hive (agent list|agents|ps|status)$/.test(cmd)) {
        o.lines.push(...this.agentsTable());
      } else if (cmd === "clear") {
        o.lines = [];
      } else if (cmd) {
        const name = cmd.split(/\s+/)[0];
        o.lines.push(name === "hive" ? [{ t: "try: hive  or  hive agent list", c: "dim" }] : [{ t: `zsh: command not found: ${name}` }]);
      }
    } else if (k === "backspace") {
      o.input = [...o.input].slice(0, -1).join("");
    } else if (k === "ctrl+c") {
      o.lines.push([{ t: "$ ", c: "green" }, { t: o.input }, { t: "^C", c: "dim" }]);
      o.input = "";
    } else if ([...k].length === 1) {
      o.input += k;
    }
    if (o.lines.length > 200) o.lines.splice(0, 100);
  }

  // --- boxes ---

  /** The picker's choices, filtered: every pane, by environment and tab. */
  pickerItems(filter: string): Proc[] {
    const f = filter.toLowerCase();
    return this.allProcs().filter((p) => {
      const at = this.paneOfProc(p.id);
      const label = `${p.env} / ${at?.tab.name ?? ""} / ${this.name(p)} ${this.statusText(p)}`.toLowerCase();
      let i = 0;
      for (const ch of label) if (ch === f[i]) i++;
      return i === f.length;
    });
  }

  private overlayKey(o: Overlay, k: string) {
    const close = () => (this.overlay = null);
    const edit = (v: string) => (k === "backspace" ? [...v].slice(0, -1).join("") : [...k].length === 1 ? v + k : v);
    switch (o.kind) {
      case "help":
        if (k === "esc" || k === "ctrl+c") close();
        else if (k === "up" || k === "down") o.scroll = Math.max(0, o.scroll + (k === "up" ? -1 : 1));
        else {
          o.filter = edit(o.filter);
          o.scroll = 0;
        }
        return;
      case "overview": {
        const all = this.allProcs();
        if (k === "esc" || k === "q" || k === "O" || k === "ctrl+c") close();
        else if (k === "up" || k === "k") o.sel = Math.max(0, o.sel - 1);
        else if (k === "down" || k === "j") o.sel = Math.min(all.length - 1, o.sel + 1);
        else if (k === "enter") {
          const p = all[o.sel];
          close();
          if (p) this.goToProc(p.id);
        } else if (k === "x") {
          const p = all[o.sel];
          if (p && p.prog.status === "running") {
            p.prog.status = "exited";
            p.prog.exitCode = 130;
            this.toast(`Stopped ${this.name(p)}`, "info");
          }
        }
        return;
      }
      case "picker": {
        const items = this.pickerItems(o.filter);
        if (k === "esc" || k === "ctrl+c") close();
        else if (k === "up") o.sel = Math.max(0, o.sel - 1);
        else if (k === "down") o.sel = Math.min(items.length - 1, o.sel + 1);
        else if (k === "enter") {
          const p = items[o.sel];
          close();
          if (p) this.goToProc(p.id);
        } else {
          o.filter = edit(o.filter);
          o.sel = 0;
        }
        return;
      }
      case "confirm":
        if (k === "y" || k === "enter") {
          close();
          o.yes();
        } else if (k === "n" || k === "esc" || k === "ctrl+c") close();
        return;
      case "prompt":
        if (k === "enter") {
          close();
          o.ok(o.value.trim());
        } else if (k === "esc" || k === "ctrl+c") close();
        else o.value = edit(o.value);
        return;
    }
  }
}

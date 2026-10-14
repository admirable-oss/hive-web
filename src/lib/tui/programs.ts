/**
 * The programs that run in the demo's panes: a shell, two agents (in the
 * style of Claude Code and Codex) working through scripted tasks, and logs.
 * Each draws its own screen for a pane size, like a program in a PTY.
 */
import type { Color } from "./theme";

export type Seg = { t: string; c?: Color; b?: boolean };
export type Line = Seg[];

export interface View {
  lines: Line[];
  cursor?: { x: number; y: number };
}

export type AgentState = "working" | "blocked" | "done" | "idle";

/** What a program can ask of the session it runs in. */
export interface Host {
  replace(from: Program, to: Program): void;
  stateChanged(p: Program, prev: AgentState | undefined): void;
  agentsTable(): Line[];
}

export abstract class Program {
  abstract readonly kind: "shell" | "claude" | "codex" | "logs";
  abstract title: string;
  status: "running" | "exited" = "running";
  exitCode = 0;
  state?: AgentState;
  /** When the agent's current state began, in session seconds. */
  since = 0;
  /** Bumped on every visible change: the tab bar's activity mark. */
  version = 0;
  /** The shell this program was started from, which comes back when it exits. */
  parent?: Shell;

  constructor(protected host: Host) {}

  tick(_now: number) {}
  key(_k: string) {}
  /** Its pane was looked at: a done agent becomes idle. */
  seen(_now: number) {}
  abstract view(w: number, h: number): View;

  protected touch() {
    this.version++;
  }

  protected setState(s: AgentState, now: number) {
    if (this.state === s) return;
    const prev = this.state;
    this.state = s;
    this.since = now;
    this.touch();
    this.host.stateChanged(this, prev);
  }

  /** Leaves for the parent shell (^C), or exits. */
  protected quit(goodbye?: Line) {
    if (this.parent) {
      if (goodbye) this.parent.print(goodbye);
      this.parent.ready();
      this.host.replace(this, this.parent);
    } else {
      this.status = "exited";
      this.touch();
    }
  }
}

// --- text helpers ---

const text = (l: Line) => l.map((s) => s.t).join("");

/** Soft-wraps a line to w columns. */
export function wrap(line: Line, w: number): Line[] {
  if (w <= 0) return [];
  const out: Line[] = [];
  let cur: Line = [];
  let n = 0;
  for (const seg of line) {
    let rest = [...seg.t];
    while (rest.length > 0) {
      const room = w - n;
      const take = rest.slice(0, room);
      cur.push({ ...seg, t: take.join("") });
      n += take.length;
      rest = rest.slice(room);
      if (n >= w && rest.length > 0) {
        out.push(cur);
        cur = [];
        n = 0;
      }
    }
  }
  out.push(cur);
  return out;
}

const wrapAll = (lines: Line[], w: number) => lines.flatMap((l) => wrap(l, w));

/** The last h lines, as a terminal shows them once it scrolls. */
const tail = (lines: Line[], h: number) => (lines.length > h ? lines.slice(lines.length - h) : lines);

const len = (l: Line) => [...text(l)].length;

// --- shell ---

interface Job {
  at: number;
  line?: Line;
  run?: () => void;
}

export class Shell extends Program {
  readonly kind = "shell";
  title = "zsh";
  private out: Line[] = [];
  private input = "";
  private jobs: Job[] = [];
  private history: string[] = [];
  private hpos = 0;
  private now = 0;

  constructor(
    host: Host,
    private cwd: string,
    private readonly branch: string,
    motd: Line[] = [],
  ) {
    super(host);
    this.out.push(...motd);
  }

  prompt(): Line {
    return [
      { t: this.cwd, c: "cyan" },
      { t: ` ${this.branch}`, c: "orange" },
      { t: " ❯ ", c: "green" },
    ];
  }

  /** Empty prompt, no running job — demo page may treat ^C as “exit”. */
  atEmptyPrompt() {
    return this.status === "running" && !this.busy && this.input === "";
  }

  print(l: Line) {
    this.out.push(l);
    this.touch();
  }

  /** Back at the prompt (after a program it started exits). */
  ready() {
    this.jobs = [];
    this.title = "zsh";
    this.touch();
  }

  /** Types and runs a command, as the user would. */
  run(cmd: string) {
    this.print([...this.prompt(), { t: cmd }]);
    this.exec(cmd.trim());
  }

  private get busy() {
    return this.jobs.length > 0;
  }

  tick(now: number) {
    this.now = now;
    while (this.jobs.length > 0 && this.jobs[0].at <= now) {
      const j = this.jobs.shift()!;
      if (j.line) this.print(j.line);
      j.run?.();
    }
  }

  key(k: string) {
    if (this.status !== "running") return;
    if (k === "ctrl+c") {
      this.print([...(this.busy ? [] : this.prompt()), { t: this.input }, { t: "^C", c: "dim" }]);
      this.jobs = [];
      this.title = "zsh";
      this.input = "";
      return;
    }
    if (k === "ctrl+l") {
      this.out = [];
      this.touch();
      return;
    }
    if (this.busy) return;
    switch (k) {
      case "enter": {
        const cmd = this.input;
        this.input = "";
        this.print([...this.prompt(), { t: cmd }]);
        if (cmd.trim()) this.history.push(cmd);
        this.hpos = this.history.length;
        this.exec(cmd.trim());
        return;
      }
      case "backspace":
        this.input = [...this.input].slice(0, -1).join("");
        break;
      case "up":
        if (this.hpos > 0) this.input = this.history[--this.hpos];
        break;
      case "down":
        this.hpos = Math.min(this.history.length, this.hpos + 1);
        this.input = this.history[this.hpos] ?? "";
        break;
      default:
        if ([...k].length === 1) this.input += k;
        else return;
    }
    this.touch();
  }

  view(w: number, h: number): View {
    const lines = wrapAll(this.out, w);
    let cursor: View["cursor"];
    if (!this.busy && this.status === "running") {
      const inputLines = wrap([...this.prompt(), { t: this.input }], w);
      lines.push(...inputLines);
      const last = inputLines[inputLines.length - 1];
      const shown = tail(lines, h);
      cursor = { x: Math.min(len(last), w - 1), y: shown.length - 1 };
      return { lines: shown, cursor };
    }
    return { lines: tail(lines, h) };
  }

  /** Lines printed one after another, step seconds apart. */
  private later(lines: (Line | (() => void))[], step = 0.35) {
    let at = this.now;
    for (const l of lines) {
      at += step;
      this.jobs.push(typeof l === "function" ? { at, run: l } : { at, line: l });
    }
  }

  private exec(cmd: string) {
    const [name, ...args] = cmd.split(/\s+/);
    const rest = cmd.slice(name.length).trim();
    const say = (...ls: (string | Line)[]) => ls.forEach((l) => this.print(typeof l === "string" ? [{ t: l }] : l));
    const web = this.cwd.endsWith("web");

    switch (name) {
      case "":
        return;
      case "help":
        say(
          [{ t: "This is a simulation of a shell in a Hive pane. Try:", c: "dim" }],
          [{ t: "  claude ", c: "orange" }, { t: "<task>", c: "dim" }, { t: "     start an agent here" }],
          [{ t: "  codex ", c: "cyan" }, { t: "<task>", c: "dim" }, { t: "      or another one" }],
          [{ t: "  hive agent list", c: "yellow" }, { t: "  every agent, every environment" }],
          [{ t: "  npm test", c: "green" }, { t: "         run the tests" }],
          [{ t: "  cd  ls  git status  clear  exit", c: "dim" }],
          [{ t: "Then ctrl+b d to detach: everything keeps running.", c: "dim" }],
        );
        return;
      case "clear":
        this.out = [];
        this.touch();
        return;
      case "ls":
        say(
          web
            ? [{ t: "src/  public/  ", c: "blue" }, { t: "astro.config.mjs  package.json  README.md" }]
            : [{ t: "auth/  cmd/  store/  ", c: "blue" }, { t: "go.mod  go.sum  Makefile  README.md" }],
        );
        return;
      case "pwd":
        say(this.cwd.replace("~", "/home/you"));
        return;
      case "cd": {
        const target = rest.trim() || "~";
        if (target === "~" || target === "~/") {
          this.cwd = this.cwd.includes("web") ? "~/acme/web" : "~/acme/api";
        } else if (target === "..") {
          this.cwd = this.cwd.endsWith("web") ? "~/acme" : "~";
        } else if (target.startsWith("~/")) {
          this.cwd = target;
        } else if (target === "web" || target === "api") {
          this.cwd = target === "web" ? "~/acme/web" : "~/acme/api";
        } else {
          say(`cd: no such file or directory: ${target}`);
          return;
        }
        this.touch();
        return;
      }
      case "bash":
      case "zsh":
        if (!rest) return;
        this.exec(rest);
        return;
      case "whoami":
        say("you");
        return;
      case "date":
        say(new Date().toString());
        return;
      case "echo":
        say(rest);
        return;
      case "git":
        if (args[0] === "log") {
          say(
            [{ t: "a41f2c9 ", c: "yellow" }, { t: "store: sessions behind an interface" }],
            [{ t: "77e01bd ", c: "yellow" }, { t: "auth: rotate signing keys" }],
            [{ t: "1c9d3a0 ", c: "yellow" }, { t: "initial import" }],
          );
        } else if (args[0] === "status" || args.length === 0) {
          say(
            `On branch ${this.branch.replace(/ .*/, "")}`,
            "Changes not staged for commit:",
            [{ t: web ? "\tmodified:   src/components/Hero.tsx" : "\tmodified:   store/session.go", c: "red" }],
          );
        } else {
          say(`git ${rest}: not in this demo`);
        }
        return;
      case "npm":
      case "bun":
      case "make":
      case "go":
        if (!/test/.test(rest) && !(name === "go" && args[0] === "test")) {
          say(`${name} ${rest}: not in this demo (try npm test)`);
          return;
        }
        this.title = name;
        this.later(
          web
            ? [
                [{ t: " ✓ ", c: "green" }, { t: "src/lib/site.test.ts ", c: "dim" }, { t: "(4 tests)" }],
                [{ t: " ✓ ", c: "green" }, { t: "src/components/Hero.test.tsx ", c: "dim" }, { t: "(9 tests)" }],
                [],
                [{ t: " Test Files  ", c: "dim" }, { t: "2 passed", c: "green" }],
                [{ t: "      Tests  ", c: "dim" }, { t: "13 passed", c: "green" }],
                () => (this.title = "zsh"),
              ]
            : [
                [{ t: "ok  ", c: "green" }, { t: "\tacme/api/auth\t0.284s" }],
                [{ t: "ok  ", c: "green" }, { t: "\tacme/api/store\t0.412s" }],
                [{ t: "ok  ", c: "green" }, { t: "\tacme/api/cmd/api\t0.093s" }],
                () => (this.title = "zsh"),
              ],
          0.5,
        );
        return;
      case "claude":
      case "codex": {
        const agent = new Agent(this.host, name, this.cwd);
        agent.parent = this;
        this.host.replace(this, agent);
        if (rest) agent.ask(rest.replace(/^["']|["']$/g, ""), "type");
        return;
      }
      case "tail":
        this.host.replace(this, Object.assign(new Logs(this.host, "tail", apiLog), { parent: this }));
        return;
      case "hive": {
        const sub = args.join(" ");
        if (/^(agent list|agents|ps|status)$/.test(sub)) {
          this.host.agentsTable().forEach((l) => this.print(l));
        } else if (sub === "ui") {
          say([{ t: "You're in it.", c: "dim" }, { t: " ctrl+b d detaches; agents keep running." }]);
        } else {
          say(
            [{ t: "hive", b: true }, { t: " runs coding agents that keep working when you close the terminal." }],
            [{ t: "  hive ui", c: "yellow" }, { t: "            open the multiplexer" }],
            [{ t: "  hive agent list", c: "yellow" }, { t: "    every agent and its state" }],
            [{ t: "  hive agent start", c: "yellow" }, { t: "   start one from a script or another agent" }],
            [{ t: "  hive --remote host", c: "yellow" }, { t: " the same, on another machine" }],
          );
        }
        return;
      }
      case "exit":
        this.status = "exited";
        this.exitCode = 0;
        this.touch();
        return;
      case "sudo":
        say("sudo: this shell lives in your browser");
        return;
      case "vim":
      case "nvim":
      case "nano":
      case "emacs":
        say(`${name}: no editor in this demo (in Hive, ctrl+b e opens a pane's scrollback in $EDITOR)`);
        return;
      default:
        say(`zsh: command not found: ${name}`);
    }
  }
}

// --- agents ---

type Flavor = "claude" | "codex";

/** One beat of an agent's work. */
type Step =
  | { d: number; verb?: string; out: Line[] }
  | { d: number; ask: { what: string; detail: string; question: string; yes: Step[]; no: Step[] } }
  | { d: number; done: string };

const look = {
  claude: {
    user: (t: string): Line => [{ t: "> ", c: "dim" }, { t, c: "dim" }],
    say: (t: string): Line => [{ t: "⏺ " }, { t }],
    tool: (name: string, arg: string): Line => [{ t: "⏺ ", c: "green" }, { t: name, b: true }, { t: `(${arg})` }],
    result: (t: string, c: Color = "dim"): Line => [{ t: "  ⎿  ", c: "dim" }, { t, c }],
  },
  codex: {
    user: (t: string): Line => [{ t: "▌ ", c: "cyan" }, { t }],
    say: (t: string): Line => [{ t: "• " }, { t }],
    tool: (name: string, arg: string): Line => [{ t: "• ", c: "green" }, { t: `${name} `, b: true }, { t: arg }],
    result: (t: string, c: Color = "dim"): Line => [{ t: "  └ ", c: "dim" }, { t, c }],
  },
} as const;

/** The scripted work for a task, chosen by what it asks for. */
export function plan(f: Flavor, task: string, cwd: string): Step[] {
  const L = look[f];
  const t = task.toLowerCase();
  const web = cwd.endsWith("web");
  const file = web ? "src/components/Hero.tsx" : "store/session.go";
  const test = web ? "npm test" : "go test ./...";
  const tested: Step[] = [
    { d: 1.1, verb: "Running", out: [L.tool(f === "claude" ? "Bash" : "Ran", test)] },
    { d: 2.2, out: [L.result(web ? "13 passed" : "ok  acme/api/...  48 passed", "green")] },
  ];

  if (/deploy|push|ship|release|merge|\bpr\b/.test(t)) {
    return [
      { d: 0.8, out: [L.say("I'll commit the change and push the branch.")] },
      { d: 1.2, verb: "Running", out: [L.tool(f === "claude" ? "Bash" : "Ran", "git commit -am \"store: sessions in redis\""), L.result("[main a41f2c9] 2 files changed")] },
      {
        d: 1.0,
        ask: {
          what: "Bash command",
          detail: "git push origin main",
          question: "Do you want to proceed?",
          yes: [
            { d: 1.6, out: [L.result("main -> main")] },
            { d: 0.8, done: "Pushed. CI is running on a41f2c9." },
          ],
          no: [{ d: 0.6, done: "Okay, not pushed. The commit is local." }],
        },
      },
    ];
  }
  if (/explain|what|how|why|\?/.test(t)) {
    return [
      { d: 0.9, verb: "Reading", out: [L.tool("Read", file), L.result("Read 142 lines")] },
      { d: 1.3, out: [L.tool("Read", web ? "src/lib/site.ts" : "store/redis.go"), L.result("Read 88 lines")] },
      {
        d: 1.8,
        done: web
          ? "The hero is one React island: copy on top, a 3D floor below, and the install command wired to analytics."
          : "Sessions sit behind a Store interface: memstore for tests, redis in production. Keys rotate every 24h.",
      },
    ];
  }
  if (/fix|bug|error|broken|fail|flak/.test(t)) {
    return [
      { d: 0.8, out: [L.say("Let me reproduce it first.")] },
      { d: 1.0, verb: "Running", out: [L.tool(f === "claude" ? "Bash" : "Ran", `${test} -run Session`)] },
      { d: 2.0, out: [L.result("FAIL TestSessionExpiry (0.01s)", "red")] },
      { d: 1.4, verb: "Editing", out: [L.tool(f === "claude" ? "Update" : "Edited", file), L.result("compare expiry in UTC")] },
      ...tested,
      { d: 0.8, done: `Fixed: expiry compared local time with UTC. ${web ? "13/13" : "48/48"} tests pass.` },
    ];
  }
  if (/test|spec|green|coverage/.test(t)) {
    return [...tested, { d: 0.8, done: "All green. Nothing to change." }];
  }
  return [
    { d: 0.8, out: [L.say(`I'll ${task.replace(/[.!]+$/, "")}.`)] },
    { d: 1.2, verb: "Reading", out: [L.tool("Read", file), L.result("Read 142 lines")] },
    { d: 1.6, verb: "Editing", out: [L.tool(f === "claude" ? "Update" : "Edited", file), L.result("Updated with 12 additions and 4 removals")] },
    ...tested,
    { d: 0.8, done: `Done: ${task.replace(/[.!]+$/, "")}. One file changed, tests pass.` },
  ];
}

/** The two agents the demo starts with, part way through real work. */
export const SCRIPTS = {
  redis: (f: Flavor): Step[] => {
    const L = look[f];
    return [
      { d: 0.6, out: [L.say("I'll move sessions from process memory to Redis, behind the same Store interface.")] },
      { d: 1.3, verb: "Reading", out: [L.tool("Read", "store/session.go"), L.result("Read 142 lines")] },
      { d: 1.2, out: [L.tool("Read", "store/memstore.go"), L.result("Read 61 lines")] },
      { d: 1.8, verb: "Editing", out: [L.tool("Write", "store/redis.go"), L.result("Wrote 88 lines to store/redis.go")] },
      { d: 1.6, out: [L.tool("Update", "store/session.go"), L.result("Updated store/session.go with 24 additions and 9 removals")] },
      { d: 1.2, verb: "Running", out: [L.tool("Bash", "go test ./store/...")] },
      { d: 2.6, out: [L.result("ok  acme/api/store  0.412s", "green")] },
      { d: 1.4, verb: "Editing", out: [L.tool("Update", "auth/session_test.go"), L.result("Updated auth/session_test.go with 31 additions")] },
      { d: 1.2, verb: "Running", out: [L.tool("Bash", "go test ./...")] },
      { d: 2.8, out: [L.result("ok  acme/api/...  48 passed", "green")] },
      { d: 1.0, done: "Sessions now live in Redis. A restart or reattach resumes mid-request. 48/48 tests pass." },
    ];
  },
  flaky: (f: Flavor): Step[] => {
    const L = look[f];
    return [
      { d: 1.2, verb: "Running", out: [L.tool("Ran", "go test ./auth/... -count=20")] },
      { d: 3.0, out: [L.result("FAIL TestRotateKey (1 of 20 runs)", "red")] },
      { d: 1.6, out: [L.say("Rotation reads time.Now() and races the clock at second boundaries.")] },
      { d: 2.0, verb: "Editing", out: [L.tool("Edited", "auth/rotate.go (+6 -2)"), L.result("rotation takes a clock; the test pins it")] },
      { d: 1.4, verb: "Running", out: [L.tool("Ran", "go test ./auth/... -count=50")] },
      { d: 4.2, out: [L.result("ok  acme/api/auth  3.1s", "green")] },
      { d: 1.0, done: "Fixed the flake: 50/50 runs pass." },
    ];
  },
  hero: (f: Flavor): Step[] => {
    const L = look[f];
    return [
      { d: 0.2, out: [L.say("I'll shorten the hero subhead and put the install command first.")] },
      { d: 0.4, out: [L.tool("Read", "src/components/Hero.tsx"), L.result("Read 80 lines")] },
      {
        d: 0.4,
        ask: {
          what: "Edit file",
          detail: "src/components/Hero.tsx",
          question: "Do you want to make this edit to Hero.tsx?",
          yes: [
            { d: 0.8, verb: "Editing", out: [L.result("Updated src/components/Hero.tsx with 7 additions and 5 removals")] },
            { d: 1.0, verb: "Running", out: [L.tool("Bash", "npm run build")] },
            { d: 2.4, out: [L.result("✓ built in 2.41s", "green")] },
            { d: 0.8, done: "Hero updated: shorter subhead, install command first. The build passes." },
          ],
          no: [{ d: 0.6, done: "Okay, Hero.tsx stays as it is. Tell me what you'd like instead." }],
        },
      },
    ];
  },
};

export class Agent extends Program {
  title: string;
  private out: Line[] = [];
  private steps: Step[] = [];
  private wait = 0;
  private verb = "Thinking";
  private started = 0;
  private now = 0;
  private input = "";
  private pending: Extract<Step, { ask: unknown }>["ask"] | null = null;
  private choice = 0;

  constructor(
    host: Host,
    readonly kind: Flavor,
    private readonly cwd: string,
  ) {
    super(host);
    this.title = kind;
    this.state = "idle";
  }

  private get L() {
    return look[this.kind];
  }

  hasInput() {
    return this.input.length > 0 || this.pending !== null;
  }

  /** Gives the agent a task: typed (shows in the transcript) or from a script. */
  ask(task: string, how: "type" | Step[]) {
    this.out.push(this.L.user(task), []);
    this.steps = how === "type" ? plan(this.kind, task, this.cwd) : how;
    this.wait = this.steps[0]?.d ?? 0;
    this.started = this.now;
    this.verb = "Thinking";
    this.setState("working", this.now);
  }

  tick(now: number) {
    const dt = now - this.now;
    this.now = now;
    if (this.state !== "working") return;
    this.wait -= dt;
    this.touch(); // the spinner's clock
    while (this.state === "working" && this.wait <= 0 && this.steps.length > 0) {
      const s = this.steps.shift()!;
      if ("out" in s) {
        this.out.push(...s.out);
        if (s.verb) this.verb = s.verb;
      } else if ("ask" in s) {
        this.pending = s.ask;
        this.choice = 0;
        this.out.push(this.L.tool(s.ask.what === "Edit file" ? "Update" : "Bash", s.ask.detail));
        this.setState("blocked", now);
        return;
      } else {
        this.out.push(this.L.say(s.done), []);
        this.setState("done", now);
        return;
      }
      this.wait += this.steps[0]?.d ?? 0;
    }
  }

  seen(now: number) {
    if (this.state === "done") this.setState("idle", now);
  }

  key(k: string) {
    if (this.pending) {
      const answer = (yes: boolean) => {
        const p = this.pending!;
        this.pending = null;
        if (!yes) this.out.push(this.L.result("User declined", "red"));
        this.steps = yes ? p.yes : p.no;
        this.wait = this.steps[0]?.d ?? 0;
        this.setState("working", this.now);
      };
      if (k === "1" || k === "y") answer(true);
      else if (k === "2" || k === "n" || k === "esc") answer(false);
      else if (k === "up" || k === "down") this.choice = 1 - this.choice;
      else if (k === "enter") answer(this.choice === 0);
      this.touch();
      return;
    }
    if (k === "esc" && this.state === "working") {
      this.steps = [];
      this.out.push(this.L.result("Interrupted by user", "red"), []);
      this.setState("idle", this.now);
      return;
    }
    if (k === "ctrl+c" || k === "ctrl+d") {
      if (this.input) this.input = "";
      else this.quit([{ t: this.kind === "claude" ? "Bye!" : "Session ended.", c: "dim" }]);
      this.touch();
      return;
    }
    if (k === "enter") {
      const task = this.input.trim();
      this.input = "";
      if (task === "/exit" || task === "exit") this.quit([{ t: "Bye!", c: "dim" }]);
      else if (task && this.state !== "working") this.ask(task, "type");
      this.touch();
      return;
    }
    if (k === "backspace") this.input = [...this.input].slice(0, -1).join("");
    else if ([...k].length === 1) this.input += k;
    else return;
    this.touch();
  }

  view(w: number, h: number): View {
    const body: Line[] = [...this.banner(w), ...wrapAll(this.out, w)];
    const foot: Line[] = [];
    let cursor: { x: number; y: number } | undefined;

    if (this.pending) {
      foot.push(...this.permission(w));
    } else {
      if (this.state === "working") {
        const secs = Math.max(0, Math.floor(this.now - this.started));
        foot.push(
          this.kind === "claude"
            ? [{ t: `${"✻✳✢·".charAt(Math.floor(this.now * 4) % 4)} `, c: "orange" }, { t: `${this.verb}… `, c: "orange" }, { t: `(${secs}s · esc to interrupt)`, c: "dim" }]
            : [{ t: "◦ ", c: "cyan" }, { t: "Working ", b: true }, { t: `(${secs}s • esc to interrupt)`, c: "dim" }],
          [],
        );
      }
      const prompt = this.kind === "claude" ? "> " : "› ";
      const room = Math.max(4, w - 4);
      const shown = [...this.input].slice(-(room - prompt.length)).join("");
      if (this.kind === "claude" && w >= 12) {
        const iw = w - 2;
        foot.push(
          [{ t: "╭" + "─".repeat(iw) + "╮", c: "dim" }],
          [{ t: "│ ", c: "dim" }, { t: prompt + shown + " ".repeat(Math.max(0, iw - 2 - prompt.length - [...shown].length)) }, { t: " │", c: "dim" }],
          [{ t: "╰" + "─".repeat(iw) + "╯", c: "dim" }],
          [{ t: "  ? for shortcuts", c: "dim" }],
        );
        cursor = { x: 2 + prompt.length + [...shown].length, y: -3 };
      } else {
        foot.push([{ t: prompt, c: "cyan" }, { t: shown }], [{ t: "  ⏎ send   ⌃C quit", c: "dim" }]);
        cursor = { x: prompt.length + [...shown].length, y: -2 };
      }
    }

    const room = Math.max(0, h - foot.length);
    const lines = [...tail(body, room), ...foot];
    if (cursor) cursor = { x: Math.min(cursor.x, w - 1), y: lines.length + cursor.y };
    return { lines, cursor: this.pending ? undefined : cursor };
  }

  private banner(w: number): Line[] {
    if (this.kind === "codex") {
      return [
        [{ t: ">_ ", c: "dim" }, { t: "OpenAI Codex", b: true }, { t: " (research preview)", c: "dim" }],
        [{ t: `   dir: ${this.cwd}`, c: "dim" }],
        [],
      ];
    }
    const bw = Math.min(w, 46);
    if (bw < 20) return [[{ t: "✻ ", c: "orange" }, { t: "Claude Code", b: true }], []];
    const row = (l: Line): Line => [{ t: "│ ", c: "orange" }, ...l, { t: " ".repeat(Math.max(0, bw - 4 - len(l))) }, { t: " │", c: "orange" }];
    return [
      [{ t: "╭" + "─".repeat(bw - 2) + "╮", c: "orange" }],
      row([{ t: "✻ ", c: "orange" }, { t: "Welcome to Claude Code!", b: true }]),
      row([{ t: `  cwd: ${this.cwd}`, c: "dim" }]),
      [{ t: "╰" + "─".repeat(bw - 2) + "╯", c: "orange" }],
      [],
    ];
  }

  private permission(w: number): Line[] {
    const p = this.pending!;
    const bw = Math.max(16, Math.min(w, 60));
    const row = (l: Line): Line => [{ t: "│ ", c: "yellow" }, ...l, { t: " ".repeat(Math.max(0, bw - 4 - len(l))) }, { t: " │", c: "yellow" }];
    const opt = (i: number, t: string): Line => [{ t: this.choice === i ? "❯ " : "  ", c: "yellow" }, { t: `${i + 1}. ${t}`, c: this.choice === i ? "yellow" : "fg" }];
    return [
      [{ t: "╭" + "─".repeat(bw - 2) + "╮", c: "yellow" }],
      row([{ t: p.what, b: true }]),
      row([{ t: `  ${p.detail}`, c: "dim" }]),
      row([]),
      row([{ t: p.question }]),
      row(opt(0, "Yes")),
      row(opt(1, "No, and tell the agent what to do")),
      [{ t: "╰" + "─".repeat(bw - 2) + "╯", c: "yellow" }],
    ].flatMap((l) => wrap(l as Line, w));
  }
}

// --- logs ---

type LogLine = (n: number) => Line;

const clock = () => new Date().toTimeString().slice(0, 8);

export const apiLog: LogLine = (n) => {
  const routes = ["GET /v1/sessions", "POST /v1/sessions", "GET /v1/me", "POST /v1/auth/rotate", "GET /healthz", "DELETE /v1/sessions/7f2a"];
  const route = routes[(n * 7 + 3) % routes.length];
  const code = n % 23 === 11 ? 500 : n % 9 === 4 ? 401 : route.startsWith("POST") ? 201 : 200;
  const ms = 2 + ((n * 37) % 41);
  return [
    { t: `${clock()} `, c: "dim" },
    { t: route.padEnd(24) },
    { t: String(code), c: code >= 500 ? "red" : code >= 400 ? "yellow" : "green" },
    { t: ` ${ms}ms`, c: "dim" },
  ];
};

export const devServer: LogLine = (n) => {
  const files = ["src/components/Hero.tsx", "src/styles/global.css", "src/lib/site.ts"];
  return [
    { t: `${clock()} `, c: "dim" },
    { t: "[vite] ", c: "cyan" },
    { t: "hmr update ", c: "green" },
    { t: `/${files[n % files.length]}`, c: "dim" },
  ];
};

export class Logs extends Program {
  readonly kind = "logs";
  private out: Line[];
  private next = 0;
  private n = 0;

  constructor(
    host: Host,
    public title: string,
    private readonly line: LogLine,
    header: Line[] = [],
    private readonly every = 0.9,
  ) {
    super(host);
    this.out = [...header];
  }

  tick(now: number) {
    if (now < this.next) return;
    this.next = now + this.every * (0.5 + ((this.n * 13) % 10) / 10);
    this.out.push(this.line(this.n++));
    if (this.out.length > 400) this.out.splice(0, 200);
    this.touch();
  }

  key(k: string) {
    if (k === "ctrl+c") this.quit([{ t: "^C", c: "dim" }]);
  }

  view(w: number, h: number): View {
    return { lines: tail(wrapAll(this.out, w), h) };
  }
}

/**
 * Everything the runtime demo shows, in one place. The hero demo is a
 * scripted Hive session: an agent keeps working through a closed laptop.
 * `data-rt` keys in the components map to the timeline in use-runtime-demo.
 */
export const DEMO = {
  cwd: "~/acme/api",

  cells: [
    { id: "web", name: "web landing", detail: "master", glyph: "●" },
    { id: "api", name: "backend api", detail: "staging", glyph: "○" },
    {
      id: "auth",
      name: "auth-refactor",
      detail: "running · claude",
      glyph: "◆",
      // Swapped in when the job finishes and needs a human.
      then: "awaiting you",
    },
  ],

  agent: {
    name: "claude",
    prompt: "move sessions to redis and keep the suite green",
    reply: "On it. Sessions live in process memory today, so they die with it — moving them to redis so a reattach resumes mid-thought.",
    plan: ["store/session.go — swap memstore for a redis client", "auth/session.spec.ts — cover rotation on reattach"],
    event: ["lid closed", "cell detached", "agent still running"],
    prompt2: "back. status?",
    reply2: "48/48 passing. Branch pushed, PR #212 is up for review.",
  },

  tests: {
    runner: "bun test --watch",
    file: "src/auth/session.spec.ts",
    total: 48,
    covered: 31,
    cases: [
      ["encrypts token with key rotation", "1.2ms"],
      ["restores session after cell reattach", "0.8ms"],
      ["rejects forged actor claim", "2.1ms"],
    ] as const,
  },

  /** Elapsed runtime at loop start / end, in seconds. */
  elapsed: { from: 41 * 60 + 52, to: 42 * 60 + 11 },
} as const;

export const COVERAGE_BAR = 20;

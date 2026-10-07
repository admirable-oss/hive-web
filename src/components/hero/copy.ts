export const EYEBROW = "OPEN-SOURCE AGENT INFRASTRUCTURE";

export const HEADLINE_LABEL = "Close the laptop. The hive keeps going.";

/**
 * Headline segments and their decode timing (seconds after intro start).
 * `word` segments re-scramble on hover and can be painted by the mascot.
 */
export interface Segment {
  key: string;
  text: string;
  at: number;
  d: number;
  seed: number;
  word?: { base: string; weight: number };
}

export const LINE_ONE: Segment[] = [
  { key: "close", text: "Close the ", at: 0.35, d: 0.8, seed: 3 },
  { key: "laptop", text: "laptop", at: 0.5, d: 0.85, seed: 9, word: { base: "#EDEAE3", weight: 2 } },
];

export const LINE_TWO: Segment[] = [
  { key: "the", text: "The ", at: 0.95, d: 0.6, seed: 17 },
  { key: "hive", text: "hive", at: 1.0, d: 0.75, seed: 23, word: { base: "#8F8B82", weight: 3 } },
  { key: "keeps", text: " keeps ", at: 1.1, d: 0.7, seed: 31 },
  { key: "going", text: "going", at: 1.2, d: 0.8, seed: 41, word: { base: "#8F8B82", weight: 2 } },
];

export const SEGMENTS = [...LINE_ONE, ...LINE_TWO];

export const SUBHEAD =
  "Hive gives every coding agent its own persistent cell — terminal, workspace and context — so long jobs survive sleep, reboots and a dropped connection.";

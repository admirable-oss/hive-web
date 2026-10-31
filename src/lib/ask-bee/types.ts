/** A docs excerpt Bee answers from, found by Pagefind in the visitor's browser. */
export interface Source {
  title: string;
  /** Site path, with the section's anchor: /docs/use/plans/#a-plan-file */
  url: string;
  text: string;
}

export interface Turn {
  role: "user" | "bee";
  text: string;
}

export interface AskRequest {
  question: string;
  sources: Source[];
  /** Earlier turns of this conversation, oldest first. */
  history: Turn[];
}

/** What a provider is asked: the prompt is already built, it only generates. */
export interface Generation {
  system: string;
  history: Turn[];
  prompt: string;
  signal?: AbortSignal;
}

/** One LLM backend. Providers stream text; they know nothing about the docs. */
export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  stream(generation: Generation): AsyncIterable<string>;
}

/** Lines of the /api/ask-bee response (NDJSON). */
export type AskEvent =
  | { type: "delta"; text: string }
  | { type: "done"; cached: boolean }
  | { type: "error"; message: string };

/** A provider failure with an HTTP-like status, so the route can answer honestly. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

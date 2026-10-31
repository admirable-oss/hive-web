import { ASK_BEE_MODEL, ASK_BEE_PROVIDER, GEMINI_API_KEY } from "astro:env/server";
import { createGeminiProvider } from "./providers/gemini";
import type { LlmProvider } from "./types";

/**
 * Provider factories by ID. Adding a backend is one file in ./providers and
 * one line here; the route, prompt and UI do not change.
 */
const PROVIDERS = {
  gemini: () =>
    GEMINI_API_KEY ? createGeminiProvider({ apiKey: GEMINI_API_KEY, model: ASK_BEE_MODEL ?? "gemini-flash-lite-latest" }) : null,
} satisfies Record<string, () => LlmProvider | null>;

export type ProviderId = keyof typeof PROVIDERS;

let cached: LlmProvider | null | undefined;

/** The configured provider, built once per server instance; null when Bee has no key. */
export function getProvider(): LlmProvider | null {
  if (cached === undefined) {
    const id = (ASK_BEE_PROVIDER ?? "gemini") as ProviderId;
    const factory = PROVIDERS[id];
    if (!factory) throw new Error(`ASK_BEE_PROVIDER "${id}": want one of ${Object.keys(PROVIDERS).join(", ")}`);
    cached = factory();
  }
  return cached;
}

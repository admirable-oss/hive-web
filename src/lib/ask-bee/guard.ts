import { z } from "astro/zod";
import { LIMITS } from "./limits";
import type { AskRequest } from "./types";

const clip = (max: number) => z.string().trim().transform((s) => s.slice(0, max));

export const askSchema = z.object({
  question: z.string().trim().min(2).max(LIMITS.question),
  sources: z
    .array(
      z.object({
        title: clip(120),
        // Only pages of these docs: a source is cited back to the reader as a link.
        url: z.string().regex(/^\/docs\/[\w\-./#%]*$/),
        text: clip(LIMITS.sourceText),
      }),
    )
    .max(LIMITS.sources)
    .default([]),
  history: z
    .array(z.object({ role: z.enum(["user", "bee"]), text: clip(LIMITS.turnText) }))
    .default([])
    .transform((turns) => turns.slice(-LIMITS.history)),
});

/**
 * Sliding-window limit per client. In memory, so per server instance: it
 * stops a single visitor hammering a warm function, not a distributed attack.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return (key: string, now = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return true;
  };
}

/** Small LRU with expiry, for answers to first questions (no history). */
export function createAnswerCache({ max, ttlMs }: { max: number; ttlMs: number }) {
  const entries = new Map<string, { answer: string; at: number }>();
  return {
    get(key: string, now = Date.now()): string | undefined {
      const hit = entries.get(key);
      if (!hit) return undefined;
      entries.delete(key);
      if (now - hit.at > ttlMs) return undefined;
      entries.set(key, hit);
      return hit.answer;
    },
    set(key: string, answer: string, now = Date.now()) {
      entries.delete(key);
      entries.set(key, { answer, at: now });
      if (entries.size > max) entries.delete(entries.keys().next().value!);
    },
  };
}

/** The same question over the same pages gets the same cache key. */
export function cacheKey({ question, sources }: AskRequest): string {
  const q = question.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return `${q}\u0000${sources.map((s) => s.url).join("\u0000")}`;
}

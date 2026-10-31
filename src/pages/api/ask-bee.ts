import type { APIRoute } from "astro";
import { getProvider } from "@/lib/ask-bee/factory";
import { askSchema, cacheKey, createAnswerCache, createRateLimiter } from "@/lib/ask-bee/guard";
import { buildPrompt, SYSTEM } from "@/lib/ask-bee/prompt";
import { ProviderError, type AskEvent } from "@/lib/ask-bee/types";

export const prerender = false;

// Per warm instance: enough to stop one visitor from spending the quota.
const allow = createRateLimiter({ limit: 10, windowMs: 60_000 });
const answers = createAnswerCache({ max: 200, ttlMs: 60 * 60_000 });

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ type: "error", message } satisfies AskEvent), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/**
 * Bee answers a question from docs excerpts the browser found with Pagefind.
 * The answer streams back as NDJSON lines: delta… then done (or error).
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const provider = getProvider();
  if (!provider) return json(503, "Bee isn't connected: no model key is configured.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || clientAddress;
  if (!allow(ip)) return json(429, "Bee needs a breather. Try again in a minute.");

  const parsed = askSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "Bee couldn't read that question.");
  const ask = parsed.data;

  const key = ask.history.length ? null : cacheKey(ask);
  const hit = key ? answers.get(key) : undefined;

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      // The reader may be gone (tab closed); nothing to tell it then.
      const send = (event: AskEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {}
      };
      try {
        if (hit) {
          send({ type: "delta", text: hit });
          send({ type: "done", cached: true });
          return;
        }
        let answer = "";
        for await (const text of provider.stream({
          system: SYSTEM,
          history: ask.history,
          prompt: buildPrompt(ask.question, ask.sources),
          signal: request.signal,
        })) {
          answer += text;
          send({ type: "delta", text });
        }
        if (key && answer.trim()) answers.set(key, answer);
        send({ type: "done", cached: false });
      } catch (error) {
        if (!request.signal.aborted) {
          if (!(error instanceof ProviderError)) console.error("ask-bee:", error);
          send({ type: "error", message: error instanceof ProviderError ? error.message : "Bee failed to answer." });
        }
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

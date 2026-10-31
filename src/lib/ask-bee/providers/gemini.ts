import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentParameters, type ThinkingConfig } from "@google/genai";
import { ProviderError, type Generation, type LlmProvider } from "../types";

export interface GeminiOptions {
  apiKey: string;
  model: string;
  /** Longest wait for the whole answer; a stuck model must not hold the reader. */
  timeoutMs?: number;
}

/**
 * Gemini through Google's GenAI SDK. Docs answers need recall, not reasoning,
 * so thinking is kept to its minimum: the first token arrives sooner.
 */
export function createGeminiProvider({ apiKey, model, timeoutMs = 25_000 }: GeminiOptions): LlmProvider {
  const client = new GoogleGenAI({ apiKey });
  // Learned per instance: a model that refuses our thinking setting is asked without it.
  let thinking: ThinkingConfig | undefined = thinkingFor(model);

  return {
    id: "gemini",
    model,
    async *stream({ system, history, prompt, signal }: Generation) {
      const timeout = AbortSignal.timeout(timeoutMs);
      const abortSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      const request = (): GenerateContentParameters => ({
        model,
        contents: [
          ...history.map((turn) => ({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.text }],
          })),
          { role: "user", parts: [{ text: prompt }] },
        ],
        config: { systemInstruction: system, maxOutputTokens: 1024, thinkingConfig: thinking, abortSignal },
      });

      try {
        let stream;
        try {
          stream = await client.models.generateContentStream(request());
        } catch (error) {
          if (!(thinking && error instanceof ApiError && error.status === 400 && /thinking/i.test(error.message))) throw error;
          thinking = undefined;
          stream = await client.models.generateContentStream(request());
        }
        for await (const chunk of stream) {
          if (chunk.text) yield chunk.text;
        }
      } catch (error) {
        throw timeout.aborted ? new ProviderError("Bee took too long to answer. Try again.", 504) : toProviderError(error);
      }
    },
  };
}

/** Gemini 2.x takes a token budget; later models take a level. */
function thinkingFor(model: string): ThinkingConfig {
  return /gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: ThinkingLevel.MINIMAL };
}

function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  if (error instanceof ApiError) {
    if (error.status === 429 || error.status === 402) {
      return new ProviderError("Bee is out of breath (the model's quota is used up). Try again later.", 503);
    }
    if (error.status === 401 || error.status === 403) {
      return new ProviderError("Bee's model key was refused.", 503);
    }
    return new ProviderError("The model failed to answer.", 502);
  }
  if (error instanceof Error && error.name === "AbortError") return new ProviderError("Cancelled.", 499);
  return new ProviderError("The model failed to answer.", 502);
}

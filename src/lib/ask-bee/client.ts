import type { AskEvent, AskRequest } from "./types";

/** Asks /api/ask-bee and yields its events as they stream in. */
export async function* ask(request: AskRequest, signal: AbortSignal): AsyncGenerator<AskEvent> {
  const response = await fetch("/api/ask-bee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok || !response.body) {
    const error = (await response.json().catch(() => null)) as AskEvent | null;
    yield error?.type === "error" ? error : { type: "error", message: `Bee is unavailable (${response.status}).` };
    return;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as AskEvent;
  }
  if (buffer.trim()) yield JSON.parse(buffer) as AskEvent;
}

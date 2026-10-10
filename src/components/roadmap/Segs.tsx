import { segs } from "@/lib/roadmap/parse";

/** Markdown-lite inline text: `code` in mono, **bold** brightened. */
export function Segs({ text }: { text: string }) {
  return (
    <>
      {segs(text).map((s, i) =>
        s.kind === "code" ? (
          <code key={i} className="font-mono text-[.88em] text-bone">
            {s.t}
          </code>
        ) : s.kind === "bold" ? (
          <span key={i} className="text-bone">
            {s.t}
          </span>
        ) : (
          <span key={i}>{s.t}</span>
        ),
      )}
    </>
  );
}

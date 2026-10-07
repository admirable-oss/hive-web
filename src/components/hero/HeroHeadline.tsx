import { HEADLINE_LABEL, LINE_ONE, LINE_TWO, type Segment } from "./copy";

function Seg({ s }: { s: Segment }) {
  if (!s.word) return <span data-seg={s.key}>{s.text}</span>;
  return (
    <span
      data-seg={s.key}
      data-mascot-word={s.key}
      data-mascot-base={s.word.base}
      data-mascot-weight={s.word.weight}
      data-mascot-target={s.key === "hive" ? "word:hive" : undefined}
      className="pointer-events-auto"
    >
      {s.text}
    </span>
  );
}

/**
 * Server-rendered with the final copy (SEO / no-JS); the intro timeline
 * decodes it in place. Screen readers get the clean `aria-label`.
 */
export function HeroHeadline() {
  return (
    <h1
      id="hero-title"
      aria-label={HEADLINE_LABEL}
      className="m-0 w-full font-display text-[min(12.4vw,8.4vh,60px)] leading-[1.02] font-normal tracking-[-.06em] sm:text-[max(22px,min(6.2vw,10.5vh,96px))] sm:leading-[1.08]"
    >
      <span aria-hidden data-line="1" data-reveal className="block">
        {LINE_ONE.map((s) => (
          <Seg key={s.key} s={s} />
        ))}
        .
      </span>
      <span aria-hidden data-line="2" data-reveal className="block text-stone">
        {LINE_TWO.map((s) => (
          <Seg key={s.key} s={s} />
        ))}
        <span data-period data-reveal className="text-honey">
          .
        </span>
        <span
          data-caret
          className="ml-[.06em] inline-block h-[.78em] w-[.07em] bg-honey align-[-.04em] opacity-0"
        />
      </span>
    </h1>
  );
}

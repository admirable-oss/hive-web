import { EYEBROW } from "./copy";

export function HeroEyebrow() {
  return (
    <p className="m-0 flex h-3.5 items-center justify-center gap-2 font-mono text-[9px] tracking-[.2em] whitespace-nowrap text-stone sm:text-[10px] sm:tracking-[.22em]">
      <span aria-hidden data-reveal="a" className="size-1.5 bg-honey" />
      <span data-eyebrow data-reveal>
        {EYEBROW}
      </span>
      <span aria-hidden data-eyebrow-caret className="h-3.5 w-1.75 bg-honey opacity-0" />
    </p>
  );
}

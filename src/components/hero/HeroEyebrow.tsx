import { EYEBROW } from "./copy";

export function HeroEyebrow() {
  return (
    <p className="m-0 mb-3.5 flex h-4 items-center gap-2.5 font-mono text-[9.5px] tracking-[.18em] sm:mb-0 sm:gap-3 whitespace-nowrap text-stone sm:text-xs sm:tracking-[.24em]">
      <span aria-hidden data-reveal="a" className="size-1.5 bg-honey sm:size-2" />
      <span data-eyebrow data-reveal>
        {EYEBROW}
      </span>
      <span aria-hidden data-eyebrow-caret className="h-3.5 w-1.75 bg-honey opacity-0" />
    </p>
  );
}

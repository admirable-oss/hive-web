import { EYEBROW } from "./copy";

export function HeroEyebrow() {
  return (
    <p className="m-0 flex h-4 items-center gap-3 font-mono text-[10px] tracking-[.16em] whitespace-nowrap text-stone sm:text-xs sm:tracking-[.24em]">
      <span aria-hidden data-reveal="a" className="size-2 bg-honey" />
      <span data-eyebrow data-reveal>
        {EYEBROW}
      </span>
      <span aria-hidden data-eyebrow-caret className="h-3.5 w-1.75 bg-honey opacity-0" />
    </p>
  );
}

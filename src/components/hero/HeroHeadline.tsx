import { HEADLINE } from "./copy";

/** Editorial grotesk headline; lines slide up through a mask on intro. */
export function HeroHeadline() {
  return (
    <h1
      id="hero-title"
      data-headline
      data-reveal
      className="m-0 font-sans text-[clamp(38px,12.4vw,54px)] leading-[.98] sm:text-[clamp(40px,min(6vw,8.5vh),84px)] sm:leading-[1.02] font-medium tracking-[-.045em] text-balance"
    >
      <span className="block">{HEADLINE[0]}</span>
      <span className="block text-[#A6A298]">
        {HEADLINE[1]}
        <span className="text-honey">.</span>
      </span>
    </h1>
  );
}

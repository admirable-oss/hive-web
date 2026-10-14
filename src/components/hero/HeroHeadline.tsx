import { HEADLINE } from "./copy";

/** Editorial grotesk headline; lines slide up through a mask on intro. */
export function HeroHeadline() {
  return (
    <h1
      id="hero-title"
      data-headline
      data-reveal
      className="m-0 font-sans text-[clamp(30px,8.5vw,44px)] leading-[1.02] font-medium tracking-[-.04em] text-balance sm:text-[clamp(34px,min(4.8vw,6.5vh),58px)] sm:leading-[1.05]"
    >
      <span className="block">{HEADLINE[0]}</span>
      <span className="block text-[#A6A298]">
        {HEADLINE[1]}
        <span className="text-honey">.</span>
      </span>
    </h1>
  );
}

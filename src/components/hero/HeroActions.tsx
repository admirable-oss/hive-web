import { CopyCommand } from "@/components/shared/CopyCommand";
import { LinkButton } from "@/components/ui/button";
import { LINKS, SUPPORTED_AGENTS } from "@/lib/site";

export function HeroActions() {
  return (
    <div
      data-reveal="c"
      className="pointer-events-auto flex w-full flex-col flex-wrap justify-start gap-2.5 sm:w-auto sm:flex-row sm:justify-center"
    >
      <CopyCommand data-mascot-target="clone" className="w-full sm:w-auto" />
      <LinkButton
        variant="inverse"
        size="lg"
        href={LINKS.docs}
        data-mascot-target="docs"
        // The mascot lands on this button and pushes it down via transform.
        className="w-full transition-[background-color,color,transform] duration-120 sm:w-auto"
      >
        Read the docs <span aria-hidden>↗</span>
      </LinkButton>
    </div>
  );
}

export function HeroAgents() {
  return (
    <p
      data-reveal="d"
      className="m-0 flex flex-wrap items-center justify-start gap-x-4.5 gap-y-2 font-mono text-xs text-ash sm:justify-center"
    >
      <span>runs</span>
      {SUPPORTED_AGENTS.map((a) => (
        <span key={a} className="text-fog">
          {a}
        </span>
      ))}
      <span>· any CLI agent</span>
    </p>
  );
}

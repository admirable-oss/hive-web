import { CopyCommand } from "@/components/shared/CopyCommand";
import { LinkButton } from "@/components/ui/button";
import { logInstallationAction } from "@/lib/posthog-logger";
import { LINKS, SUPPORTED_AGENTS } from "@/lib/site";

export function HeroActions() {
  return (
    <div
      data-reveal="c"
      className="pointer-events-auto mt-5 flex w-full flex-col flex-wrap justify-start gap-2.5 sm:mt-0 sm:w-auto sm:flex-row sm:justify-center"
    >
      <CopyCommand
        data-mascot-target="install-cmd"
        className="w-full max-sm:h-12 max-sm:gap-3 max-sm:pl-4 max-sm:text-[13px] sm:w-auto sm:max-w-[min(560px,60vw)]"
      />
      <LinkButton
        variant="inverse"
        size="lg"
        href={LINKS.docs}
        onPress={() => {
          window.posthog?.capture("documentation_opened");
          logInstallationAction("documentation_opened");
        }}
        className="w-full max-sm:hidden sm:w-auto"
      >
        Read the docs <span aria-hidden>↗</span>
      </LinkButton>
    </div>
  );
}

/** Supported agents. Also the mascot's ceiling: the bee never flies above it. */
export function HeroAgents() {
  return (
    <p
      data-reveal="d"
      data-mascot-ceiling
      className="m-0 mt-3.5 flex w-full items-center justify-between gap-4 font-mono text-[11px] text-ash sm:mt-0 sm:w-auto sm:justify-center sm:text-xs"
    >
      <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 sm:gap-x-5">
        {SUPPORTED_AGENTS.map((a) => (
          <span key={a} className="text-fog">
            {a}
          </span>
        ))}
        <span className="max-[380px]:hidden">· any CLI agent</span>
      </span>
      {/* Phones: docs is a quiet link here instead of a second big button. */}
      <a
        href={LINKS.docs}
        onClick={() => {
          window.posthog?.capture("documentation_opened");
          logInstallationAction("documentation_opened");
        }}
        className="pointer-events-auto flex-none text-bone underline decoration-bone/25 underline-offset-4 sm:hidden"
      >
        Docs ↗
      </a>
    </p>
  );
}

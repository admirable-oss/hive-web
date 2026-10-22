import { InstallCopyCommand } from "@/components/shared/InstallCopyCommand";
import { LinkButton } from "@/components/ui/button";
import { useHive } from "@/lib/hive-store";
import { logInstallationAction } from "@/lib/posthog-logger";
import { DESKTOP_METHODS, INSTALL_METHODS, LINKS } from "@/lib/site";
import { HeroEditionToggle } from "./HeroEditionToggle";

export function HeroActions() {
  const desktop = useHive((s) => s.edition) === "desktop";

  return (
    <div
      data-reveal="c"
      className="pointer-events-auto flex w-full max-w-md flex-col items-center gap-2.5 sm:gap-3"
    >
      {/* One row for the edition switch and the docs: the floor preview needs the height. */}
      <div className="flex w-full items-center justify-between gap-3">
        <HeroEditionToggle />
        <LinkButton
          variant="ghost"
          size="sm"
          href={desktop ? LINKS.desktop : LINKS.docs}
          onPress={() => {
            window.posthog?.capture("documentation_opened");
            logInstallationAction("documentation_opened");
          }}
          className="h-7 px-2 font-mono text-[11px] tracking-[.12em] text-stone uppercase data-hovered:text-honey"
        >
          {desktop ? "Desktop docs" : "Read the docs"} <span aria-hidden>↗</span>
        </LinkButton>
      </div>
      <InstallCopyCommand
        key={desktop ? "desktop" : "cli"}
        methods={desktop ? DESKTOP_METHODS : INSTALL_METHODS}
        label={desktop ? "Hive Desktop download" : "Install method"}
        data-mascot-target="install-cmd"
        className="max-w-full"
      />
    </div>
  );
}

/** Supported agents. Also the mascot's ceiling: the bee never flies above it. */
export function HeroAgents() {
  return (
    <p
      data-reveal="d"
      data-mascot-ceiling
      className="m-0 mt-1 flex w-full max-w-md flex-wrap items-center justify-center gap-2 font-mono text-[10px] text-ash sm:gap-2.5"
    >
      <a
        href="https://startupfa.me/s/hive?utm_source=hive.admir-saheta.com"
        target="_blank"
        rel="noreferrer"
        aria-label="Hive featured on Startup Fame"
        className="h-7 w-[min(38vw,180px)] shrink-0 overflow-hidden opacity-75 mix-blend-screen transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey sm:h-8 sm:w-44"
      >
        <img
          src="https://startupfa.me/badge?t=small&theme=dark&r=square"
          alt="Hive - Featured on Startup Fame"
          width="240"
          height="36"
          className="size-full object-fill"
        />
      </a>
      <a
        href="https://www.producthunt.com/products/hive-15?utm_source=badge-follow&utm_medium=badge&utm_source=badge-hive&#0045;15"
        target="_blank"
        rel="noreferrer"
        aria-label="Follow Hive on Product Hunt"
        className="h-7 w-[min(38vw,180px)] shrink-0 overflow-hidden opacity-75 mix-blend-screen transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey sm:h-8 sm:w-44"
      >
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/follow.svg?product_id=1343570&theme=dark"
          alt="Hive - Coding&#0032;agents&#0032;that&#0032;don&#0039;t&#0032;clock&#0032;out | Product Hunt"
          width="250"
          height="44"
          className="size-full object-fill"
        />
      </a>
    </p>
  );
}

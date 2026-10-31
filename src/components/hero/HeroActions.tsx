import { InstallCopyCommand } from "@/components/shared/InstallCopyCommand";
import { LinkButton } from "@/components/ui/button";
import { useHive } from "@/lib/hive-store";
import { logInstallationAction } from "@/lib/posthog-logger";
import { DESKTOP_METHODS, INSTALL_METHODS, LINKS } from "@/lib/site";
import { HeroEditionToggle } from "./HeroEditionToggle";

/** Edition switch, docs link and install box. Also the mascot's ceiling: the bee never flies above it. */
export function HeroActions() {
  const desktop = useHive((s) => s.edition) === "desktop";

  return (
    <div
      data-reveal="c"
      data-mascot-ceiling
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

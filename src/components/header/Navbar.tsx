import type { Ref } from "react";
import { Logo } from "@/components/brand/Logo";
import { LinkButton } from "@/components/ui/button";
import { GridMenuButton } from "@/components/ui/grid-menu-button";
import { formatStars, type RepoStats } from "@/lib/github";
import { logInstallationAction } from "@/lib/posthog-logger";
import { LANGUAGE_LABEL, LICENSE_LABEL, LINKS, STAR_THRESHOLD, VERSION_LABEL } from "@/lib/site";
import { NavLinks } from "./NavLinks";
import { SoundToggle } from "./SoundToggle";

interface NavbarProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
  stats: RepoStats | null;
  ref?: Ref<HTMLElement>;
}

const mono = "font-mono text-xs tracking-[.12em] uppercase";

/**
 * Quiet header. Desktop (≥1180): logo · version │ Docs Changelog Roadmap │
 * sound · GitHub · Install. Below that the links live in the full-screen menu.
 */
export function Navbar({ onOpenMenu, menuOpen, stats, ref }: NavbarProps) {
  const showStars = stats !== null && stats.stars >= STAR_THRESHOLD;
  const version = stats?.version ?? VERSION_LABEL;
  const license = stats?.license ?? LICENSE_LABEL;
  const language = stats?.language ?? LANGUAGE_LABEL;

  return (
    <header ref={ref} data-reveal className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-15 max-w-[1680px] items-center justify-between gap-4 px-[clamp(16px,4vw,64px)] sm:h-18">
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-4">
          <a href="#top" className="flex" aria-label="Hive — back to top">
            <Logo title="" className="h-6 sm:h-7" />
          </a>
          <a
            href={LINKS.changelog}
            className="hidden h-6 items-center gap-2 border border-bone/10 px-2 font-mono text-[11px] tracking-[.08em] whitespace-nowrap text-stone uppercase hover:border-honey hover:text-honey min-[1000px]:flex"
          >
            {version}
            <span aria-hidden className="text-dim">·</span>
            {license}
            <span aria-hidden className="text-dim">·</span>
            {language}
          </a>
        </div>

        <NavLinks className="hidden min-[1180px]:flex" />

        <div className="flex flex-1 basis-0 items-center justify-end gap-2.5">
          <SoundToggle compact className="hidden min-[1180px]:flex" />
          <LinkButton
            variant="secondary"
            size="sm"
            href={LINKS.github}
            className={`hidden gap-2.5 px-3.5 min-[560px]:inline-flex ${mono}`}
            aria-label={showStars ? `GitHub, ${stats!.stars} stars` : "Hive on GitHub"}
          >
            GitHub
            {showStars ? (
              <span className="flex items-center gap-1 text-fog">
                <span aria-hidden className="text-honey">★</span>
                {formatStars(stats!.stars)}
              </span>
            ) : (
              <span aria-hidden>↗</span>
            )}
          </LinkButton>
          <LinkButton
            variant="primary"
            size="sm"
            href={LINKS.install}
            data-mascot-target="install"
            className={mono}
            onPress={() => {
              window.posthog?.capture("installation_opened");
              logInstallationAction("installation_opened");
            }}
          >
            Install
          </LinkButton>
          <GridMenuButton
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onPress={onOpenMenu}
            className="min-[1180px]:hidden"
          />
        </div>
      </div>
    </header>
  );
}

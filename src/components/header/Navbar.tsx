import type { Ref } from "react";
import { Logo } from "@/components/brand/Logo";
import { LinkButton } from "@/components/ui/button";
import { GridMenuButton } from "@/components/ui/grid-menu-button";
import { LINKS, VERSION_LABEL } from "@/lib/site";
import { NavLinks } from "./NavLinks";
import { SoundToggle } from "./SoundToggle";

interface NavbarProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
  ref?: Ref<HTMLElement>;
}

/** Breakpoints mirror the wireframe: chip/sound ≥1000, centre nav ≥1180, GitHub ≥560. */
export function Navbar({ onOpenMenu, menuOpen, ref }: NavbarProps) {
  return (
    <header ref={ref} data-reveal className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-15 max-w-[1680px] items-center justify-between gap-4 px-[clamp(16px,4vw,64px)] sm:h-18">
        <div className="flex min-w-0 flex-1 basis-0 items-center gap-4">
          <a href="#top" className="flex" aria-label="Hive — back to top">
            <Logo title="" className="h-6 sm:h-7" />
          </a>
          <a
            href={LINKS.changelog}
            className="hidden h-6 items-center border border-bone/14 px-2 font-mono text-[11px] tracking-[.06em] whitespace-nowrap text-stone hover:border-honey hover:text-honey min-[1000px]:flex"
          >
            {VERSION_LABEL}
          </a>
        </div>

        <NavLinks className="hidden min-[1180px]:flex" />

        <div className="flex flex-1 basis-0 items-center justify-end gap-2.5">
          <SoundToggle className="hidden min-[1000px]:flex" />
          <LinkButton variant="secondary" size="sm" href={LINKS.github} className="hidden px-3.5 min-[560px]:inline-flex">
            GitHub <span aria-hidden>↗</span>
          </LinkButton>
          <LinkButton variant="primary" size="sm" href={LINKS.install} data-mascot-target="install">
            Install
          </LinkButton>
          <GridMenuButton
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onPress={onOpenMenu}
          />
        </div>
      </div>
    </header>
  );
}

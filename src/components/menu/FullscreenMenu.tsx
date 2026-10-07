import { useRef } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { Logo } from "@/components/brand/Logo";
import { CopyCommand } from "@/components/shared/CopyCommand";
import { Button } from "@/components/ui/button";
import { PixelCrossGlyph } from "@/components/ui/pixel-glyphs";
import { gsap, useGSAP } from "@/lib/gsap";
import { LINKS, MENU_LINKS } from "@/lib/site";
import { MenuStatusBar } from "./MenuStatusBar";

interface FullscreenMenuProps {
  isOpen: boolean;
  /** Called for Esc, the close button and link clicks — runs the pixel wipe. */
  onRequestClose: () => void;
  reducedMotion: boolean;
}

const Label = ({ children }: { children: string }) => (
  <div className="font-mono text-[11px] tracking-[.2em] text-ash">{children}</div>
);

function MenuContent({ onRequestClose, reducedMotion }: Omit<FullscreenMenuProps, "isOpen">) {
  const root = useRef<HTMLDivElement>(null);

  // Stepped stagger-in once the wipe has revealed the menu.
  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from("[data-menu-item]", { autoAlpha: 0, x: -16, duration: 0.3, ease: "steps(3)", stagger: 0.055, delay: 0.1 });
      gsap.from("[data-menu-aside]", { autoAlpha: 0, duration: 0.4, ease: "steps(4)", delay: 0.34 });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative flex h-full flex-col">
      <div aria-hidden className="scanlines pointer-events-none absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-12vw] bottom-[-40vh] size-[64vw] bg-[radial-gradient(closest-side,rgb(245_185_66/.08),transparent)]"
      />

      <div className="relative mx-auto box-border flex h-15 w-full max-w-[1680px] flex-none items-center justify-between px-[clamp(20px,4vw,64px)] sm:h-18">
        <Logo title="Hive" className="h-6 sm:h-7" />
        <div className="flex items-center gap-5">
          <span className="hidden font-mono text-[11px] tracking-[.16em] text-ash min-[1000px]:flex">ESC TO CLOSE</span>
          <Button variant="secondary" size="sm" className="gap-3 px-3.5 font-normal" onPress={onRequestClose} aria-label="Close menu">
            Close <PixelCrossGlyph />
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="mx-auto box-border flex min-h-full max-w-[1680px] flex-wrap content-center gap-x-24 gap-y-16 px-[clamp(20px,4vw,64px)] py-8">
          <nav aria-label="Menu" className="flex min-w-0 flex-[1_1_640px] flex-col border-t border-bone/8">
            {MENU_LINKS.map((m, i) => (
              <a
                key={m.label}
                href={m.href}
                onClick={onRequestClose}
                data-menu-item
                className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-bone/8 py-3.5 text-bone transition-[color,padding] duration-150 ease-[steps(2)] hover:pl-3 hover:text-honey focus-visible:pl-3 focus-visible:text-honey focus-visible:outline-none sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:gap-6 sm:py-4.5"
              >
                <span className="font-mono text-xs text-ash">{i}:</span>
                <span className="font-sans text-[clamp(36px,4.6vw,68px)] leading-none font-medium tracking-[-.045em]">{m.label}</span>
                <span className="flex items-center gap-4 font-mono text-xs whitespace-nowrap text-ash">
                  <span className="hidden min-[1000px]:inline">{m.detail}</span>
                  <span aria-hidden className="font-sans text-[22px] text-current">↗</span>
                </span>
              </a>
            ))}
          </nav>

          <aside data-menu-aside className="flex min-w-0 flex-[0_1_400px] flex-col gap-10">
            <div className="flex flex-col gap-3.5">
              <Label>GET STARTED</Label>
              <CopyCommand size="md" />
            </div>
            <div className="flex flex-col gap-3.5">
              <Label>YOUR HIVE, RIGHT NOW</Label>
              <dl className="grid grid-cols-2 border-t border-bone/8">
                <div className="flex flex-col-reverse gap-1.5 py-4">
                  <dt className="flex items-center gap-2 font-mono text-xs text-stone">
                    <span aria-hidden className="size-1.5 bg-honey" />
                    running
                  </dt>
                  <dd className="text-[40px] font-medium tracking-[-.04em]">3</dd>
                </div>
                <div className="flex flex-col-reverse gap-1.5 border-l border-bone/8 py-4 pl-5">
                  <dt className="flex items-center gap-2 font-mono text-xs text-stone">
                    <span aria-hidden className="size-1.5 bg-violet" />
                    awaiting you
                  </dt>
                  <dd className="text-[40px] font-medium tracking-[-.04em]">1</dd>
                </div>
              </dl>
            </div>
            <div className="flex items-center gap-4.5 border-t border-bone/8 pt-6">
              <Logo variant="mark" title="" className="h-9.75 w-12" />
              <div className="flex flex-col gap-1 text-sm text-stone">
                <span className="text-bone">Built in the open by Admir Saheta</span>
                <a href={LINKS.author} className="font-mono text-xs text-ash">
                  admir-saheta.com ↗
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MenuStatusBar />
    </div>
  );
}

/**
 * Full-screen site menu. react-aria handles focus trapping/restoration,
 * Esc, scroll lock and hiding the page from assistive tech.
 */
export function FullscreenMenu({ isOpen, onRequestClose, reducedMotion }: FullscreenMenuProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && onRequestClose()}
      className="fixed inset-0 z-100 bg-panel font-sans text-bone"
    >
      <Modal className="h-full">
        <Dialog aria-label="Site menu" className="h-full outline-none">
          <MenuContent onRequestClose={onRequestClose} reducedMotion={reducedMotion} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

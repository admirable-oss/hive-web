import { Logo } from "@/components/brand/Logo";
import { CopyCommand } from "@/components/shared/CopyCommand";
import { LinkButton } from "@/components/ui/button";
import TuiDemo from "./TuiDemo";

/** /demo: Hive's TUI across the whole window, with a bar of chrome above and below. */
export default function DemoPage() {
  return (
    <div className="flex h-dvh flex-col bg-shell font-sans text-bone">
      <header className="flex h-12 flex-none items-center justify-between gap-4 border-b border-bone/8 pr-2 pl-4 font-mono text-[11px] tracking-[.16em] text-ash">
        <span className="flex min-w-0 items-center gap-3">
          <a href="/" aria-label="Hive home" className="flex-none">
            <Logo title="" className="h-5" />
          </a>
          <span className="truncate max-sm:hidden">· LIVE DEMO · SIMULATED IN YOUR BROWSER</span>
        </span>
        <span className="flex items-center gap-4">
          <span className="hidden tracking-[.12em] min-[900px]:inline">
            CLICK, THEN TYPE · <span className="text-fog">CTRL+B ?</span> FOR KEYS
          </span>
          <LinkButton variant="secondary" size="sm" href="/" className="h-8 px-3 font-normal tracking-normal">
            <span aria-hidden>←</span> Back to site
          </LinkButton>
        </span>
      </header>

      <TuiDemo className="min-h-0 flex-1" />

      <footer className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-bone/8 px-4 py-3">
        <p className="m-0 max-w-[52ch] text-[13px] leading-snug text-stone">
          The real thing keeps these agents running after you close the terminal. One command:
        </p>
        <CopyCommand size="md" className="w-full sm:w-auto" />
      </footer>
    </div>
  );
}

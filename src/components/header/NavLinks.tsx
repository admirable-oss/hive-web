import { cn } from "cn";
import { NAV_LINKS } from "@/lib/site";

/** Flat mono nav — no box, just type. */
export function NavLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Primary" className={cn("flex-none items-center gap-7", className)}>
      {NAV_LINKS.map((l) => (
        <a
          key={l.label}
          href={l.href}
          className="py-2 font-mono text-xs tracking-[.12em] text-stone uppercase outline-none hover:text-bone focus-visible:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-honey"
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}

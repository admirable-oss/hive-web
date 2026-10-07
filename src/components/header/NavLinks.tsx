import { useRef } from "react";
import { cn } from "cn";
import { gsap, useGSAP } from "@/lib/gsap";
import { NAV_LINKS } from "@/lib/site";

/**
 * Boxy centre nav. A single highlight block steps between items on
 * hover/focus instead of each link painting its own background.
 */
export function NavLinks({ className }: { className?: string }) {
  const navRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLSpanElement>(null);

  const { contextSafe } = useGSAP({ scope: navRef });

  const moveTo = contextSafe((el: HTMLElement) => {
    const box = boxRef.current;
    if (!box) return;
    const visible = Number(gsap.getProperty(box, "opacity")) > 0;
    const to = { x: el.offsetLeft, width: el.offsetWidth };
    if (!visible) gsap.set(box, to);
    gsap.to(box, { ...to, autoAlpha: 1, duration: 0.18, ease: "steps(3)", overwrite: true });
  });

  const hide = contextSafe(() => {
    gsap.to(boxRef.current, { autoAlpha: 0, duration: 0.12, ease: "steps(2)", overwrite: true });
  });

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      onPointerLeave={hide}
      onBlur={(e) => {
        if (!navRef.current?.contains(e.relatedTarget as Node | null)) hide();
      }}
      className={cn("relative flex-none items-center gap-1 border border-bone/8 bg-[rgb(18_18_17/.6)] p-1 text-sm", className)}
    >
      <span
        ref={boxRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-1 bottom-1 left-0 bg-graphite opacity-0"
      />
      {NAV_LINKS.map((l) => (
        <a
          key={l.label}
          href={l.href}
          onPointerEnter={(e) => moveTo(e.currentTarget)}
          onFocus={(e) => moveTo(e.currentTarget)}
          className="relative px-4 py-2 text-fog outline-none hover:text-bone focus-visible:text-bone focus-visible:outline-1 focus-visible:outline-honey"
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}

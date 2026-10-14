import { cn } from "cn";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "react-aria-components";
import type { RepoStats } from "@/lib/github";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { gsap, useGSAP } from "@/lib/gsap";
import {
  LINKS,
  PRODUCT_NAV,
  RESOURCES_NAV,
  VERSION_LABEL,
  type NavLinkGroup,
  type NavLinkItem,
} from "@/lib/site";

type PanelId = "product" | "resources";

const triggerClass =
  "relative z-1 inline-flex items-center gap-1.5 px-2.5 py-2 font-mono text-xs tracking-[.12em] text-stone uppercase outline-none transition-colors hover:text-bone data-[pressed]:text-bone data-focus-visible:text-bone data-focus-visible:outline-1 data-focus-visible:outline-offset-4 data-focus-visible:outline-honey";

const directLinkClass =
  "relative z-1 inline-flex px-2.5 py-2 font-mono text-xs tracking-[.12em] text-stone uppercase outline-none transition-colors hover:text-bone focus-visible:text-bone focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-honey";

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="mb-2 font-mono text-[10px] tracking-[.2em] text-ash uppercase">{children}</div>
  );
}

function NavRow({ item, onNavigate }: { item: NavLinkItem; onNavigate: () => void }) {
  const external = item.external ?? item.href.startsWith("http");
  return (
    <a
      href={item.href}
      onClick={onNavigate}

      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group grid gap-0.5 rounded-sm px-2 py-2.5 outline-none transition-[background-color,color] hover:bg-bone/4 focus-visible:bg-bone/4 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-honey"
    >
      <span className="flex items-center gap-2 font-sans text-[15px] font-medium tracking-[-.02em] text-bone group-hover:text-honey">
        {item.label}
        {external ? <span className="font-mono text-[11px] text-ash">↗</span> : null}
      </span>
      <span className="text-[13px] leading-snug text-pretty text-stone">{item.description}</span>
    </a>
  );
}

function LinkGroups({ groups, onNavigate }: { groups: readonly NavLinkGroup[]; onNavigate: () => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <GroupLabel>{group.label}</GroupLabel>
          <div className="flex flex-col">
            {group.links.map((link) => (
              <NavRow key={link.label} item={link} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductFeatureCard({ onNavigate }: { onNavigate: () => void }) {
  const { feature } = PRODUCT_NAV;
  return (
    <div className="relative flex min-h-full flex-col justify-between overflow-hidden border border-bone/10 bg-graphite/80 p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_0%,rgb(245_185_66/.12),transparent)]"
      />
      <div className="relative flex flex-col gap-3">
        <div className="font-mono text-[10px] tracking-[.2em] text-honey uppercase">{feature.kicker}</div>
        <p className="m-0 font-sans text-[22px] leading-[1.15] font-medium tracking-[-.03em] text-bone">{feature.title}</p>
        <p className="m-0 text-sm leading-relaxed text-pretty text-stone">{feature.description}</p>
      </div>
      <div className="relative mt-6 flex flex-col gap-4">
        <div
          aria-hidden
          className="border border-bone/10 bg-ink/40 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-stone"
        >
          <span className="text-honey">$</span> hive attach prod
          <br />
          <span className="text-fog">↳ 3 agents · 1 awaiting</span>
          <span className="ml-0.5 inline-block h-[1em] w-[0.55em] translate-y-px animate-blink bg-honey/90" />
        </div>
        <a
          href={feature.href}
          onClick={onNavigate}
          className="inline-flex items-center gap-2 font-mono text-xs tracking-[.14em] text-bone uppercase outline-none hover:text-honey focus-visible:text-honey focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-honey"
        >
          {feature.cta} <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}

function ReleaseFeatureCard({
  version,
  highlight,
  onNavigate,
}: {
  version: string;
  highlight: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex min-h-full flex-col justify-between border border-bone/10 bg-graphite/80 p-5">
      <div className="flex flex-col gap-3">
        <div className="font-mono text-[10px] tracking-[.2em] text-ash uppercase">Latest release</div>
        <p className="m-0 font-mono text-2xl tracking-[-.04em] text-bone">{version}</p>
        <p className="m-0 text-sm leading-relaxed text-pretty text-stone">{highlight}</p>
      </div>
      <a
        href={LINKS.changelog}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="mt-6 inline-flex items-center gap-2 font-mono text-xs tracking-[.14em] text-bone uppercase outline-none hover:text-honey focus-visible:text-honey focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-honey"
      >
        Read the changelog <span aria-hidden>↗</span>
      </a>
    </div>
  );
}

function PixelMegaPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("clip-pixel-4 bg-bone/18 p-px shadow-[0_24px_80px_rgb(0_0_0/.45)]", className)}>
      <div className="clip-pixel-4 bg-panel/95 backdrop-blur-md">{children}</div>
    </div>
  );
}

interface NavMegaMenuProps {
  className?: string;
  stats: RepoStats | null;
}

/**
 * Desktop primary nav: Product & Resources mega menus, Pricing, plus room for
 * GitHub / Get Started in the header actions.
 */
export function NavMegaMenu({ className, stats }: NavMegaMenuProps) {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<PanelId | "pricing", HTMLElement>>>({});
  const prevPanel = useRef<PanelId | null>(null);
  const reducedMotion = useReducedMotion();

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenPanel(null), 120);
  }, [clearCloseTimer]);

  const open = useCallback(
    (panel: PanelId) => {
      clearCloseTimer();
      setOpenPanel(panel);
    },
    [clearCloseTimer],
  );

  const close = useCallback(() => {
    clearCloseTimer();
    setOpenPanel(null);
  }, [clearCloseTimer]);

  const moveIndicator = useCallback(
    (key: PanelId | "pricing") => {
      const rail = railRef.current;
      const indicator = indicatorRef.current;
      const el = triggerRefs.current[key];
      if (!rail || !indicator || !el) return;
      const railBox = rail.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const x = box.left - railBox.left;
      const w = box.width;
      if (reducedMotion) {
        gsap.set(indicator, { x, width: w, autoAlpha: 1 });
        return;
      }
      gsap.to(indicator, { x, width: w, autoAlpha: 1, duration: 0.28, ease: "steps(5)" });
    },
    [reducedMotion],
  );

  useEffect(() => {
    if (openPanel) moveIndicator(openPanel);
    else {
      prevPanel.current = null;
      gsap.to(indicatorRef.current, { autoAlpha: 0, duration: 0.15, ease: "steps(2)" });
    }
  }, [openPanel, moveIndicator]);

  useGSAP(
    () => {
      if (!openPanel || reducedMotion) return;
      const panel = panelRef.current;
      const content = contentRef.current;
      if (!panel || !content) return;

      const switched = prevPanel.current && prevPanel.current !== openPanel;
      prevPanel.current = openPanel;

      if (switched) {
        gsap.fromTo(panel, { scale: 0.992, autoAlpha: 0.92 }, { scale: 1, autoAlpha: 1, duration: 0.22, ease: "steps(4)" });
        gsap.fromTo(
          content,
          { x: openPanel === "resources" ? 10 : -10, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.3, ease: "steps(5)" },
        );
      } else {
        gsap.fromTo(panel, { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.32, ease: "steps(6)" });
        gsap.fromTo(content.children, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.28, stagger: 0.04, ease: "steps(4)" });
      }
    },
    { dependencies: [openPanel, reducedMotion] },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [close]);

  const version = stats?.version ?? VERSION_LABEL;
  const releaseHighlight = stats?.releaseHighlight ?? RESOURCES_NAV.releaseFallback;

  const panelShell = "grid gap-0 p-1 sm:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]";

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className={cn("relative flex flex-none items-center", className)}
      onMouseLeave={scheduleClose}
    >
      <div ref={railRef} className="relative flex items-center gap-0.5">
        <span
          ref={indicatorRef}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-px bg-bone/45 opacity-0"
          style={{ width: 0 }}
        />

        <div
          className="relative"
          onMouseEnter={() => {
            moveIndicator("product");
            open("product");
          }}
          ref={(node) => {
            if (node) triggerRefs.current.product = node;
          }}
        >
          <Button
            aria-expanded={openPanel === "product"}
            aria-haspopup="dialog"
            onPress={() => setOpenPanel((p) => (p === "product" ? null : "product"))}
            className={triggerClass}
          >
            Product <span aria-hidden className="text-[10px] text-ash">▾</span>
          </Button>
        </div>

        <div
          className="relative"
          onMouseEnter={() => {
            moveIndicator("resources");
            open("resources");
          }}
          ref={(node) => {
            if (node) triggerRefs.current.resources = node;
          }}
        >
          <Button
            aria-expanded={openPanel === "resources"}
            aria-haspopup="dialog"
            onPress={() => setOpenPanel((p) => (p === "resources" ? null : "resources"))}
            className={triggerClass}
          >
            Resources <span aria-hidden className="text-[10px] text-ash">▾</span>
          </Button>
        </div>

        <a
          href={LINKS.pricing}
          className={directLinkClass}
          onFocus={close}
          onMouseEnter={() => moveIndicator("pricing")}
          ref={(node) => {
            if (node) triggerRefs.current.pricing = node;
          }}
        >
          Pricing
        </a>
      </div>

      {openPanel ? (
        <div
          className="absolute top-[calc(100%+10px)] left-1/2 z-40 w-[min(720px,calc(100vw-32px))] -translate-x-1/2"
          onMouseEnter={clearCloseTimer}
        >
          <PixelMegaPanel>
            <div
              ref={panelRef}
              role="dialog"
              aria-label={openPanel === "product" ? "Product" : "Resources"}
            >
              <div ref={contentRef} className={panelShell}>
                {openPanel === "product" ? (
                  <>
                    <div className="p-4 sm:p-5">
                      <LinkGroups groups={PRODUCT_NAV.groups} onNavigate={close} />
                    </div>
                    <div className="border-t border-bone/10 p-1 sm:border-t-0 sm:border-l">
                      <ProductFeatureCard onNavigate={close} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 sm:p-5">
                      <LinkGroups groups={RESOURCES_NAV.groups} onNavigate={close} />
                    </div>
                    <div className="border-t border-bone/10 p-1 sm:border-t-0 sm:border-l">
                      <ReleaseFeatureCard version={version} highlight={releaseHighlight} onNavigate={close} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </PixelMegaPanel>
        </div>
      ) : null}
    </nav>
  );
}

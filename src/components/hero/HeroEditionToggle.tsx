import { cn } from "cn";
import { IconAppWindow, IconTerminal2 } from "@tabler/icons-react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { hiveAudio } from "@/lib/audio/hive-audio";
import { hiveActions, useHive, type HiveEdition } from "@/lib/hive-store";

const EDITIONS: { id: HiveEdition; label: string; Icon: typeof IconTerminal2; badge?: string }[] = [
  { id: "cli", label: "CLI", Icon: IconTerminal2 },
  { id: "desktop", label: "Desktop", Icon: IconAppWindow, badge: "New" },
];

/** CLI / Desktop switch. Swaps the install box and the preview on the floor. */
export function HeroEditionToggle({ className }: { className?: string }) {
  const edition = useHive((s) => s.edition);

  return (
    <ToggleButtonGroup
      aria-label="Hive edition"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[edition]}
      onSelectionChange={(keys) => {
        const next = [...keys][0] as HiveEdition | undefined;
        if (!next || next === edition) return;
        hiveAudio.play("blip");
        window.posthog?.capture("hero_edition_selected", { edition: next });
        hiveActions.setEdition(next);
      }}
      className={cn("clip-pixel-3 flex bg-bone/14 p-px font-mono", className)}
    >
      {EDITIONS.map(({ id, label, Icon, badge }) => (
        <ToggleButton
          key={id}
          id={id}
          className={cn(
            "clip-pixel-3 flex h-7 items-center gap-1.5 bg-[rgb(15_15_14/.92)] px-3 text-[10px] tracking-[.16em] text-stone uppercase outline-none transition-[color,background-color] duration-150 ease-[steps(2)]",
            "not-first:ml-px data-hovered:text-bone data-selected:bg-graphite data-selected:text-bone",
            "data-focus-visible:outline-1 data-focus-visible:-outline-offset-1 data-focus-visible:outline-honey",
          )}
        >
          {({ isSelected }) => (
            <>
              <Icon aria-hidden stroke={1.75} className={cn("size-3.5", isSelected ? "text-honey" : "text-ash")} />
              {label}
              {badge ? (
                <span className="bg-honey px-1 py-px text-[8px] leading-none tracking-[.12em] text-ink">{badge}</span>
              ) : null}
            </>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

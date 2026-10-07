import type { CSSProperties } from "react";
import { cn } from "cn";
import { ToggleButton } from "react-aria-components";
import { hiveActions, useHive } from "@/lib/hive-store";
import { hiveAudio } from "@/lib/audio/hive-audio";

/** Equaliser bar heights: [a, b] alternate every 500 ms while sound is on. */
const BARS: [string, string][] = [
  ["6px", "4px"],
  ["10px", "7px"],
  ["4px", "8px"],
];

export function SoundToggle({ className }: { className?: string }) {
  const sound = useHive((s) => s.sound);

  return (
    <ToggleButton
      isSelected={sound}
      onChange={() => {
        hiveActions.toggleSound();
        // Audible confirmation when turning sound back on (no-op when muted).
        hiveAudio.play("tik", 1.2);
      }}
      aria-label="Sound effects"
      className={cn(
        "flex h-9 items-center gap-2 px-2.5 font-mono text-xs whitespace-nowrap text-stone outline-none transition-colors duration-150 ease-[steps(2)] data-hovered:text-bone data-focus-visible:outline-2 data-focus-visible:outline-honey",
        className
      )}
    >
      <span aria-hidden className="flex h-2.5 items-end gap-0.5">
        {BARS.map(([a, b], i) => (
          <span
            key={i}
            className={cn("w-0.5", sound ? "animate-sound-bar bg-honey" : "h-0.5 bg-dim")}
            style={sound ? ({ "--bar-a": a, "--bar-b": b, height: a } as CSSProperties) : undefined}
          />
        ))}
      </span>
      <span aria-hidden>sound {sound ? "on" : "off"}</span>
    </ToggleButton>
  );
}

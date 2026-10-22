import { useEffect, useRef, type ComponentProps } from "react";
import { cn } from "cn";
import { useHive } from "@/lib/hive-store";
import { DesktopDemo } from "./DesktopDemo";
import { RuntimeDemo } from "./RuntimeDemo";

/**
 * The preview on the hive floor for the selected edition: the TUI for the CLI,
 * the macOS window for Desktop. Switching remounts it (the story restarts) and
 * fades the new one in; the first paint doesn't animate.
 */
export function RuntimePreview({ className, ...props }: ComponentProps<typeof RuntimeDemo>) {
  const edition = useHive((s) => s.edition);
  const switched = useRef(false);
  const first = useRef(edition);
  if (edition !== first.current) switched.current = true;

  const Preview = edition === "desktop" ? DesktopDemo : RuntimeDemo;
  return (
    <Preview
      key={edition}
      {...props}
      className={cn(className, switched.current && "animate-in fade-in-0 zoom-in-[.98] duration-500 ease-out")}
    />
  );
}

/** Calls `onSwitch` whenever the edition changes after mount. */
export function useEditionSwitch(onSwitch: () => void) {
  const edition = useHive((s) => s.edition);
  const last = useRef(edition);
  const cb = useRef(onSwitch);
  cb.current = onSwitch;
  useEffect(() => {
    if (last.current === edition) return;
    last.current = edition;
    cb.current();
  }, [edition]);
}

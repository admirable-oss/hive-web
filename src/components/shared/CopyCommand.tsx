import type { Ref } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useClipboard } from "@/hooks/use-clipboard";
import { CLONE_COMMAND, CLONE_DISPLAY } from "@/lib/site";

interface CopyCommandProps {
  display?: string;
  command?: string;
  size?: "lg" | "md";
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Terminal command box with a one-tap copy chip. */
export function CopyCommand({
  display = CLONE_DISPLAY,
  command = CLONE_COMMAND,
  size = "lg",
  className,
  ref,
  ...rest
}: CopyCommandProps & Record<`data-${string}`, string>) {
  const { copied, copy } = useClipboard();
  const lg = size === "lg";

  return (
    <div
      ref={ref}
      className={cn(
        "flex max-w-full items-center justify-between overflow-hidden border font-mono",
        lg
          ? "h-14 gap-4.5 border-bone/12 bg-[rgb(15_15_14/.88)] pr-2 pl-5 text-[15px]"
          : "h-13 gap-3 border-bone/10 bg-shell pr-1.5 pl-4 text-[13px]",
        className
      )}
      {...rest}
    >
      <code className="truncate">
        <span className="text-honey" aria-hidden>
          ${" "}
        </span>
        {display}
      </code>
      <Button
        variant="quiet"
        size="chip"
        className={cn(!lg && "h-9.5 px-3 tracking-[.16em]")}
        onPress={() => copy(command)}
        aria-label={copied ? "Copied to clipboard" : `Copy “${command}”`}
      >
        {copied ? "COPIED ✓" : "COPY"}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Command copied to clipboard" : ""}
      </span>
    </div>
  );
}

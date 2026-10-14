import type { Ref } from "react";
import { cn } from "cn";
import { useState } from "react";
import { Button, Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { useClipboard } from "@/hooks/use-clipboard";
import { INSTALL_METHODS, type InstallMethodId } from "@/lib/site";

interface InstallCopyCommandProps {
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/** Install command with default / brew / nix tabs and a compact terminal row. */
export function InstallCopyCommand({ className, ref, ...rest }: InstallCopyCommandProps & Record<`data-${string}`, string>) {
  const [method, setMethod] = useState<InstallMethodId>("default");
  const { copied, copy } = useClipboard();

  return (
    <div ref={ref} className={cn("clip-pixel-4 w-full max-w-md bg-bone/16 p-px font-mono", className)} {...rest}>
      <div className="clip-pixel-4 flex flex-col overflow-hidden border border-bone/8 bg-[rgb(15_15_14/.92)] backdrop-blur-sm">
      <Tabs
        selectedKey={method}
        onSelectionChange={(key) => setMethod(key as InstallMethodId)}
        className="flex flex-col"
      >
        <TabList
          aria-label="Install method"
          className="flex border-b border-bone/10 bg-ink/30"
        >
          {INSTALL_METHODS.map((m) => (
            <Tab
              key={m.id}
              id={m.id}
              className={cn(
                "relative flex-1 px-2 py-2 text-[10px] tracking-[.16em] text-stone uppercase outline-none transition-[color,background-color] duration-150 ease-[steps(2)]",
                "data-selected:bg-graphite/80 data-selected:text-honey",
                "data-hovered:text-bone data-focus-visible:text-bone data-focus-visible:outline-1 data-focus-visible:-outline-offset-1 data-focus-visible:outline-honey",
              )}
            >
              {({ isSelected }) => (
                <>
                  {m.label}
                  {isSelected ? (
                    <span aria-hidden className="absolute inset-x-2 bottom-0 h-px bg-honey" />
                  ) : null}
                </>
              )}
            </Tab>
          ))}
        </TabList>
        {INSTALL_METHODS.map((m) => (
          <TabPanel key={m.id} id={m.id} className="m-0 flex min-h-0 items-center justify-between gap-2 px-3 py-2.5 text-[12px] sm:text-[13px]">
            <code className="min-w-0 truncate leading-snug">
              <span className="text-honey" aria-hidden>
                ${" "}
              </span>
              {m.display}
            </code>
            <Button
              onPress={() => copy(m.command)}
              aria-label={copied && method === m.id ? "Copied to clipboard" : `Copy “${m.command}”`}
              className="clip-pixel-3 shrink-0 bg-graphite px-2.5 py-1.5 text-[10px] tracking-[.14em] text-bone uppercase outline-none transition-[background-color,color] duration-150 ease-[steps(2)] data-hovered:bg-graphite-hi data-focus-visible:outline-1 data-focus-visible:outline-offset-2 data-focus-visible:outline-honey"
            >
              {copied && method === m.id ? "Copied ✓" : "Copy"}
            </Button>
          </TabPanel>
        ))}
      </Tabs>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Command copied to clipboard" : ""}
      </span>
      </div>
    </div>
  );
}

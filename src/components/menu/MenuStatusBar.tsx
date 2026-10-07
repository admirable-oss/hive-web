import { useClock } from "@/hooks/use-clock";
import { VERSION_LABEL } from "@/lib/site";

/** tmux-style status line pinned to the bottom of the menu. */
export function MenuStatusBar() {
  const clock = useClock();
  return (
    <div className="relative flex h-8 flex-none items-stretch border-t border-bone/8 bg-[rgb(18_18_17/.96)] font-mono text-xs text-stone">
      <span className="flex items-center bg-honey px-3 font-medium text-ink">[hive]</span>
      <span className="flex items-center gap-4 px-3.5 whitespace-nowrap">
        <span>0:hero-</span>
        <span className="text-bone">1:menu*</span>
      </span>
      <span className="flex-1" />
      <span className="hidden items-center border-l border-bone/8 px-3.5 min-[1000px]:flex">apache-2.0 · {VERSION_LABEL}</span>
      <time className="flex items-center border-l border-bone/8 px-3.5 text-bone" suppressHydrationWarning>
        {clock}
      </time>
    </div>
  );
}

import { DEMO } from "./script";

/** One line of chrome: where you are, and what's alive. */
export function RuntimeTopBar() {
  return (
    <div className="flex h-10 flex-none items-center justify-between gap-4 border-b border-bone/8 px-5 text-xs whitespace-nowrap @max-xl:h-9 @max-xl:px-4 @max-xl:text-[11px]">
      <span className="flex items-center gap-2">
        <span className="text-honey">◆</span>
        <span className="text-bone">hive</span>
        <span className="text-ash @max-md:hidden">{DEMO.cwd}</span>
      </span>
      <span className="flex items-center gap-2 text-ash">
        <span className="text-[#9CC08A]">●</span>
        <span className="text-bone">3 running</span>
        <span>·</span>
        {/* Flips between awake/asleep during the demo. */}
        <span data-rt="lid">laptop awake</span>
      </span>
    </div>
  );
}

/** Column heading, set like `ls` output rather than a UI label. */
export const ColumnHead = ({ children }: { children: string }) => (
  <div className="flex-none px-5 pt-4 pb-3 text-[10px] tracking-[.18em] text-ash uppercase @max-xl:px-4 @max-xl:pt-3 @max-xl:pb-2">{children}</div>
);

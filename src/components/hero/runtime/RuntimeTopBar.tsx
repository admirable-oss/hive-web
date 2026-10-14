import { DEMO } from "./script";

const tabs = [
  { id: "1", label: "1 tab 1", active: false },
  { id: "2", label: "2 tab 2", active: true },
] as const;

/** Status line + tab strip, like the real multiplexer chrome. */
export function RuntimeTopBar() {
  return (
    <div className="flex flex-none flex-col border-b border-graphite-hi/80 bg-shell/95">
      <div className="flex h-9 items-center justify-between gap-4 px-4 text-[11px] whitespace-nowrap @max-xl:h-8 @max-xl:px-3 @max-xl:text-[10px]">
        <span className="flex min-w-0 items-center gap-2 text-stone">
          <span className="text-[#9CC08A]">●</span>
          <span className="truncate text-bone">acme-api</span>
        </span>
        <span className="hidden items-center gap-2 text-ash md:flex">
          <span className="text-[#9CC08A]">●</span>
          <span className="text-bone">3 running</span>
          <span>·</span>
          <span data-rt="lid">laptop awake</span>
        </span>
        <span className="font-mono text-[10px] tracking-[.06em] text-ash uppercase">C-b ? help</span>
      </div>
      <div className="flex h-8 items-end gap-0 border-t border-graphite-hi/60 px-3 @max-xl:h-7">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className={
              tab.active
                ? "border border-b-0 border-graphite-hi bg-graphite px-3 py-1 text-[10px] text-honey @max-xl:px-2"
                : "border border-transparent px-3 py-1 text-[10px] text-ash @max-xl:px-2"
            }
          >
            {tab.label}
          </span>
        ))}
        <span className="mb-1 px-2 text-[11px] text-ash">+</span>
        <span className="mb-1 ml-auto truncate text-[10px] text-ash @max-md:hidden">{DEMO.cwd}</span>
      </div>
    </div>
  );
}

/** Column heading, set like `ls` output rather than a UI label. */
export const ColumnHead = ({ children }: { children: string }) => (
  <div className="flex-none px-5 pt-4 pb-3 text-[10px] tracking-[.14em] text-ash uppercase @max-xl:px-4 @max-xl:pt-3 @max-xl:pb-2">
    {children}
  </div>
);

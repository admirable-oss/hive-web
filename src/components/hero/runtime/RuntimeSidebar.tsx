import { useState } from "react";
import { cn } from "cn";
import { ColumnHead } from "./RuntimeTopBar";
import { DEMO } from "./script";

/** Cells column. Rows are clickable — the demo is a toy you can poke. */
export function RuntimeSidebar() {
  const [active, setActive] = useState<string>(DEMO.cells[0].id);

  return (
    <div className="flex w-52.5 flex-none flex-col border-r border-graphite-hi/80 bg-shell/90 @max-2xl:hidden">
      <ColumnHead>Environments 4</ColumnHead>
      <ul className="m-0 list-none p-0">
        {DEMO.cells.map((c) => {
          const on = c.id === active;
          return (
            <li key={c.id}>
              <button
                type="button"
                tabIndex={-1}
                data-mascot-target={`cell:${c.id}`}
                onClick={() => setActive(c.id)}
                className={cn(
                  "flex w-full cursor-pointer gap-3 border-l-2 px-5 py-2 text-left transition-colors",
                  on ? "border-honey bg-[#2B2618]/90" : "border-transparent hover:bg-graphite/60"
                )}
              >
                <span
                  data-rt={`cell-${c.id}-glyph`}
                  className={cn(
                    "text-xs",
                    c.glyph === "●" ? "text-[#9CC08A]" : c.glyph === "◆" ? "text-honey" : "text-ash",
                  )}
                >
                  {c.glyph}
                </span>
                <span className="min-w-0">
                  <span className={cn("block truncate text-xs", on ? "text-bone" : "text-stone")}>{c.name}</span>
                  <span data-rt={`cell-${c.id}-detail`} className="block truncate text-[11px] text-ash">
                    {c.detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { ColumnHead } from "./RuntimeTopBar";
import { COVERAGE_BAR, DEMO } from "./script";

const { tests, elapsed } = DEMO;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** A watcher in the same cell: tests keep ticking while the agent works. */
export function TestPane() {
  return (
    <div className="flex w-[36%] flex-none flex-col border-l border-bone/8 @max-4xl:hidden">
      <ColumnHead>bun</ColumnHead>
      <div className="flex flex-col gap-3 px-5 leading-[1.6]">
        <span>
          <span className="text-honey">›</span> <span className="text-bone">{tests.runner}</span>
        </span>
        <span className="text-[#9CC08A]">
          ✓ <span data-rt="passing">0</span>/{tests.total} passing
        </span>
        <div className="flex flex-col">
          {tests.cases.map(([name, ms]) => (
            <span key={name} data-rt="case" className="flex justify-between gap-3 opacity-0">
              <span className="truncate text-fog">
                <span aria-hidden className="mr-2 text-[#9CC08A]">✓</span>
                {name}
              </span>
              <span className="flex-none text-ash">{ms}</span>
            </span>
          ))}
        </div>
        <span className="flex justify-between gap-3 text-ash">
          <span>
            coverage <span data-rt="cov-bar" className="tracking-[-.08em] text-honey">{"░".repeat(COVERAGE_BAR)}</span>
          </span>
          <span className="text-fog">
            <span data-rt="covered">0</span>/{tests.total}
          </span>
        </span>
        <span className="text-ash">
          elapsed <span data-rt="elapsed" className="text-honey">{clock(elapsed.from)}</span>
        </span>
      </div>
    </div>
  );
}

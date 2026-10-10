import type { ReactNode } from "react";

interface Props {
  index: string;
  eyebrow: string;
  title: ReactNode;
  id?: string;
  children?: ReactNode;
  /** Right-aligned extras (controls, counts). */
  aside?: ReactNode;
}

/** Section opener used down the roadmap: `02 ▪ FLIGHT PATH ───────`, a title, an optional lede. */
export function SectionHead({ index, eyebrow, title, id, children, aside }: Props) {
  return (
    <div data-reveal className="mb-7 flex flex-col gap-4">
      <div className="flex items-center gap-3 font-mono text-[11.5px] tracking-[.22em] text-[#8E8A80]">
        <span className="text-[#5E5B54]">{index}</span>
        <span className="size-1.5 bg-honey" />
        <span>{eyebrow}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-bone/12 to-transparent" />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex max-w-[640px] flex-col gap-2.5">
          <h2 id={id} className="m-0 text-[clamp(28px,3vw,40px)] leading-[1.05] font-medium tracking-[-.035em] text-balance">
            {title}
          </h2>
          {children && <p className="m-0 text-[15.5px] leading-[1.6] text-pretty text-[#A9A59B]">{children}</p>}
        </div>
        {aside}
      </div>
    </div>
  );
}

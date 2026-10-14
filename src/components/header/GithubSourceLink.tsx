import type { ReactNode } from "react";
import { cn } from "cn";
import { Link } from "react-aria-components";
import type { RepoStats } from "@/lib/github";
import { formatStars } from "@/lib/github";
import { LINKS, REPO_SLUG, VERSION_LABEL } from "@/lib/site";
import { GithubMark } from "./GithubMark";

function TagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.75 1.75 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.026-5.026a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  );
}

function ForkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
  );
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[.02em] text-ash normal-case">
      <span className="text-stone/80">{icon}</span>
      {children}
    </li>
  );
}

/** MkDocs-style repository chip: icon · slug · version · stars · forks. */
export function GithubSourceLink({
  stats,
  className,
}: {
  stats: RepoStats | null;
  className?: string;
}) {
  const version = stats?.version ?? VERSION_LABEL;
  const stars = stats?.stars;
  const forks = stats?.forks;

  return (
    <Link
      href={LINKS.github}
      target="_blank"
      rel="noopener noreferrer"
      aria-title="Go to repository"
      aria-label={`Hive on GitHub, ${REPO_SLUG}, release ${version}${stars != null ? `, ${stars} stars` : ""}${forks != null ? `, ${forks} forks` : ""}`}
      className={cn(
        "group hidden min-[560px]:inline-flex max-w-[min(100%,320px)] items-center gap-3 rounded-sm  py-2 pr-3.5 pl-2.5 outline-none transition-[border-color,background-color] duration-150 ease-[steps(2)] data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-honey",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 rotate-45 items-center justify-center rounded-xs  text-stone transition-colors group-data-hovered:border-honey/35 group-data-hovered:text-bone"
      >
        <GithubMark className="size-4.5 -rotate-45" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block truncate font-mono text-[13px] leading-tight tracking-[.01em] text-bone normal-case">
          {REPO_SLUG}
        </span>
        <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 p-0">
          <Fact icon={<TagIcon className="size-3.5" />}>{version}</Fact>
          {stars != null ? <Fact icon={<StarIcon className="size-3.5" />}>{formatStars(stars)}</Fact> : null}
          {forks != null ? <Fact icon={<ForkIcon className="size-3.5" />}>{formatStars(forks)}</Fact> : null}
        </ul>
      </span>
    </Link>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import type { HivePlugin, PluginRegistry } from "@/lib/plugins";
import { categoryLabel, latestRelease } from "@/lib/plugins";
import { CopyCommand } from "@/components/shared/CopyCommand";
import { PluginStage } from "./PluginStage";

const CATEGORIES = [
  "agent-integrations",
  "workflow-automation",
  "developer-tools",
  "notifications",
  "terminal-enhancements",
] as const;

const tagClass =
  "inline-flex items-center border border-bone/10 bg-bone/[.035] px-2 py-0.5 font-mono text-[10px] tracking-[.06em] text-[#B9B5AB]";

function formatRelativeDate(isoDate: string) {
  const diffMs = Date.now() - Date.parse(isoDate);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoDate).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getRepoName(repoUrl?: string) {
  if (!repoUrl) return null;
  try {
    const url = new URL(repoUrl);
    return url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  } catch {
    return repoUrl.replace(/^https?:\/\/[^/]+\//, "");
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 1: Trending Card (Inspired by Herdr style in Image 3)
   ───────────────────────────────────────────────────────────────────────────── */
function TrendingCard({ plugin, rank }: { plugin: HivePlugin; rank: number }) {
  const release = latestRelease(plugin);
  const owner = plugin.maintainers?.[0]?.name ?? "Community maintainer";
  const repoName = getRepoName(plugin.repository) ?? plugin.id;

  return (
    <article className="group relative flex flex-col justify-between border border-bone/[.09] bg-[#121211] p-5 transition-all duration-300 hover:border-honey/50 hover:bg-[#161614] sm:p-6">
      <div>
        {/* Top line: repo identity + external link + rank */}
        <div className="flex items-center justify-between gap-3 border-b border-bone/[.06] pb-3">
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#A9A59B]">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-honey/15 text-[9px] font-bold text-honey">
              H
            </span>
            <span className="truncate group-hover:text-bone">{repoName}</span>
          </div>
          <a
            href={plugin.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-[#6B685F] transition-colors hover:text-honey"
            aria-label={`View ${repoName} on GitHub`}
          >
            ↗
          </a>
        </div>

        {/* Signal badge line: rank + version + official pill */}
        <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="inline-flex items-center gap-1 border border-honey/35 bg-honey/[.08] px-2 py-0.5 text-honey font-medium">
            ▲ #{rank < 10 ? `0${rank}` : rank} TRENDING
          </span>
          <span className="border border-bone/15 bg-bone/[.03] px-1.5 py-0.5 text-[#B9B5AB]">
            v{release.version}
          </span>
          {plugin.official && (
            <span className="border border-honey/20 bg-honey/[.04] px-1.5 py-0.5 text-honey">
              OFFICIAL
            </span>
          )}
          {plugin.verified && (
            <span className="border border-emerald-300/20 bg-emerald-300/[.04] px-1.5 py-0.5 text-emerald-300">
              VERIFIED
            </span>
          )}
        </div>

        {/* Name and description */}
        <h3 className="mt-3 text-[19px] font-medium tracking-[-.025em] text-bone group-hover:text-white">
          {plugin.name}
        </h3>
        <p className="mt-2 line-clamp-3 text-[13.5px] leading-[1.65] text-[#A9A59B]">
          {plugin.description}
        </p>

        {/* Category tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(plugin.categories ?? []).map((c) => (
            <span className={tagClass} key={c}>
              {categoryLabel(c)}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom: Copy snippet & details */}
      <div className="mt-6 border-t border-bone/[.07] pt-4">
        <CopyCommand
          command={`hive plugin install ${plugin.id}`}
          display={`hive plugin install ${plugin.id}`}
          size="md"
        />

        <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[10.5px] text-[#7A766D]">
          <span className="truncate">
            {owner} <span className="text-[#4E4B43]">·</span> {plugin.license}
          </span>
          <a
            className="shrink-0 tracking-[.08em] text-honey hover:text-[#FFE1A0]"
            href={`/plugins/${encodeURIComponent(plugin.id)}`}
          >
            DETAILS ↗
          </a>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 2: Recent / Just Joined Card (Fresh Arrivals)
   ───────────────────────────────────────────────────────────────────────────── */
function RecentCard({ plugin }: { plugin: HivePlugin }) {
  const release = latestRelease(plugin);
  const owner = plugin.maintainers?.[0]?.name ?? "Community maintainer";
  const relativeDate = formatRelativeDate(release.published_at);
  const repoName = getRepoName(plugin.repository) ?? plugin.id;

  return (
    <article className="group relative flex flex-col justify-between border border-bone/[.09] bg-[#141413] p-5 transition-all duration-300 hover:border-emerald-400/40 hover:bg-[#181816] sm:p-6">
      <div>
        {/* Top line: status chip + version */}
        <div className="flex items-center justify-between gap-3 border-b border-bone/[.06] pb-3">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[.12em] text-[#807C72]">
            <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 font-medium">PUBLISHED {relativeDate.toUpperCase()}</span>
          </div>
          <span className="border border-bone/15 bg-bone/[.04] px-2 py-0.5 font-mono text-[10.5px] text-[#D0CCC2]">
            v{release.version}
          </span>
        </div>

        {/* Title & repo */}
        <div className="mt-4">
          <div className="font-mono text-[10.5px] text-[#77746B]">{repoName}</div>
          <h3 className="mt-1 text-[19px] font-medium tracking-[-.025em] text-bone group-hover:text-white">
            {plugin.name}
          </h3>
        </div>

        <p className="mt-2 line-clamp-3 text-[13.5px] leading-[1.65] text-[#A9A59B]">
          {plugin.description}
        </p>

        {/* Changelog callout box */}
        {release.changelog && (
          <div className="mt-4 rounded border border-bone/[.07] bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-[#9A968C]">
            <span className="text-honey font-medium">release note:</span> {release.changelog}
          </div>
        )}
      </div>

      {/* Bottom: Copy command & details */}
      <div className="mt-6 border-t border-bone/[.07] pt-4">
        <CopyCommand
          command={`hive plugin install ${plugin.id}`}
          display={`hive plugin install ${plugin.id}`}
          size="md"
        />

        <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[10.5px] text-[#7A766D]">
          <span className="truncate">
            {owner} <span className="text-[#4E4B43]">·</span> {plugin.id}
          </span>
          <a
            className="shrink-0 tracking-[.08em] text-honey hover:text-[#FFE1A0]"
            href={`/plugins/${encodeURIComponent(plugin.id)}`}
          >
            DETAILS ↗
          </a>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 3: Catalog Card (Full Directory)
   ───────────────────────────────────────────────────────────────────────────── */
function CatalogCard({ plugin }: { plugin: HivePlugin }) {
  const release = latestRelease(plugin);
  const owner = plugin.maintainers?.[0]?.name ?? "Community maintainer";

  return (
    <article className="group flex min-h-[290px] flex-col justify-between border border-bone/[.09] bg-[#111110] p-5 transition-all duration-300 hover:border-honey/40 hover:bg-[#141412] sm:p-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] tracking-[.12em] text-[#77746B]">{plugin.id}</div>
            <h3 className="mt-1.5 text-[19px] font-medium tracking-[-.025em] text-bone group-hover:text-white">
              {plugin.name}
            </h3>
          </div>
          <span className="shrink-0 border border-honey/25 bg-honey/[.06] px-2 py-0.5 font-mono text-[10px] text-honey">
            v{release.version}
          </span>
        </div>

        <p className="mt-3 line-clamp-3 text-[13.5px] leading-[1.65] text-[#A9A59B]">
          {plugin.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(plugin.categories ?? []).map((c) => (
            <span className={tagClass} key={c}>
              {categoryLabel(c)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-bone/[.07] pt-4">
        <CopyCommand
          command={`hive plugin install ${plugin.id}`}
          display={`hive plugin install ${plugin.id}`}
          size="md"
        />

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-[#8E8A80]">
          <span className="truncate">
            {owner} <span className="text-[#5F5D56]">·</span> {plugin.license}
          </span>
          <a
            className="shrink-0 font-mono text-[10px] tracking-[.08em] text-honey hover:text-[#FFE1A0]"
            href={`/plugins/${encodeURIComponent(plugin.id)}`}
          >
            DETAILS ↗
          </a>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-[#6F6C64]">
          <span>{(plugin.platforms ?? []).join(" · ") || "platforms n/a"}</span>
          <span>Hive ≥ {plugin.min_hive_version}</span>
          <span>API {plugin.plugin_api ?? "—"}</span>
          {plugin.official && <span className="text-honey">OFFICIAL</span>}
          {plugin.verified && <span className="text-emerald-300">VERIFIED</span>}
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT: PluginStore
   ───────────────────────────────────────────────────────────────────────────── */
export default function PluginStore({
  registry,
  registryError,
  fetchedAt,
  initialSearch,
}: {
  registry: PluginRegistry | null;
  registryError: string | null;
  fetchedAt: string;
  initialSearch: string;
}) {
  const all = registry?.plugins ?? [];

  // Trending selection
  const trending = useMemo(() => {
    return [...all]
      .sort((a, b) => {
        const score = (p: HivePlugin) =>
          (p.featured ? 6 : 0) +
          (p.official ? 4 : 0) +
          (p.verified ? 2 : 0) +
          (p.categories?.length ?? 0) * 0.4;
        return score(b) - score(a);
      })
      .slice(0, 6);
  }, [all]);

  // Just joined the hive (sorted by newest publication timestamp)
  const justJoined = useMemo(() => {
    return [...all]
      .sort((a, b) => Date.parse(latestRelease(b).published_at) - Date.parse(latestRelease(a).published_at))
      .slice(0, 6);
  }, [all]);

  const params = useMemo(() => new URLSearchParams(initialSearch), [initialSearch]);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [platform, setPlatform] = useState(params.get("platform") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [hiveVersion, setHiveVersion] = useState(params.get("hive") ?? "");
  const [apiVersion, setApiVersion] = useState(params.get("api") ?? "");
  const [sort, setSort] = useState(params.get("sort") ?? "newest");
  const [page, setPage] = useState(Number(params.get("page") ?? 1));
  const pageSize = 9;

  const compatible = (minimum: string | undefined, maximum: string | undefined, current: string) => {
    const compare = (left: string, right: string) => {
      const a = left.split(/[.+-]/).map((part) => Number(part) || 0);
      const b = right.split(/[.+-]/).map((part) => Number(part) || 0);
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0) ? -1 : 1;
      }
      return 0;
    };
    return (!minimum || compare(current, minimum) >= 0) && (!maximum || compare(current, maximum) <= 0);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((p) => {
        const haystack = [
          p.id,
          p.name,
          p.description,
          p.repository,
          ...(p.categories ?? []),
          ...(p.maintainers ?? []).map((m) => m.name),
        ]
          .join(" ")
          .toLowerCase();
        const lifecycle = p.archived ? "archived" : p.deprecated ? "deprecated" : "active";
        return (
          (!q || haystack.includes(q)) &&
          (!category || p.categories?.includes(category)) &&
          (!platform || p.platforms?.includes(platform)) &&
          (!hiveVersion || compatible(p.min_hive_version, p.max_hive_version, hiveVersion)) &&
          (!apiVersion || p.plugin_api === apiVersion) &&
          (!status ||
            (status === "official"
              ? p.official
              : status === "verified"
                ? p.verified
                : lifecycle === status))
        );
      })
      .sort((a, b) =>
        sort === "alpha"
          ? a.name.localeCompare(b.name)
          : sort === "trending"
            ? (b.official ? 4 : 0) - (a.official ? 4 : 0)
            : Date.parse(latestRelease(b).published_at) - Date.parse(latestRelease(a).published_at),
      );
  }, [all, query, category, platform, status, hiveVersion, apiVersion, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (category) next.set("category", category);
    if (platform) next.set("platform", platform);
    if (status) next.set("status", status);
    if (sort !== "newest") next.set("sort", sort);
    if (hiveVersion) next.set("hive", hiveVersion);
    if (apiVersion) next.set("api", apiVersion);
    if (currentPage > 1) next.set("page", String(currentPage));
    const value = next.toString();
    history.replaceState(null, "", `${location.pathname}${value ? `?${value}` : ""}${location.hash}`);
  }, [query, category, platform, status, hiveVersion, apiVersion, sort, currentPage]);

  const filtersMounted = useRef(false);
  useEffect(() => {
    if (!filtersMounted.current) {
      filtersMounted.current = true;
      return;
    }
    setPage(1);
  }, [query, category, platform, status, hiveVersion, apiVersion, sort]);

  const clear = () => {
    setQuery("");
    setCategory("");
    setPlatform("");
    setStatus("");
    setHiveVersion("");
    setApiVersion("");
    setSort("newest");
    setPage(1);
  };

  const field =
    "h-11 w-full border border-bone/[.12] bg-[#111110] px-3 font-mono text-[12px] text-bone outline-none focus:border-honey/60 focus:ring-1 focus:ring-honey/30";

  return (
    <main className="min-h-screen overflow-x-clip bg-[#0F0F0E] font-sans text-bone">
      {/* ── Sticky Top Navigation ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 border-b border-bone/[.08] bg-[#0f0f0e]/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-[clamp(18px,4vw,56px)]">
          <a href="/" className="flex items-center gap-2.5" aria-label="Hive home">
            <img src="/brand/logo/hive-mark-dark.svg" alt="" className="pixelated h-5 w-auto" />
            <img src="/brand/logo/hive-wordmark-dark.svg" alt="Hive" className="pixelated h-4 w-auto" />
          </a>
          <span className="font-mono text-[12px] text-[#68655D]">/</span>
          <span className="font-mono text-[12px] text-bone">plugins</span>
          <span className="flex-1" />
          <nav aria-label="Primary" className="hidden items-center gap-6 font-mono text-[11px] text-[#A9A59B] sm:flex">
            <a href="/docs/" className="hover:text-bone">docs</a>
            <a href="/roadmap" className="hover:text-bone">roadmap</a>
            <a href="/pricing" className="hover:text-bone">pricing</a>
            <a
              href="https://github.com/admirable-oss/hive"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bone"
            >
              github ↗
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero Section with 3D PluginScene ─────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-bone/[.09] bg-[radial-gradient(ellipse_90%_100%_at_70%_45%,#211d15_0%,#141413_42%,#0f0f0e_78%)]">
        <PluginStage />
        <div className="relative mx-auto grid min-h-[560px] max-w-[1440px] items-center px-[clamp(20px,5vw,72px)] py-20 md:min-h-[660px] md:grid-cols-[1.1fr_.9fr] md:py-24">
          <div className="relative z-10 max-w-[670px]">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[.17em] text-honey">
              <span className="size-1.5 bg-honey animate-pulse" /> THE HIVE PLUGIN STORE · REGISTRY V1
            </div>
            <h1 className="mt-5 text-[clamp(44px,5.8vw,82px)] leading-[.97] font-medium tracking-[-.065em]">
              Make your hive
              <br />
              <span className="text-honey">your own.</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-[#B4B0A6]">
              Discover community-built extensions for agents, workflows, and the terminal. Every installable listing comes from
              Hive’s published registry.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#trending-section"
                className="inline-flex h-11 items-center bg-honey px-5 font-mono text-[11px] font-medium tracking-[.1em] text-[#14120d] hover:bg-[#ffc85a]"
              >
                BROWSE PLUGINS ↓
              </a>
              <a
                href="/docs/config/plugins/"
                className="inline-flex h-11 items-center border border-bone/15 px-4 font-mono text-[11px] tracking-[.08em] text-[#D0CCC2] hover:border-honey/50 hover:text-bone"
              >
                PLUGIN TRUST & SAFETY ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 1: Trending this week (Prominent Header + Segregated Box)
          ─────────────────────────────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section
          id="trending-section"
          aria-labelledby="trending-heading"
          className="border-b border-bone/[.09] bg-[#0E0E0D] py-14 md:py-20"
        >
          <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)]">
            {/* Header: Title, subtitle, see all link */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bone/[.08] pb-6 mb-8">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.18em] text-honey">
                  <span className="size-1.5 rounded-full bg-honey shadow-[0_0_8px_rgba(245,185,66,.6)]" />
                  <span>01 · SIGNALS & MOMENTUM</span>
                </div>
                <h2
                  id="trending-heading"
                  className="mt-2 text-[28px] sm:text-[34px] font-medium tracking-[-.035em] text-bone"
                >
                  Trending this week
                </h2>
                <p className="mt-1 text-[14px] text-[#8E8A80]">
                  Fastest-growing extensions and high-signal tools, relative to their own size.
                </p>
              </div>

              <a
                href="#catalog"
                className="group flex items-center gap-1.5 font-mono text-[11px] text-[#A9A59B] transition-colors hover:text-honey"
              >
                <span>see all</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((plugin, idx) => (
                <TrendingCard plugin={plugin} rank={idx + 1} key={`trending-${plugin.id}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 2: Just joined the hive (Distinct Tone + Segregated Box)
          ─────────────────────────────────────────────────────────────────── */}
      {justJoined.length > 0 && (
        <section
          id="recent-section"
          aria-labelledby="recent-heading"
          className="border-b border-bone/[.09] bg-[#121211] py-14 md:py-20"
        >
          <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)]">
            {/* Header: Title, subtitle, see all link */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bone/[.08] pb-6 mb-8">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.18em] text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]" />
                  <span>02 · REGISTRY PULSE</span>
                </div>
                <h2
                  id="recent-heading"
                  className="mt-2 text-[28px] sm:text-[34px] font-medium tracking-[-.035em] text-bone"
                >
                  Just joined the hive
                </h2>
                <p className="mt-1 text-[14px] text-[#8E8A80]">
                  Fresh projects and releases that joined the catalog recently.
                </p>
              </div>

              <a
                href="#catalog"
                className="group flex items-center gap-1.5 font-mono text-[11px] text-[#A9A59B] transition-colors hover:text-emerald-400"
              >
                <span>see all</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </a>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {justJoined.map((plugin) => (
                <RecentCard plugin={plugin} key={`recent-${plugin.id}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 3: Browse everything / Complete Catalog
          ─────────────────────────────────────────────────────────────────── */}
      <section
        id="catalog"
        aria-labelledby="catalog-heading"
        className="bg-[#0F0F0E] py-16 md:py-24"
      >
        <div className="mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)]">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bone/[.08] pb-6 mb-8">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.18em] text-[#8E8A80]">
                <span className="size-1.5 rounded-full bg-[#8E8A80]" />
                <span>03 · COMPLETE DIRECTORY</span>
              </div>
              <h2
                id="catalog-heading"
                className="mt-2 text-[28px] sm:text-[34px] font-medium tracking-[-.035em] text-bone"
              >
                Browse everything
              </h2>
              <p className="mt-1 text-[14px] text-[#8E8A80]">
                Search and filter the complete reviewed registry by platform, category, and Hive compatibility.
              </p>
            </div>

            <a
              href="https://github.com/admirable-oss/hive/blob/main/PLUGIN_STORE_FRONTEND.md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] tracking-[.08em] text-honey hover:underline"
            >
              PUBLISH A PLUGIN ↗
            </a>
          </div>

          {/* Category Filter Pills */}
          <div className="mb-6 flex flex-wrap gap-2" aria-label="Browse categories">
            <button
              type="button"
              onClick={() => setCategory("")}
              aria-pressed={category === ""}
              className={`border px-3.5 py-2 font-mono text-[10.5px] tracking-[.06em] transition-colors ${
                category === ""
                  ? "border-honey/60 bg-honey/[.12] text-honey"
                  : "border-bone/[.1] text-[#AAA69C] hover:border-bone/30"
              }`}
            >
              All categories
            </button>
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(category === c ? "" : c)}
                aria-pressed={category === c}
                className={`border px-3.5 py-2 font-mono text-[10.5px] tracking-[.06em] transition-colors ${
                  category === c
                    ? "border-honey/60 bg-honey/[.12] text-honey"
                    : "border-bone/[.1] text-[#AAA69C] hover:border-bone/30"
                }`}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>

          {/* Filter Inputs Grid */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(130px,.7fr))]">
            <label className="sm:col-span-2 lg:col-span-1">
              <span className="sr-only">Search plugins</span>
              <input
                className={field}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID, maintainer, keyword…"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by platform</span>
              <select className={field} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="">All platforms</option>
                <option value="darwin">macOS</option>
                <option value="linux">Linux</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by minimum Hive version supported</span>
              <input
                className={field}
                inputMode="decimal"
                value={hiveVersion}
                onChange={(e) => setHiveVersion(e.target.value)}
                placeholder="Your Hive version (e.g. 0.10.0)"
              />
            </label>
            <label>
              <span className="sr-only">Sort plugins</span>
              <select className={field} value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest release</option>
                <option value="trending">Trending signals</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </label>
          </div>

          {/* Filter Status Bar */}
          <div className="mt-5 flex items-center justify-between gap-3 border-y border-bone/[.08] py-3.5 font-mono text-[11px] text-[#878379]">
            <span>
              {filtered.length} {filtered.length === 1 ? "plugin" : "plugins"}
              {registry ? " in published registry" : " · registry unavailable"}
            </span>
            {(query || category || platform || status || hiveVersion || sort !== "newest") && (
              <button type="button" onClick={clear} className="text-honey hover:text-[#FFE1A0]">
                CLEAR ALL FILTERS ×
              </button>
            )}
          </div>

          {registryError && (
            <div
              role="status"
              className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-amber-300/20 bg-amber-300/[.04] p-4 text-[12px] text-[#C6BDA9]"
            >
              <span>Only plugins with verified GitHub tags are shown. No fallback catalog is used.</span>
              <span className="font-mono text-[10px] text-[#8E8A80]">{registryError}</span>
            </div>
          )}

          {/* Catalog Grid */}
          {filtered.length ? (
            <>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((plugin) => (
                  <CatalogCard plugin={plugin} key={plugin.id} />
                ))}
              </div>

              {pages > 1 && (
                <nav aria-label="Plugin catalog pages" className="mt-10 flex items-center justify-center gap-4 font-mono text-[11px]">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setPage(currentPage - 1);
                      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="border border-bone/15 px-4 py-2 text-[#C5C0B5] transition-colors disabled:opacity-40"
                  >
                    ← PREVIOUS
                  </button>
                  <span className="text-[#8E8A80]">
                    {currentPage} / {pages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === pages}
                    onClick={() => {
                      setPage(currentPage + 1);
                      document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="border border-bone/15 px-4 py-2 text-[#C5C0B5] transition-colors disabled:opacity-40"
                  >
                    NEXT →
                  </button>
                </nav>
              )}
            </>
          ) : (
            <div className="mt-8 border border-bone/[.08] bg-[#111110] px-6 py-14 text-center">
              <div className="font-mono text-[10px] tracking-[.14em] text-[#817D73]">NO MATCHES</div>
              <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-[#AAA69C]">
                No registry entries match these filters. Try clearing a filter or searching for something else.
              </p>
              <button type="button" onClick={clear} className="mt-4 font-mono text-[11px] text-honey hover:underline">
                Clear all filters
              </button>
            </div>
          )}

          {registry && (
            <div className="mt-6 text-right font-mono text-[9px] text-[#66635B]">
              Registry checked {new Date(fetchedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
            </div>
          )}
        </div>
      </section>

      {/* ── Contribution Callout ─────────────────────────────────────────── */}
      <section className="border-t border-bone/[.09] bg-[#131210]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-[clamp(20px,4vw,56px)] py-14 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="font-mono text-[10px] tracking-[.14em] text-honey">BUILT SOMETHING USEFUL?</div>
            <h2 className="mt-2 text-[26px] font-medium tracking-[-.035em]">Bring it to the hive.</h2>
            <p className="mt-2 max-w-xl text-[13.5px] leading-[1.65] text-[#A9A59B]">
              Submit a manifest and immutable release for maintainer review. Discovery signals help people find projects; only a
              reviewed registry publication makes a plugin installable.
            </p>
          </div>
          <a
            href="https://github.com/admirable-oss/hive/blob/main/PLUGIN_STORE_FRONTEND.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center border border-honey/40 px-5 font-mono text-[10.5px] tracking-[.1em] text-honey hover:bg-honey/[.08]"
          >
            CONTRIBUTION & REVIEW GUIDE ↗
          </a>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-bone/[.07] bg-[#0E0E0D]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-[clamp(20px,4vw,56px)] py-6 font-mono text-[10px] text-[#77746B]">
          <span>HIVE PLUGIN STORE · EXECUTABLE CODE, REVIEW BEFORE INSTALL</span>
          <a href="/docs/config/plugins/" className="hover:text-honey">
            Plugin security guide →
          </a>
        </div>
      </footer>
    </main>
  );
}

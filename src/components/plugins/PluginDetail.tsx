import type { HivePlugin } from "@/lib/plugins";
import { categoryLabel, latestRelease } from "@/lib/plugins";
import { CopyCommand } from "@/components/shared/CopyCommand";

/* ─── helpers ──────────────────────────────────────────────────────────── */

function safeHttps(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

/* ─── sub-components ───────────────────────────────────────────────────── */

function StatusBadges({ plugin, status }: { plugin: HivePlugin; status: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[.12em]">
      {plugin.official && (
        <span className="inline-flex items-center gap-1.5 border border-honey/30 bg-honey/[.06] px-2.5 py-1 text-honey">
          <span className="size-1 rounded-full bg-honey" />
          OFFICIAL
        </span>
      )}
      {plugin.verified && (
        <span className="inline-flex items-center gap-1.5 border border-emerald-300/25 bg-emerald-300/[.04] px-2.5 py-1 text-emerald-300">
          <span className="size-1 rounded-full bg-emerald-300" />
          VERIFIED
        </span>
      )}
      {status && (
        <span className="inline-flex items-center gap-1.5 border border-orange-300/25 bg-orange-300/[.06] px-2.5 py-1 text-orange-200">
          {status}
        </span>
      )}
      <span className="text-[#89857B]">{plugin.id}</span>
    </div>
  );
}

function MetadataGrid({ plugin }: { plugin: HivePlugin }) {
  const release = latestRelease(plugin);
  const cells: [string, string][] = [
    ["LATEST RELEASE", `v${release.version}`],
    ["HIVE VERSION", `≥ ${plugin.min_hive_version}`],
    ["PLUGIN API", plugin.plugin_api ?? "—"],
    ["PLATFORMS", (plugin.platforms ?? []).map((p) => (p === "darwin" ? "macOS" : p)).join(", ") || "—"],
    ["LICENSE", plugin.license ?? "—"],
    ["MAINTAINERS", (plugin.maintainers ?? []).map((m) => m.name).join(", ") || "Not listed"],
  ];

  return (
    <dl className="m-0 grid grid-cols-2 gap-px border border-bone/[.08] bg-bone/[.06] sm:grid-cols-3">
      {cells.map(([label, value]) => (
        <div key={label} className="bg-[#111110] p-4 sm:p-5">
          <dt className="font-mono text-[9px] tracking-[.12em] text-[#77746B]">{label}</dt>
          <dd className="mt-2 break-words text-[13.5px] leading-snug text-[#D0CCC2]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReleaseTimeline({ plugin }: { plugin: HivePlugin }) {
  const sorted = [...plugin.releases].sort(
    (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
  );

  return (
    <ol className="m-0 list-none space-y-0 p-0">
      {sorted.map((r, i) => (
        <li
          key={`${plugin.id}-${r.version}`}
          className="relative border-l-2 border-bone/[.08] py-5 pl-6 first:border-l-honey/40"
        >
          {/* Timeline dot */}
          <span
            className={`absolute -left-[5px] top-6 size-2 rounded-full ${
              i === 0 ? "bg-honey shadow-[0_0_8px_rgba(245,185,66,.5)]" : "bg-[#3A3935]"
            }`}
          />

          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="m-0 font-mono text-[14px] font-medium text-honey">v{r.version}</h3>
            <time className="font-mono text-[10px] text-[#77746B]" dateTime={r.published_at}>
              {formatDate(r.published_at)}
            </time>
          </div>

          <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] leading-[1.7] text-[#B6B2A8]">
            {r.changelog || "No changelog was provided for this release."}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9.5px] text-[#5E5B54]">
            <span>{r.ref}</span>
            <span className="text-[#3A3935]">·</span>
            <span className="break-all">{r.commit}</span>
          </div>
          <div className="mt-1 break-all font-mono text-[9px] text-[#4A4740]">{r.checksum}</div>
        </li>
      ))}
    </ol>
  );
}

function Sidebar({
  plugin,
  repo,
  documentation,
  issues,
}: {
  plugin: HivePlugin;
  repo: string | null;
  documentation: string | null;
  issues: string | null;
}) {
  const release = latestRelease(plugin);
  const links = [
    repo && { label: "Repository", href: repo },
    documentation && { label: "Documentation", href: documentation },
    issues && { label: "Issue tracker", href: issues },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <aside className="sticky top-20 h-fit space-y-5">
      {/* Install box */}
      <div className="border border-bone/[.08] bg-[#111110] p-5">
        <div className="font-mono text-[9px] tracking-[.12em] text-[#89857B]">INSTALL</div>
        <div className="mt-3">
          <CopyCommand
            command={`hive plugin install ${plugin.id}`}
            display={`hive plugin install ${plugin.id}`}
            size="md"
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[#706D64]">
          Plugins execute as you. Hive verifies the pinned commit and archive checksum before asking
          you to approve.
        </p>
      </div>

      {/* Project links */}
      {links.length > 0 && (
        <div className="border border-bone/[.08] bg-[#111110] p-5">
          <div className="font-mono text-[9px] tracking-[.12em] text-[#89857B]">PROJECT LINKS</div>
          <div className="mt-4 flex flex-col gap-3">
            {links.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between text-[13px] text-[#D0CCC2] hover:text-bone"
              >
                <span>{label}</span>
                <span className="font-mono text-[10px] text-[#77746B] transition-colors group-hover:text-honey">
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Immutable source verification */}
      <div className="border border-bone/[.08] bg-[#111110] p-5">
        <div className="font-mono text-[9px] tracking-[.12em] text-[#89857B]">
          SOURCE VERIFICATION
        </div>
        <div className="mt-4 space-y-3 font-mono text-[10px] leading-relaxed text-[#77746B]">
          <div>
            <div className="text-[9px] text-[#5E5B54]">IMMUTABLE COMMIT</div>
            <div className="mt-1 break-all text-[#C1BDB2]">{release.commit}</div>
          </div>
          <div className="border-t border-bone/[.06] pt-3">
            <div className="text-[9px] text-[#5E5B54]">ARCHIVE CHECKSUM</div>
            <div className="mt-1 break-all text-[#C1BDB2]">{release.checksum}</div>
          </div>
        </div>
      </div>

      {/* Categories */}
      {(plugin.categories ?? []).length > 0 && (
        <div className="border border-bone/[.08] bg-[#111110] p-5">
          <div className="font-mono text-[9px] tracking-[.12em] text-[#89857B]">CATEGORIES</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(plugin.categories ?? []).map((c) => (
              <a
                key={c}
                href={`/plugins?category=${encodeURIComponent(c)}`}
                className="border border-bone/[.1] bg-bone/[.03] px-2.5 py-1.5 font-mono text-[10px] text-[#B9B5AB] transition-colors hover:border-honey/30 hover:text-honey"
              >
                {categoryLabel(c)}
              </a>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

/* ─── main component ───────────────────────────────────────────────────── */

export default function PluginDetail({ plugin }: { plugin: HivePlugin }) {
  const release = latestRelease(plugin);
  const repo = safeHttps(plugin.repository);
  const documentation = safeHttps(plugin.documentation);
  const issues = safeHttps(plugin.issues);
  const status = plugin.archived ? "ARCHIVED" : plugin.deprecated ? "DEPRECATED" : null;

  const shots = (plugin.screenshots ?? []).flatMap((src) => {
    const safe = safeHttps(src);
    if (!safe) return [];
    const host = new URL(safe).hostname;
    return host === "githubusercontent.com" || host.endsWith(".githubusercontent.com")
      ? [safe]
      : [];
  });

  return (
    <main className="min-h-screen bg-[#0F0F0E] font-sans text-bone">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 border-b border-bone/[.07] bg-[#0f0f0e]/90 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1280px] items-center gap-3 px-[clamp(18px,4vw,56px)]">
          <a href="/" className="flex items-center gap-2.5" aria-label="Hive home">
            <img src="/brand/logo/hive-mark-dark.svg" alt="" className="pixelated h-5 w-auto" />
            <img src="/brand/logo/hive-wordmark-dark.svg" alt="Hive" className="pixelated h-4 w-auto" />
          </a>
          <span className="font-mono text-[12px] text-[#4A4740]">/</span>
          <a href="/plugins" className="font-mono text-[12px] text-[#A9A59B] hover:text-bone">
            plugins
          </a>
          <span className="font-mono text-[12px] text-[#4A4740]">/</span>
          <span className="truncate font-mono text-[12px] text-bone">{plugin.id}</span>
          <span className="flex-1" />
          <nav className="hidden items-center gap-5 font-mono text-[11px] text-[#A9A59B] sm:flex">
            <a href="/docs/" className="hover:text-bone">
              docs
            </a>
            <a href="/pricing" className="hover:text-bone">
              pricing
            </a>
            <a
              href="/docs/config/plugins/"
              className="text-[10px] tracking-[.08em] text-honey hover:text-[#FFE1A0]"
            >
              PLUGIN SAFETY ↗
            </a>
          </nav>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative border-b border-bone/[.06] bg-[radial-gradient(ellipse_80%_100%_at_75%_-5%,#211d15_0%,#141413_45%,#0f0f0e_80%)]">
        {/* Decorative honey glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[10%] top-[15%] h-56 w-72 rounded-full bg-honey/[.04] blur-[80px]"
        />

        <div className="mx-auto max-w-[1280px] px-[clamp(20px,4vw,56px)] py-14 md:py-20">
          <StatusBadges plugin={plugin} status={status} />

          <h1 className="mt-5 max-w-3xl text-[clamp(38px,5.5vw,68px)] leading-[.98] font-medium tracking-[-.055em]">
            {plugin.name}
          </h1>

          <p className="mt-5 max-w-2xl text-[16px] leading-[1.75] text-[#B6B2A8]">
            {plugin.description}
          </p>

          {status && (
            <div
              role="alert"
              className="mt-6 inline-flex max-w-2xl items-start gap-3 border border-orange-300/25 bg-orange-300/[.05] p-4 text-[13px] leading-relaxed text-orange-100"
            >
              <span className="mt-0.5 shrink-0 text-[16px]">⚠</span>
              <span>
                This plugin is <strong>{status.toLowerCase()}</strong>. Review its current status and
                release history before installing.
              </span>
            </div>
          )}

          {/* Release info bar */}
          <div className="mt-8 flex max-w-2xl flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 border border-bone/[.08] bg-[#10100f]/80 px-4 py-3 backdrop-blur-sm">
              <div className="size-2 rounded-full bg-honey shadow-[0_0_6px_rgba(245,185,66,.4)]" />
              <div>
                <div className="font-mono text-[10px] tracking-[.1em] text-[#D0CCC2]">
                  v{release.version}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-[#77746B]">
                  Published {formatDate(release.published_at)}
                </div>
              </div>
            </div>
            <div className="hidden border border-bone/[.06] bg-[#10100f]/60 px-3 py-2.5 font-mono text-[9px] text-[#6F6C64] sm:block">
              {release.commit.slice(0, 12)}… · SHA-256 verified
            </div>
          </div>

          {/* Install CTA */}
          <div className="mt-5 max-w-lg">
            <CopyCommand
              command={`hive plugin install ${plugin.id}`}
              display={`hive plugin install ${plugin.id}`}
              size="md"
            />
          </div>

          <p className="mt-3 max-w-lg text-[11px] leading-relaxed text-[#706D64]">
            Plugins are executable code. Hive pins the source revision and shows you what will run
            before installation.{" "}
            <a href="/docs/config/plugins/" className="text-honey hover:text-[#FFE1A0]">
              Read the trust guidance →
            </a>
          </p>
        </div>
      </section>

      {/* ── Content Grid ───────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-[1280px] gap-10 px-[clamp(20px,4vw,56px)] py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-16">
        {/* Left column: main content */}
        <div className="min-w-0 space-y-12">
          {/* Plugin metadata */}
          <section>
            <h2 className="mb-5 flex items-center gap-3 text-[18px] font-medium tracking-[-.02em]">
              <span className="font-mono text-[11px] text-[#5E5B54]">01</span>
              <span className="size-1.5 bg-honey" />
              Plugin details
            </h2>
            <MetadataGrid plugin={plugin} />
          </section>

          {/* Configuration */}
          {plugin.configuration && (
            <section>
              <h2 className="mb-4 flex items-center gap-3 text-[18px] font-medium tracking-[-.02em]">
                <span className="font-mono text-[11px] text-[#5E5B54]">02</span>
                <span className="size-1.5 bg-honey" />
                Configuration
              </h2>
              <pre className="overflow-x-auto whitespace-pre-wrap border border-bone/[.08] bg-[#111110] p-5 font-mono text-[12px] leading-[1.8] text-[#C6C1B5]">
                {plugin.configuration}
              </pre>
            </section>
          )}

          {/* Installation notes */}
          {plugin.installation && (
            <section>
              <h2 className="mb-4 flex items-center gap-3 text-[18px] font-medium tracking-[-.02em]">
                <span className="font-mono text-[11px] text-[#5E5B54]">
                  {plugin.configuration ? "03" : "02"}
                </span>
                <span className="size-1.5 bg-honey" />
                Installation notes
              </h2>
              <p className="whitespace-pre-wrap text-[14px] leading-[1.8] text-[#B6B2A8]">
                {plugin.installation}
              </p>
            </section>
          )}

          {/* Screenshots */}
          {shots.length > 0 && (
            <section>
              <h2 className="mb-5 flex items-center gap-3 text-[18px] font-medium tracking-[-.02em]">
                <span className="size-1.5 bg-honey" />
                Screenshots
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {shots.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${plugin.name} screenshot ${i + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="aspect-video w-full border border-bone/[.08] bg-[#111110] object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Release history */}
          <section>
            <h2 className="mb-5 flex items-center gap-3 text-[18px] font-medium tracking-[-.02em]">
              <span className="size-1.5 bg-honey" />
              Release history
            </h2>
            <ReleaseTimeline plugin={plugin} />
          </section>
        </div>

        {/* Right column: sidebar */}
        <Sidebar plugin={plugin} repo={repo} documentation={documentation} issues={issues} />
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-bone/[.07]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-[clamp(20px,4vw,56px)] py-6 font-mono text-[10px] text-[#77746B]">
          <a href="/plugins" className="hover:text-honey">
            ← Back to all plugins
          </a>
          <a href="/docs/config/plugins/" className="hover:text-honey">
            Plugin security guide →
          </a>
        </div>
      </footer>
    </main>
  );
}

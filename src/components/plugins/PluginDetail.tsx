import type { HivePlugin } from "@/lib/plugins";
import { categoryLabel, latestRelease } from "@/lib/plugins";
import { CopyCommand } from "@/components/shared/CopyCommand";

function safeHttps(value?: string) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : null; } catch { return null; }
}

function Details({ plugin }: { plugin: HivePlugin }) {
  const release = latestRelease(plugin);
  const details = [
    ["Latest release", `v${release.version}`],
    ["Hive version", `≥ ${plugin.min_hive_version}`],
    ["Plugin API", plugin.plugin_api],
    ["Platforms", (plugin.platforms ?? []).join(", ")],
    ["License", plugin.license],
    ["Maintainers", (plugin.maintainers ?? []).map((m) => m.name).join(", ") || "Not listed"],
  ];
  return <dl className="m-0 grid grid-cols-2 gap-px border border-bone/[.08] bg-bone/[.08] sm:grid-cols-3">{details.map(([label, value]) => <div key={label} className="bg-[#111110] p-4"><dt className="font-mono text-[9px] tracking-[.11em] text-[#77746B]">{label.toUpperCase()}</dt><dd className="mt-2 break-words text-[13px] text-[#D0CCC2]">{value}</dd></div>)}</dl>;
}

export default function PluginDetail({ plugin }: { plugin: HivePlugin }) {
  const release = latestRelease(plugin);
  const repo = safeHttps(plugin.repository);
  const documentation = safeHttps(plugin.documentation);
  const issues = safeHttps(plugin.issues);
  const status = (plugin as HivePlugin & { deprecated?: boolean; archived?: boolean }).archived ? "ARCHIVED" : (plugin as HivePlugin & { deprecated?: boolean }).deprecated ? "DEPRECATED" : null;
  const shots = (plugin.screenshots ?? []).flatMap((src) => {
    const safe = safeHttps(src);
    if (!safe) return [];
    const host = new URL(safe).hostname;
    return host === "githubusercontent.com" || host.endsWith(".githubusercontent.com") ? [safe] : [];
  });
  return <main className="min-h-screen bg-[#0F0F0E] font-sans text-bone">
    <header className="sticky top-0 z-40 h-14 border-b border-bone/[.07] bg-[#0f0f0e]/90 backdrop-blur-md"><div className="mx-auto flex h-full max-w-[1180px] items-center gap-4 px-[clamp(18px,4vw,56px)]"><a href="/" aria-label="Hive home"><img src="/brand/logo/hive-wordmark-dark.svg" alt="Hive" className="pixelated h-4 w-auto"/></a><span className="font-mono text-[12px] text-[#68655D]">/</span><a href="/plugins" className="font-mono text-[12px] text-[#A9A59B]">plugins</a><span className="font-mono text-[12px] text-[#68655D]">/</span><span className="truncate font-mono text-[12px]">{plugin.id}</span><span className="flex-1"/><a href="/docs/config/plugins/" className="font-mono text-[10px] text-[#A9A59B]">plugin safety ↗</a></div></header>
    <section className="border-b border-bone/[.07] bg-[radial-gradient(ellipse_80%_110%_at_80%_0%,#211f19_0%,#141413_48%,#0f0f0e_82%)]"><div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,56px)] py-12 md:py-16">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[.1em] text-[#89857B]">{plugin.official && <span className="border border-honey/30 px-2 py-1 text-honey">OFFICIAL</span>}{plugin.verified && <span className="border border-emerald-300/25 px-2 py-1 text-emerald-300">VERIFIED</span>}{status && <span className="border border-orange-300/25 bg-orange-300/[.07] px-2 py-1 text-orange-200">{status}</span>}<span>{plugin.id}</span></div>
      <h1 className="mt-4 max-w-3xl text-[clamp(36px,6vw,64px)] leading-[1.02] font-medium tracking-[-.06em]">{plugin.name}</h1><p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-[#B6B2A8]">{plugin.description}</p>
      {status && <div role="alert" className="mt-6 max-w-2xl border border-orange-300/30 bg-orange-300/[.06] p-4 text-[13px] leading-relaxed text-orange-100">This plugin is {status.toLowerCase()}. Review its current status and release history before installing.</div>}
      <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="border border-bone/[.08] bg-[#10100f]/75 px-4 py-3"><div className="font-mono text-[9px] tracking-[.13em] text-[#77746B]">LATEST PUBLISHED RELEASE · v{release.version}</div><div className="mt-1 font-mono text-[10px] text-[#A9A59B]">commit {release.commit} · sha256 archive verified by Hive CLI</div></div><div className="font-mono text-[10px] text-[#8E8A80]">Published {new Date(release.published_at).toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}</div></div>
      <div className="mt-4 max-w-2xl"><CopyCommand command={`hive plugin install ${plugin.id}`} display={`hive plugin install ${plugin.id}`} size="md"/></div>
      <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-[#88847A]">Plugins execute as you and are not sandboxed. Hive shows the pinned source and asks you to approve before installation. <a href="/docs/config/plugins/" className="text-honey">Read the trust guidance →</a></p>
    </div></section>
    <div className="mx-auto grid max-w-[1180px] gap-10 px-[clamp(20px,4vw,56px)] py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-10">
        <section><h2 className="mb-4 text-[18px] font-medium tracking-[-.02em]">Plugin details</h2><Details plugin={plugin}/><div className="mt-3 flex flex-wrap gap-2">{(plugin.categories ?? []).map((c) => <span key={c} className="border border-bone/[.1] px-2.5 py-1.5 font-mono text-[10px] text-[#B9B5AB]">{categoryLabel(c)}</span>)}</div></section>
        {plugin.configuration && <section><h2 className="mb-3 text-[18px] font-medium">Configuration</h2><pre className="overflow-x-auto whitespace-pre-wrap border border-bone/[.08] bg-[#111110] p-5 font-mono text-[12px] leading-relaxed text-[#C6C1B5]">{plugin.configuration}</pre></section>}
        {plugin.installation && <section><h2 className="mb-3 text-[18px] font-medium">Installation notes</h2><p className="whitespace-pre-wrap text-[13px] leading-[1.75] text-[#B6B2A8]">{plugin.installation}</p></section>}
        {shots.length > 0 && <section><h2 className="mb-4 text-[18px] font-medium">Screenshots</h2><div className="grid gap-3 sm:grid-cols-2">{shots.map((src, i) => <img key={src} src={src} alt={`${plugin.name} screenshot ${i + 1}`} loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full border border-bone/[.1] bg-[#111110] object-cover"/> )}</div></section>}
        <section><h2 className="mb-4 text-[18px] font-medium">Release history</h2><ol className="m-0 list-none divide-y divide-bone/[.07] border-y border-bone/[.07] p-0">{[...plugin.releases].sort((a,b) => Date.parse(b.published_at)-Date.parse(a.published_at)).map((r) => <li key={`${plugin.id}-${r.version}`} className="py-5"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="m-0 font-mono text-[13px] text-honey">v{r.version}</h3><time className="font-mono text-[10px] text-[#77746B]" dateTime={r.published_at}>{new Date(r.published_at).toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}</time></div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#B6B2A8]">{r.changelog || "No changelog was provided for this release."}</p><div className="mt-2 break-all font-mono text-[10px] text-[#77746B]">{r.ref} · {r.commit}<br/>{r.checksum}</div></li>)}</ol></section>
      </div>
      <aside className="h-fit border border-bone/[.08] bg-[#111110] p-5"><h2 className="font-mono text-[10px] tracking-[.13em] text-[#89857B]">PROJECT LINKS</h2><div className="mt-4 flex flex-col gap-3 text-[13px]">{repo && <a href={repo} target="_blank" rel="noopener noreferrer">Repository ↗</a>}{documentation && <a href={documentation} target="_blank" rel="noopener noreferrer">Documentation ↗</a>}{issues && <a href={issues} target="_blank" rel="noopener noreferrer">Issue tracker ↗</a>}</div><div className="mt-5 border-t border-bone/[.07] pt-4 font-mono text-[10px] leading-relaxed text-[#77746B]">Immutable source<br/><span className="break-all text-[#C1BDB2]">{release.commit}</span><br/><br/>Archive checksum<br/><span className="break-all text-[#C1BDB2]">{release.checksum}</span></div></aside>
    </div>
    <footer className="border-t border-bone/[.07] px-5 py-6 text-center font-mono text-[10px] text-[#77746B]"><a href="/plugins">← Back to all plugins</a></footer>
  </main>;
}

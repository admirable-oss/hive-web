// Seeds the official Hive plugins into the website's registry copies from
// the release records published by the hive repository.
// Usage: node .github/scripts/seed-official-registry.mjs <hive-checkout>
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const [hiveRoot] = process.argv.slice(2);
assert.ok(hiveRoot, "usage: node seed-official-registry.mjs <hive checkout>");

const records = JSON.parse(await readFile(`${hiveRoot}/registry/official-releases.json`, "utf8"));
const listings = JSON.parse(await readFile(`${hiveRoot}/registry/official-listings.json`, "utf8"));
assert.equal(records.schema, 1, "unsupported official-releases schema");

for (const copy of ["public/plugins/registry.json", "src/data/plugins-registry.json"]) {
  const registry = JSON.parse(await readFile(copy, "utf8"));
  for (const plugin of records.plugins) {
    const meta = listings[plugin.id];
    assert.ok(meta, `no listing metadata for ${plugin.id}`);
    const entry = {
      ...meta,
      releases: plugin.releases.map((r) => ({
        version: r.version,
        ref: r.ref,
        commit: r.commit,
        checksum: r.checksum,
        subdir: plugin.subdir,
        changelog: r.changelog ?? "Official release.",
        published_at: r.published_at,
      })),
    };
    const i = registry.plugins.findIndex((p) => p.id === plugin.id);
    if (i >= 0) registry.plugins[i] = entry;
    else registry.plugins.push(entry);
  }
  registry.plugins.sort((a, b) => a.id.localeCompare(b.id));
  await writeFile(copy, JSON.stringify(registry, null, 2) + "\n");
}
console.log("seeded official plugin catalog entries");

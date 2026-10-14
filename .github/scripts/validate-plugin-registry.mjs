import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validatePluginRegistry } from "../../src/lib/plugins.ts";

const root = new URL("../../", import.meta.url);
const publicPath = new URL("public/plugins/registry.json", root);
const mirrorPath = new URL("src/data/plugins-registry.json", root);
const publicData = JSON.parse(await readFile(publicPath, "utf8"));
const mirrorData = JSON.parse(await readFile(mirrorPath, "utf8"));
assert.deepEqual(mirrorData, publicData, "source and public registry copies must match");
validatePluginRegistry(publicData);

const duplicate = structuredClone(publicData);
duplicate.plugins.push(structuredClone(duplicate.plugins[0]));
assert.throws(() => validatePluginRegistry(duplicate), /invalid or duplicate plugin entry/);

const badChecksum = structuredClone(publicData);
badChecksum.plugins[0].releases[0].checksum = "sha256:broken";
assert.throws(() => validatePluginRegistry(badChecksum), /invalid release record/);

const reversedRange = structuredClone(publicData);
reversedRange.plugins[0].min_hive_version = "9.0.0";
reversedRange.plugins[0].max_hive_version = "1.0.0";
assert.throws(() => validatePluginRegistry(reversedRange), /reversed Hive compatibility range/);
console.log(`validated ${publicData.plugins.length} public plugin listing(s)`);

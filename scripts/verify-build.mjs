import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const manifest = JSON.parse(await readFile("dist/build-manifest.json", "utf8"));
const artifact = `artifacts/builds/${manifest.id}`;
assert.deepEqual(JSON.parse(await readFile(`${artifact}/build-manifest.json`, "utf8")), manifest);
assert.deepEqual(JSON.parse(await readFile("artifacts/current-build.json", "utf8")), manifest);
for (const root of ["dist", artifact]) {
  assert.ok((await readFile(`${root}/index.html`, "utf8")).includes(`aria-label="Build Identifier">${manifest.id}</div>`));
  assert.ok((await readFile(`${root}/BUILD_REPORT.md`, "utf8")).includes(manifest.id));
}
console.log(`BUILD VERIFIED ${manifest.id}`);

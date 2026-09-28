import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { reserveLocal } from "../scripts/build-identity.mjs";
test("simultaneous local reservations cannot reuse an ordinal; later allocations retain the scope", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "lever-identities-"));
  try {
    const allocations = await Promise.all(Array.from({ length: 8 }, () => reserveLocal(directory)));
    assert.deepEqual(allocations.map(a => a.ordinal).sort((a,b) => a-b), [1,2,3,4,5,6,7,8]);
    assert.equal(new Set(allocations.map(a => a.scope)).size, 1);
    const next = await reserveLocal(directory);
    assert.equal(next.ordinal, 9);
    assert.equal(next.scope, allocations[0].scope);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

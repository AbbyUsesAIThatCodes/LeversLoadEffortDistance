# Build Identity

## Identity Contract

`release.json` is the release record; its version must match `package.json`.
Version 0.1.0 remains in development under the existing **Integrated Core**
roadmap milestone, now used consistently as the release codename. Its slug is
`Integrated-Core`. The classroom release remains Issue #3. This change preserves
the save schema and storage key. A future accepted release can increment the
minor version for features, patch for compatible corrections, or major for a
breaking established compatibility contract; do not relabel historical builds.

Canonical identity:
`<version>_<codename-slug>_<scope>_build-<ordinal>_<UTC>_g<12-char-SHA>[-dirty-<fingerprint>]_web`

Every artifact-producing invocation reserves an ordinal before bundling. CI
uses the `build-identity-ledger` branch and `build-ledger.json`, updated with the
GitHub Contents API's SHA compare-and-swap. Each PR has its own `pr-N` counter;
main has its own counter. Reservations survive reruns, rebases, and failed
builds, with their history in ledger commits. Concurrent conflicts retry rather
than reusing a number. The build job alone needs contents write permission.
PR builds never publish Pages; the ledger branch has no deployment trigger.

Local invocations use a clearly labeled UUID scope and an atomic lock/counter
in `.git/build-identity/`. They do not claim a PR ordinal. Re-cloning creates a
new local scope. Fork PRs use an explicit local scope because their read-only
credential cannot reserve a shared ordinal. A stuck local lock fails closed;
remove it only after verifying no allocator is active. Reservations are retained
if later build stages fail.

The UTC timestamp is captured once immediately before metadata injection.
The manifest retains full source SHA, dirty state, a SHA-256 fingerprint of
build inputs, target, CI built commit, and PR head where available. Console,
HTML, manifest, report, and artifact name are derived from that same object.
Retesting, downloading, or deploying an existing artifact keeps its identity.

## Identifier Location Inventory

| Surface | Location and Mechanism | Verification | Status |
| --- | --- | --- | --- |
| Release Record | `release.json`; package version consistency gate | Build rejects mismatches | Implemented |
| Shared Ordinals | `build-identity-ledger:build-ledger.json`; atomic SHA updates | CI reservation and manifest ledger commit | Implemented; CI verifies access |
| Local Ordinals | `.git/build-identity/ledger.json`; exclusive directory lock | Concurrent allocation test | Implemented |
| Build Console | `npm run build`, `scripts/build.mjs` | Full ID at start, success/failure | Implemented |
| CI Console and Summary | `.github/workflows/pages.yml`; generated report | Same manifest and `GITHUB_STEP_SUMMARY` | Implemented |
| Distribution Directory | `artifacts/builds/<full-ID>/` | `scripts/verify-build.mjs` | Implemented |
| Downloadable CI Artifact | Review Build upload, named with full ID | Workflow artifact name | Implemented |
| Game Label | `public/index.html` / `#build-identity`, below title | Browser verifies full text, visibility, wrapping | Implemented |
| Manifest and Current Report | Distribution `build-manifest.json`, `BUILD_REPORT.md`; `artifacts/current-build.json` | Consistency verifier | Implemented |
| README and Roadmap | Links to this contract and generated report locations | Review | Implemented |
| PR Handoff | PR description and `.github/pull_request_template.md` | Exact review ID plus verification results | Implemented |
| Contributor Instructions | `AGENTS.md` | Links to this inventory | Implemented |
| Deployed Record | Hosted `/build-manifest.json` and `/BUILD_REPORT.md`, carried with Pages artifact | Read after an authorized deployment | Implemented for future deployments; this PR does not deploy |
| IDE Export | No separate IDE build/export entrypoint exists | N/A | N/A |

The generated report inside a review artifact is authoritative for that artifact.
The hosted manifest identifies the currently deployed build independently.
Generated reports and dist files are ignored: do not commit them and rebuild in
an attempt to make an ID describe its own generated timestamp commit.

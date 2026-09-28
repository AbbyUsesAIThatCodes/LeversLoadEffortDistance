import { readFile, writeFile, mkdir, rm, appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Local builds are explicitly local. No PR ordinal is invented when offline.
export async function reserveLocal(directory) {
  await mkdir(directory, { recursive: true });
  const lock = path.join(directory, "lock");
  let acquired = false;
  for (let i = 0; i < 100; i++) {
    try { await mkdir(lock); acquired = true; break; }
    catch (e) { if (e.code !== "EEXIST") throw e; await delay(20); }
  }
  if (!acquired) throw new Error("Build allocator is busy; check for an interrupted local reservation.");
  try {
    const file = path.join(directory, "ledger.json");
    let ledger;
    try { ledger = JSON.parse(await readFile(file, "utf8")); }
    catch (e) { if (e.code !== "ENOENT") throw e; ledger = { scope: `local-${randomUUID().slice(0, 8)}`, ordinal: 0 }; }
    ledger.ordinal++;
    await writeFile(file, JSON.stringify(ledger));
    return ledger;
  } finally { await rm(lock, { recursive: true }); }
}

async function reserveRemote(scope) {
  const repository = process.env.GITHUB_REPOSITORY;
  const root = `https://api.github.com/repos/${repository}`;
  async function api(route, method = "GET", body) {
    const response = await fetch(root + route, {
      method,
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "X-GitHub-Api-Version": "2022-11-28" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, ok: response.ok, data: await response.json() };
  }
  const branch = "build-identity-ledger";
  const ref = await api(`/git/ref/heads/${branch}`);
  if (ref.status === 404) {
    const created = await api("/git/refs", "POST", { ref: `refs/heads/${branch}`, sha: process.env.GITHUB_SHA });
    if (!created.ok && created.status !== 422) throw new Error(`Cannot initialize build ledger (${created.status}).`);
  } else if (!ref.ok) throw new Error(`Cannot read build ledger (${ref.status}).`);
  for (let attempt = 0; attempt < 12; attempt++) {
    const previous = await api(`/contents/build-ledger.json?ref=${branch}`);
    if (!previous.ok && previous.status !== 404) throw new Error(`Cannot read build allocations (${previous.status}).`);
    const ledger = previous.ok ? JSON.parse(Buffer.from(previous.data.content, "base64").toString()) : { scopes: {} };
    const ordinal = (ledger.scopes[scope] || 0) + 1;
    ledger.scopes[scope] = ordinal;
    ledger.lastReservation = { scope, ordinal, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT, source: process.env.GITHUB_SHA, reservedAt: new Date().toISOString() };
    const result = await api("/contents/build-ledger.json", "PUT", {
      branch, message: `Reserve ${scope} build ${ordinal}`,
      content: Buffer.from(JSON.stringify(ledger, null, 2) + "\n").toString("base64"),
      ...(previous.ok ? { sha: previous.data.sha } : {}),
    });
    if (result.ok) return { scope, ordinal, ledgerCommit: result.data.commit.sha };
    if (![409, 422].includes(result.status)) throw new Error(`Cannot reserve build identity (${result.status}).`);
    await delay(100 * (attempt + 1));
  }
  throw new Error("Concurrent build reservations did not resolve; no artifact was built.");
}

export async function createIdentity() {
  const release = JSON.parse(await readFile("release.json", "utf8"));
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  if (release.version !== pkg.version || !/^\d+\.\d+\.\d+$/.test(release.version)) throw new Error("Release and package versions must match MAJOR.MINOR.PATCH.");
  let event = {};
  if (process.env.GITHUB_EVENT_PATH) event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  const pr = event.pull_request;
  const trustedCI = process.env.GITHUB_ACTIONS === "true" && (!pr || pr.head.repo.full_name === process.env.GITHUB_REPOSITORY);
  if (trustedCI && !process.env.GITHUB_TOKEN) throw new Error("Trusted CI must reserve an identity in the durable ledger.");
  const allocation = trustedCI
    ? await reserveRemote(pr ? `pr-${pr.number}` : "main")
    : await reserveLocal(path.join(git("rev-parse", "--git-dir"), "build-identity"));
  const sha = git("rev-parse", "HEAD");
  const hash = createHash("sha256");
  const inputs = git("ls-files", "--cached", "--others", "--exclude-standard", "src", "public", "scripts", "package.json", "package-lock.json", "release.json").split("\n").filter(Boolean).sort();
  for (const input of inputs) { hash.update(input + "\0"); hash.update(await readFile(input)); }
  const fingerprint = hash.digest("hex");
  const dirty = !!git("status", "--porcelain", "--untracked-files=normal");
  // Capture exactly once, immediately before metadata injection and bundling.
  const builtAt = new Date().toISOString();
  const timestamp = builtAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const target = "web";
  const id = `${release.version}_${release.codenameSlug}_${allocation.scope}_build-${String(allocation.ordinal).padStart(3, "0")}_${timestamp}_g${sha.slice(0, 12)}${dirty ? `-dirty-${fingerprint.slice(0, 8)}` : ""}_${target}`;
  return { ...release, ...allocation, id, builtAt, target, source: { sha, dirty, fingerprint, prHead: pr?.head.sha || null, ciCommit: process.env.GITHUB_SHA || null } };
}

export async function reportIdentity(manifest, output) {
  const report = `# Build Report\n\nBuild: \`${manifest.id}\`\n\n- Status: ${manifest.status}\n- Built At (UTC): ${manifest.builtAt}\n- Source: ${manifest.source.sha}\n- Dirty Sources: ${manifest.source.dirty}\n- Input SHA-256: ${manifest.source.fingerprint}\n- PR Head: ${manifest.source.prHead || "Local or Main"}\n- Target: ${manifest.target}\n\nThe manifest, game label, build console, and enclosing artifact directory share this identity. Test and deploy this artifact without rebuilding to preserve its identifier.\n`;
  await writeFile(path.join(output, "BUILD_REPORT.md"), report);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `build_id=${manifest.id}\nbuild_path=${output}\n`);
}

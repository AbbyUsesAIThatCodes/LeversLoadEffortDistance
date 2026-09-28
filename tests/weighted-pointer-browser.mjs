import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { verifyBeamMotion } from "./beam-motion-browser.mjs";
import { STOP, STORAGE_KEY } from "../src/model.js";

const port = Number(process.env.PORT || 4183), url = `http://127.0.0.1:${port}/LeversLoadEffortDistance/`;
const server = spawn(process.execPath, ["scripts/serve.mjs"], { stdio: "ignore", env: { ...process.env, PORT: String(port) } });
let browser;
const errors = [];
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const manifest = JSON.parse(await readFile("dist/build-manifest.json", "utf8"));
  await mkdir("artifacts/weighted-pointer", { recursive: true });
  const watch = page => page.on("pageerror", e => errors.push(e.message));
  for (const mode of ["true", "fallback"]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    watch(page);
    await page.addInitScript(({ key, mode }) => {
      localStorage.setItem(key, JSON.stringify({ state: { load: -75, fulcrum: 25, effort: 225, loadMass: 400, effortMass: 250 }, held: true, showMath: true, reduced: false }));
      if (mode === "fallback") {
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(kind, ...args) { return kind.startsWith("webgl") ? null : get.call(this, kind, ...args); };
      }
    }, { key: STORAGE_KEY, mode });
    await page.clock.install({ time: new Date("2026-09-28T16:00:00Z") });
    await page.goto(url);
    await page.waitForFunction(mode => document.querySelector("#app").dataset.ready === mode, mode);
    await page.evaluate(() => document.fonts.ready);
    await page.clock.pauseAt(new Date("2026-09-28T17:00:00Z"));
    const click = id => page.locator(id).evaluate(e => e.click());
    const input = (id, value) => page.locator(id).evaluate((e, value) => { e.value = String(value); e.dispatchEvent(new Event("change", { bubbles: true })); }, value);
    const angle = () => page.locator("#app").evaluate(e => Number(e.dataset.angle));
    const status = () => page.locator("#beam-status").innerText();
    assert.equal(await page.locator("#build-identity").innerText(), manifest.id);
    const identity = await page.locator("#build-identity").boundingBox();
    assert.ok(identity.y >= 0 && identity.y + identity.height < 150 && identity.x >= 0 && identity.x + identity.width <= 1366);
    if (mode === "true") await click("#side");
    await click("#controls-toggle");
    await click("#hold");
    await page.clock.runFor(1500);
    assert.equal(await angle(), -STOP);
    await input("#mass-effort", 200);
    assert.equal(await angle(), -STOP, "balance edit does not reset the beam");
    assert.equal(await status(), "Settling…");
    await page.screenshot({ path: `artifacts/weighted-pointer/${mode}-settling.png` });
    await page.clock.runFor(100);
    assert.ok(await angle() > -STOP && await angle() < -0.01, "pointer begins a continuous return");
    await page.clock.runFor(4000);
    assert.ok(Math.abs(await angle()) < 0.002);
    assert.equal(await status(), "Balanced");
    if (mode === "fallback") {
      const bob = page.locator("[data-pointer-bob]");
      assert.equal(await bob.count(), 1);
      assert.ok(Math.abs(Number(await bob.getAttribute("cx")) - 424) < 0.25);
    }
    await page.screenshot({ path: `artifacts/weighted-pointer/${mode}-balanced.png` });
    await click("#hold");
    await input("#fulcrum-position", 0);
    await input("#distance-load", 75);
    await input("#distance-effort", 100);
    await input("#mass-load", 25);
    await input("#mass-effort", 25);
    await click("#hold");
    await page.clock.runFor(3000);
    assert.ok(Math.abs(await angle()) > Math.PI / 180 && Math.abs(await angle()) < 0.03);
    assert.equal(await status(), "Effort Side Down");
    await page.screenshot({ path: `artifacts/weighted-pointer/${mode}-small-imbalance.png` });
    if (mode === "true") {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await click("#fit");
      await page.clock.runFor(32);
      await page.screenshot({ path: "artifacts/weighted-pointer/projector.png" });
    }
    await page.close();
  }
  await verifyBeamMotion(browser, url, watch);
  assert.deepEqual(errors, []);
  await writeFile("artifacts/weighted-pointer/verification.json", JSON.stringify({ buildId: manifest.id, passed: true, checks: ["reported arrangement", "settling status", "smallest imbalance", "WebGL and SVG", "laptop and projector", "continuous drags and cancellations", "Hold and Help", "reduced animation", "WebGL loss", "visible build identity"] }, null, 2));
  console.log(`PASS: weighted pointer browser review ${manifest.id}`);
} finally { await browser?.close(); server.kill(); }

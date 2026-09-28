import assert from "node:assert/strict";
import { STOP, restingAngle } from "../src/model.js";

export async function verifyBeamMotion(browser, url, watch) {
  for (const mode of ["true", "fallback"]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    watch(page);
    if (mode === "fallback") await page.addInitScript(() => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return kind.startsWith("webgl") ? null : get.call(this, kind, ...args);
      };
    });
    await page.clock.install({ time: new Date("2026-09-28T02:00:00Z") });
    await page.goto(url);
    await page.waitForFunction((mode) => document.querySelector("#app").dataset.ready === mode, mode);
    await page.evaluate(() => document.fonts.ready);
    await page.clock.pauseAt(new Date("2026-09-28T03:00:00Z"));
    const angle = () => page.locator("#app").evaluate((e) => Number(e.dataset.angle));
    // Dispatch control events with the clock paused to catch even a single
    // erroneous level frame, then advance real animation frames explicitly.
    const click = (id) => page.locator(id).evaluate((e) => e.click());
    const input = (id, value, event = "change") => page.locator(id).evaluate((e, { value, event }) => {
      e.value = String(value);
      e.dispatchEvent(new Event(event, { bubbles: true }));
    }, { value, event });
    const settle = () => page.clock.runFor(1000);
    const equilibrium = async () => restingAngle(await page.evaluate(() => ({
      load: Number(document.querySelector('[data-tag="load"]').dataset.coordinate),
      effort: Number(document.querySelector('[data-tag="effort"]').dataset.coordinate),
      fulcrum: Number(document.querySelector('#fulcrum-position').value),
      loadMass: Number(document.querySelector('#mass-load').value),
      effortMass: Number(document.querySelector('#mass-effort').value),
    })));
    const nearEquilibrium = async (message) => assert.ok(Math.abs(await angle() - await equilibrium()) < 0.005, message);
    async function startTilted() {
      await click("#reset");
      if (mode === "true") await click("#side");
      await input("#mass-load", 100);
      await input("#distance-load", 200);
      await input("#distance-effort", 100);
      await click("#hold");
      await settle();
      assert.equal(await angle(), STOP);
    }
    await startTilted();
    if (mode === "true") {
      for (const swapped of [false, true]) {
        if (swapped) { await click("#swap"); await settle(); }
        const original = await angle();
        for (const role of ["load", "effort", "fulcrum"]) {
          const tag = page.locator(`[data-tag="${role}"]`);
          const coordinate = await tag.getAttribute("data-coordinate");
          const box = await tag.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.clock.runFor(160);
          assert.equal(await angle(), original, `${role}: grabbing keeps the tilt in either arrangement`);
          assert.notEqual(await page.locator("#beam-status").innerText(), "Held Level");
          await page.mouse.up();
          await page.clock.runFor(32);
          assert.equal(await angle(), original);
          assert.equal(await tag.getAttribute("data-coordinate"), coordinate);
        }
      }
      // Move each role far enough to reverse the turning effect. The beam
      // responds while the pointer remains down, with no reset at either end.
      for (const role of ["load", "effort", "fulcrum"]) {
        await startTilted();
        const tag = page.locator(`[data-tag="${role}"]`), box = await tag.boundingBox();
        const points = await page.locator("#leaders circle").evaluateAll((nodes) => Object.fromEntries(nodes.map((n) => [n.dataset.point, Number(n.getAttribute("cx"))])));
        const pixelsPerMM = (points.effort - points.load) / 300;
        const delta = role === "load" ? 125 : role === "effort" ? 150 : -75;
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + delta * pixelsPerMM, y);
        assert.equal(await angle(), STOP, `${role}: moving preserves the current angle`);
        await page.clock.runFor(16);
        assert.ok(await angle() > 0.15, `${role}: transitions from the previous tilt`);
        await settle();
        await nearEquilibrium(`${role}: new turning effect acts during drag`);
        const releaseAngle = await angle();
        await page.mouse.up();
        assert.equal(await angle(), releaseAngle, `${role}: release does not level`);
      }
      for (const cancel of ["Escape", "pointercancel", "blur"]) {
        await startTilted();
        const tag = page.locator('[data-tag="effort"]'), box = await tag.boundingBox();
        const before = await tag.getAttribute("data-coordinate");
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2);
        assert.notEqual(await tag.getAttribute("data-coordinate"), before);
        if (cancel === "Escape") await page.keyboard.press("Escape");
        else await page.evaluate((kind) => window.dispatchEvent(kind === "blur"
          ? new Event("blur") : new PointerEvent(kind, { pointerId: 1 })), cancel);
        await page.mouse.up();
        assert.equal(await tag.getAttribute("data-coordinate"), before, `${cancel} restores the arrangement`);
        assert.equal(await angle(), STOP, `${cancel} preserves tilt`);
      }
    }
    for (const [id, value] of [["#distance-load", 75], ["#distance-effort", 250], ["#fulcrum-position", -75]]) {
      await startTilted();
      await input(id, value);
      assert.equal(await angle(), STOP, `${mode}: ${id} preserves tilt immediately`);
      await page.clock.runFor(16);
      assert.ok(await angle() > 0.15, `${mode}: ${id} transitions from the previous tilt`);
      await settle();
      await nearEquilibrium(`${mode}: ${id} responds to the changed forces`);
    }
    await startTilted();
    await input("#distance-slider-load", 100, "input");
    assert.equal(await angle(), STOP, `${mode}: balanced slider edit keeps tilt immediately`);
    await settle();
    assert.ok(Math.abs(await angle()) < STOP / 2, `${mode}: pointer restores level smoothly`);
    const pausedAngle = await angle();
    await click("#help");
    await settle();
    assert.equal(await angle(), pausedAngle, `${mode}: Help pauses in place`);
    await page.locator("#reduced").evaluate((e) => {
      e.checked = true; e.dispatchEvent(new Event("change"));
    });
    await click(".dialog-close.corner");
    await settle();
    assert.equal(await angle(), 0, `${mode}: balanced reduced animation reaches level`);
    await click("#hold");
    await page.clock.runFor(32);
    assert.equal(await angle(), 0, `${mode}: Hold levels the beam`);
    await input("#fulcrum-position", 25);
    await settle();
    assert.equal(await angle(), 0, `${mode}: held edits stay level`);
    await click("#hold");
    await settle();
    await nearEquilibrium(`${mode}: Release uses the edited arrangement`);
    const beforeLoss = await angle();
    if (mode === "true") {
      await page.locator("canvas").evaluate((e) => e.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
      assert.equal(await page.locator("#app").getAttribute("data-ready"), "fallback");
      assert.equal(await angle(), beforeLoss, "WebGL loss carries the current tilt into the diagram");
    }
    await click("#reset");
    await page.clock.runFor(32);
    assert.equal(await angle(), 0, `${mode}: Reset explicitly enables Hold`);
    assert.equal(await page.locator("#app").getAttribute("data-held"), "true");
    await page.close();
  }
  console.log("PASS: Issue #13 continuous motion, all role drags, cancellations, Hold, Help, reduced animation, and diagram parity.");
}

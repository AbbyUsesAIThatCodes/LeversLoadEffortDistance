import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { DEFAULT, PRESETS, POINTER, STOP, advance, torque, appliedTorque, restingAngle, measures, balanceStatus, swapPositions } from "../src/model.js";
import { createApparatus, SCALE, HEIGHT } from "../src/apparatus.js";

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);
const example = { load: -75, fulcrum: 25, effort: 225, loadMass: 400, effortMass: 200 };
test("reported off-center arrangement and inertia extremes return level from either stop", () => {
  for (const state of [example, DEFAULT, PRESETS.offset,
    { load: -75, effort: 75, fulcrum: 0, loadMass: 25, effortMass: 25 },
    { load: -250, effort: 250, fulcrum: 0, loadMass: 1000, effortMass: 1000 }]) {
    assert.equal(measures(state).direction, "balance");
    assert.equal(restingAngle(state), 0);
    for (const angle of [-STOP, STOP]) for (const fps of [30, 60, 144]) {
      let motion = { angle, velocity: Math.sign(angle) * 0.3 };
      assert.equal(balanceStatus(state, motion), "Settling…");
      for (let i = 0; i < fps * 6; i++) motion = advance(state, motion, 1 / fps);
      close(motion.angle, 0, 0.002);
      assert.equal(balanceStatus(state, motion), "Balanced");
      assert.equal(Math.sign(torque(state, angle)), -Math.sign(angle));
    }
  }
});
test("smallest imbalance has a visible equilibrium and never counts as balanced", () => {
  const initial = { load: -75, effort: 100, fulcrum: 0, loadMass: 25, effortMass: 25 };
  for (const state of [initial, swapPositions(initial)]) {
    const target = restingAngle(state);
    assert.ok(Math.abs(target) > Math.PI / 180 && Math.abs(target) < STOP);
    close(torque(state, target), 0);
    assert.notEqual(balanceStatus(state, { angle: 0, velocity: 0 }), "Balanced");
    for (const angle of [-STOP, STOP]) {
      let motion = { angle, velocity: 0 };
      for (let i = 0; i < 600; i++) motion = advance(state, motion, 1 / 60);
      close(motion.angle, target, 1e-5);
      assert.equal(Math.sign(motion.angle), Math.sign(appliedTorque(state)));
    }
  }
  assert.equal(balanceStatus(example, { angle: 0, velocity: 1 }), "Settling…");
  assert.equal(balanceStatus(example, { angle: 0, velocity: 0 }, true), "Held Level");
});
test("pointer geometry follows the movable pivot and its torque matches the rendered bob", () => {
  const a = createApparatus(), bob = a.pointer.getObjectByName("pointer-bob");
  for (const fulcrum of [-175, 0, 175]) for (const angle of [-STOP, 0, STOP]) {
    const state = { load: -250, effort: 250, fulcrum, loadMass: 1000, effortMass: 1000 };
    a.update(state, angle);
    const center = bob.getWorldPosition(new THREE.Vector3());
    close(center.x, fulcrum / SCALE + POINTER.length / SCALE * Math.sin(angle));
    close(center.y, HEIGHT - POINTER.length / SCALE * Math.cos(angle));
    const bobTorque = -(center.x - fulcrum / SCALE) * SCALE / 1000 * POINTER.mass / 1000 * 9.81;
    close(torque(state, angle), appliedTorque(state, angle) + bobTorque);
    const bounds = new THREE.Box3().setFromObject(a.pointer);
    assert.ok(bounds.min.y > 0, "pointer clears the desk");
    for (const role of ["load", "effort"]) assert.ok(!bounds.intersectsBox(new THREE.Box3().setFromObject(a.weights[role])), "pointer clears the masses");
    close(a.base.getObjectByName("pointer-zero-mark").getWorldPosition(new THREE.Vector3()).x, fulcrum / SCALE);
    assert.ok(!a.pickable.includes(bob), "pointer is apparatus, not a third student-controlled weight");
  }
});

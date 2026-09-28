import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT,
  PRESETS,
  ROLES,
  valid,
  move,
  step,
  setDistance,
  setMass,
  swapPositions,
  measures,
  torque,
  appliedTorque,
  pointerTorque,
  advance,
  STOP,
  restore,
} from "../src/model.js";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} ≈ ${b}`);
test("required balanced case, swap, and load-side motion", () => {
  const m = measures(DEFAULT);
  assert.equal(m.loadMoment, 20000);
  assert.equal(m.effortMoment, 20000);
  assert.equal(m.ima, 2);
  assert.equal(m.neededMass, 100);
  assert.equal(torque(DEFAULT), 0);
  const swapped = swapPositions(DEFAULT);
  assert.deepEqual(swapped, {
    load: 200,
    effort: -100,
    fulcrum: 0,
    loadMass: 200,
    effortMass: 100,
  });
  const n = measures(swapped);
  assert.equal(n.loadMoment, 40000);
  assert.equal(n.effortMoment, 10000);
  assert.equal(n.ima, 0.5);
  assert.equal(n.neededMass, 400);
  assert.equal(n.forceRatio, 2);
  assert.equal(n.direction, "load");
  const motion = advance(swapped, { angle: 0, velocity: 0 }, 0.1);
  assert.ok(motion.angle < 0, "load on the right moves downward");
  assert.deepEqual(swapPositions(swapped), DEFAULT);
  close(m.loadTorque, 0.1962);
  close(m.effortTorque, 0.1962);
  close(torque(swapped), -0.2943);
});
test("off-center swap exchanges exact positions and arms, never masses or pivot", () => {
  const original = { ...PRESETS.offset, loadMass: 275, effortMass: 75 },
    swapped = swapPositions(original);
  assert.equal(swapped.fulcrum, -75);
  assert.equal(swapped.load, 125);
  assert.equal(swapped.effort, -175);
  assert.equal(swapped.loadMass, 275);
  assert.equal(swapped.effortMass, 75);
  assert.equal(measures(swapped).loadArm, measures(original).effortArm);
  assert.deepEqual(swapPositions(swapped), original);
});
// Enumerate every permitted coordinate arrangement, both role orientations.
const states = [];
for (let left = -250; left <= 100; left += 25)
  for (let right = left + 150; right <= 250; right += 25)
    for (let fulcrum = left + 75; fulcrum <= right - 75; fulcrum += 25) {
      const state = { ...DEFAULT, load: left, effort: right, fulcrum };
      states.push(state, swapPositions(state));
    }
test("all coordinate states preserve ordering under move, step, distance, mass, swap and restore", () => {
  for (const state of states) {
    assert.ok(valid(state));
    assert.deepEqual(swapPositions(swapPositions(state)), state);
    for (const role of ROLES) {
      for (const target of [
        -1e9,
        -250,
        -26,
        0,
        26,
        250,
        1e9,
        NaN,
        Infinity,
        "",
        null,
      ])
        assert.ok(valid(move(state, role, target)));
      for (const direction of [-1, 0, 1])
        assert.ok(valid(step(state, role, direction)));
      if (role !== "fulcrum")
        for (const target of [
          -1e9,
          0,
          25,
          75,
          100,
          425,
          1e9,
          NaN,
          Infinity,
          "",
        ]) {
          assert.ok(valid(setDistance(state, role, target)));
          assert.ok(valid(setMass(state, role, target)));
        }
    }
    assert.deepEqual(restore(JSON.stringify({ state })).state, state);
    for (const mass of [25, 1000]) {
      const extreme = { ...state, loadMass: mass, effortMass: 1025 - mass };
      for (const angle of [-STOP, 0, STOP]) {
        const motion = advance(extreme, { angle, velocity: 0 }, 0.1);
        assert.ok(
          Number.isFinite(motion.angle) && Number.isFinite(motion.velocity),
        );
        assert.ok(Math.abs(motion.angle) <= STOP);
        close(torque(extreme, angle), appliedTorque(extreme) * Math.cos(angle) + pointerTorque(angle));
      }
    }
  }
});
test("input coercion and invalid saves cannot introduce crossing or non-finite arms", () => {
  for (const raw of [
    null,
    "not json",
    "{}",
    JSON.stringify({ state: { ...DEFAULT, load: 100 } }),
    JSON.stringify({ state: { ...DEFAULT, effort: 0 } }),
    JSON.stringify({ state: { ...DEFAULT, loadMass: "200" } }),
    JSON.stringify({ state: { ...DEFAULT, effort: Infinity } }),
  ])
    assert.deepEqual(restore(raw).state, DEFAULT);
  const s = restore(
    JSON.stringify({
      state: PRESETS.offset,
      held: false,
      showMath: false,
      reduced: true,
    }),
  );
  assert.equal(s.held, false);
  assert.equal(s.showMath, false);
  assert.equal(s.reduced, true);
  for (const value of ["", null, NaN, Infinity, "x", true])
    assert.deepEqual(move(DEFAULT, "load", value), DEFAULT);
  assert.equal(setMass(DEFAULT, "load", 38).loadMass, 50);
  assert.equal(setDistance(DEFAULT, "load", 1).load, -75);
});
test("balanced motion stays still; held/released reset is independent of position swapping", () => {
  assert.deepEqual(advance(DEFAULT, { angle: 0, velocity: 0 }, 1), {
    angle: 0,
    velocity: 0,
  });
  const s = swapPositions(DEFAULT);
  let m = { angle: 0, velocity: 0 };
  for (let i = 0; i < 30; i++) m = advance(s, m, 0.1);
  assert.equal(m.angle, -STOP);
  assert.equal(m.velocity, 0);
});
console.log(`Enumerated ${states.length} valid role-coordinate arrangements.`);

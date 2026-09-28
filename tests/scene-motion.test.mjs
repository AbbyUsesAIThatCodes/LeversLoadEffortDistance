import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { LeverScene } from "../src/scene.js";
import { DEFAULT, ROLES, STOP, advance, move, swapPositions } from "../src/model.js";

// Exercise the real scene state/gesture/frame methods without a GPU or DOM.
function sceneFor(state = swapPositions(DEFAULT)) {
  const scene = new LeverScene(null);
  scene.scene = new THREE.Scene();
  scene.controls = { enabled: true, update: () => false };
  scene.canvas = { style: {} };
  scene.draw = () => scene.apparatus.update(scene.state, scene.motion.angle);
  scene.project = (v) => ({ x: v.x * 10, y: -v.y * 10 });
  scene.callbacks.onChange = (next) => scene.setState(next);
  scene.setState(state);
  return scene;
}
function grab(scene, role) {
  assert.equal(scene.beginDrag({
    button: 0, isPrimary: true, pointerId: 1, clientX: 100, clientY: 100,
    currentTarget: {}, preventDefault() {}, stopImmediatePropagation() {},
  }, role), true);
}

test("grabbing and releasing every role preserves settled and in-flight motion", () => {
  for (const role of ROLES) {
    for (const initial of [{ angle: -STOP, velocity: 0 }, { angle: -0.08, velocity: -0.3 }]) {
      const scene = sceneFor();
      scene.motion = { ...initial };
      grab(scene, role);
      assert.deepEqual(scene.motion, initial, `${role}: pointer down preserves motion`);
      scene.frameTime = 0;
      scene.frame(16);
      const expected = advance(scene.state, initial, 0.016);
      assert.deepEqual(scene.motion, expected, `${role}: physics continues while grabbed`);
      scene.finishDrag();
      assert.deepEqual(scene.motion, expected, `${role}: pointer up preserves motion`);
      assert.equal(scene.controls.enabled, true);
    }
  }
});

test("state edits and cancellation keep motion and let new forces act on the next frame", () => {
  for (const role of ROLES) {
    const scene = sceneFor();
    const original = { ...scene.state };
    const initial = { angle: -0.08, velocity: -0.3 };
    scene.motion = { ...initial };
    grab(scene, role);
    scene.setState(move(scene.state, role, scene.state[role] + 25));
    assert.deepEqual(scene.motion, initial, `${role}: editing does not level or stop the beam`);
    assert.equal(scene.moving.rotation.z, initial.angle, "geometry retains tilt immediately");
    scene.frameTime = 0;
    scene.frame(16);
    const expected = advance(scene.state, initial, 0.016);
    assert.deepEqual(scene.motion, expected);
    scene.finishDrag(true);
    assert.deepEqual(scene.state, original, "cancel restores coordinates");
    assert.deepEqual(scene.motion, expected, "cancel does not rewind motion");
  }
});

test("Hold levels the beam; reduced motion reaches equilibrium and Help pauses preserve tilt", () => {
  const scene = sceneFor(DEFAULT);
  scene.motion = { angle: -STOP, velocity: 0 };
  scene.reduced = true;
  scene.frame(16);
  assert.equal(scene.motion.angle, 0, "reduced animation reaches the pointer equilibrium");
  scene.reduced = false;
  scene.setState(swapPositions(DEFAULT));
  scene.motion = { angle: -0.08, velocity: -0.3 };
  scene.paused = true;
  scene.frame(32);
  assert.deepEqual(scene.motion, { angle: -0.08, velocity: -0.3 }, "pause keeps angle and velocity");
  scene.paused = false;
  scene.setHeld(true);
  grab(scene, "load");
  scene.setState(move(scene.state, "load", 150));
  scene.frame(48);
  assert.deepEqual(scene.motion, { angle: 0, velocity: 0 }, "Hold stays level during editing");
  scene.finishDrag();
  scene.setHeld(false);
  scene.frame(64);
  assert.ok(scene.motion.angle < 0, "Release resumes the current configuration");
});

import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createApparatus, HEIGHT, SCALE, COLORS } from "../src/apparatus.js";
import { DEFAULT, STOP, GRAVITY, swapPositions, appliedTorque } from "../src/model.js";
const box = (o) => new THREE.Box3().setFromObject(o),
  point = (o) => o.getWorldPosition(new THREE.Vector3());
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≈ ${b}`);
const rotation = (o) => o.getWorldQuaternion(new THREE.Quaternion());

test("gold and teal retain their mesh identity, local dimensions, color, mass and picking through two swaps", () => {
  const a = createApparatus();
  a.update(DEFAULT, 0);
  const crate = a.weights.load.getObjectByName("gold-crate"),
    weight = a.weights.effort.getObjectByName("teal-weight");
  const size = a.weights.load.scale.clone();
  const geometry = crate.geometry;
  for (const state of [swapPositions(DEFAULT), swapPositions(swapPositions(DEFAULT))]) {
    a.update(state, STOP);
    assert.strictEqual(a.weights.load.getObjectByName("gold-crate"), crate);
    assert.strictEqual(a.weights.effort.getObjectByName("teal-weight"), weight);
    assert.strictEqual(crate.geometry, geometry);
    assert.deepEqual(a.weights.load.scale, size);
    assert.equal(crate.material.color.getHex(), COLORS.load);
    assert.equal(weight.material.color.getHex(), COLORS.effort);
    assert.ok(a.pickable.includes(crate));
    assert.equal(crate.userData.part, "load");
  }
});

test("seated crate contact, clearance and beam-axis point-load torque survive masses, extreme positions and both stops", () => {
  const a = createApparatus();
  assert.equal(a.moving.getObjectByName("load-tray"), undefined);
  assert.equal(a.moving.getObjectByName("tray-stem"), undefined);
  // Read the actual top rail rather than assuming its height in the assertions.
  const rail = a.beam.children[1];
  rail.geometry.computeBoundingBox();
  const railTop = rail.position.y + rail.geometry.boundingBox.max.y;
  const crate = a.weights.load.getObjectByName("gold-crate");
  crate.geometry.computeBoundingBox();
  let checked = 0;
  for (let mass = 25; mass <= 1000; mass += 25)
    for (const angle of [-STOP, -STOP / 2, 0, STOP / 2, STOP])
      for (const left of [-250, 100])
        for (const right of new Set([left + 150, 250]))
          for (const fulcrum of new Set([left + 75, right - 75]))
            for (const reverse of [false, true]) {
              let state = { load: left, effort: right, fulcrum, loadMass: mass, effortMass: 1000 };
              if (reverse) state = swapPositions(state);
              a.update(state, angle);
              checked++;
              let renderedPointTorque = 0;
              for (const role of ["load", "effort"]) {
                assert.ok(box(a.attachments[role]).min.y > 0, "attachments clear the desk");
                const anchor = point(a.attachments[role]);
                close(anchor.x, state.fulcrum / SCALE + ((state[role] - state.fulcrum) / SCALE) * Math.cos(angle));
                renderedPointTorque -= (anchor.x - state.fulcrum / SCALE) * state[`${role}Mass`] * GRAVITY * SCALE / 1e6;
                const w = box(a.weights[role]);
                for (const support of a.base.children)
                  assert.ok(!w.intersectsBox(box(support)), "weight clears fulcrum");
                const direction = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation(a.arrows[role]));
                close(direction.x, 0);
                close(direction.y, -1);
                close(direction.z, 0);
                close(point(a.arrows[role]).x, anchor.x);
                if (role === "effort") {
                  close(w.getCenter(new THREE.Vector3()).x, anchor.x);
                  close(rotation(a.weights.effort).angleTo(new THREE.Quaternion()), 0);
                  // Weight vertices remain below the beam even though the cord meets its axis.
                  const relative = new THREE.Matrix4().copy(a.beam.matrixWorld).invert().multiply(a.weights.effort.matrixWorld);
                  const effortBox = new THREE.Box3();
                  for (const mesh of a.weights.effort.children) {
                    mesh.geometry.computeBoundingBox();
                    effortBox.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix).applyMatrix4(relative));
                  }
                  assert.ok(effortBox.max.y < -railTop, "hanging weight clears beam");
                }
              }
              close(renderedPointTorque, appliedTorque(state, angle));
              close(rotation(a.weights.load).angleTo(rotation(a.beam)), 0);
              // The base's left and right edges lie on the tilted top-rail plane.
              const bottom = crate.geometry.boundingBox;
              for (const x of [bottom.min.x, bottom.max.x]) {
                const contact = a.beam.worldToLocal(crate.localToWorld(new THREE.Vector3(x, bottom.min.y, 0)));
                close(contact.y, railTop);
                assert.ok(Math.abs(contact.x) < rail.geometry.boundingBox.max.x, "whole crate stays within rail length");
              }
              // All decorative bands must remain above the rail too.
              for (const mesh of a.weights.load.children) {
                mesh.geometry.computeBoundingBox();
                const relative = new THREE.Matrix4().copy(a.beam.matrixWorld).invert().multiply(mesh.matrixWorld);
                const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(relative);
                assert.ok(bounds.min.y >= railTop - 1e-6, "crate and bands do not penetrate beam");
              }
              assert.ok(box(a.beam).min.y > 0, "beam clears desk");
            }
  console.log(`Checked ${checked} seated-load geometry combinations at pivot height ${HEIGHT}.`);
});

test("tilted rendered crate center differs from the ideal force point; torque intentionally uses the point", () => {
  const a = createApparatus();
  for (const angle of [-STOP, STOP]) {
    a.update(DEFAULT, angle);
    const center = point(a.weights.load.getObjectByName("gold-crate"));
    assert.ok(Math.abs(center.x - point(a.attachments.load).x) > 0.1);
    close(appliedTorque(DEFAULT, angle), 0);
  }
});

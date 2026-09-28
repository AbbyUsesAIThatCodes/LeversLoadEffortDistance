# Weighted Pointer Review

A balanced arrangement previously stayed at its existing tilt. A rigid weighted
pointer now supplies gravitational restoring torque, while edits preserve the
beam's angle, velocity, and held/released setting. No edit resets the beam.

## Apparatus and Behavior

- Brass rod and purple-faced bob rotate with the beam, in front of the support.
- Fixed bob: 250 g, with its center 125 mm below the current axle at level.
- A stationary alignment mark follows the support as the fulcrum moves.
- Exact load/effort equality settles level from either stop. The status reads
  **Settling…** until angle and angular speed are both below 0.1° and 0.1°/s.
- Unequal products always identify the stronger side, even while crossing level.
- A 625 g·mm difference (the smallest allowed) settles at approximately 1.146°.
  Greater differences can reach the existing ±12° stops.
- Reduced Animation uses the same equilibrium without animating the transition.
- WebGL and the SVG diagram share the physics and draw the pointer.

The classroom equation remains `load mass × load arm = effort mass × effort arm`.
The pointer exerts no torque at level. When tilted, its extra torque is explicitly
included in motion, but not in the panel's labeled **Torque at Level** values.
This remains an illustrative point-load model, not a complete rigid-body/contact
simulation. See [Model and Teaching Notes](MODEL-AND-TEACHING.md).

## Review Evidence

The current artifact's generated `BUILD_REPORT.md` and `build-manifest.json`
identify the source and build time. [Build Identity](BUILD_IDENTITY.md) lists all
identity surfaces. Focused checks are `tests/weighted-pointer.test.mjs` and
`tests/weighted-pointer-browser.mjs`; existing model, geometry, and gesture
checks remain applicable.

Verified September 28, 2026: all 15 Node checks passed. Chromium 153 with
software WebGL passed the focused laptop/projector checks and the existing
continuous-motion browser regression, including all three role drags,
cancellation, Help, Hold/Release, reduced animation, and WebGL-loss handoff.
The standard Playwright download was unavailable locally; an isolated browser
binary supplied the same test runner, without changing game dependencies.
GitHub Actions installs its own Playwright Chromium and repeats these checks.

| State | Review Screenshot |
| --- | --- |
| Reported Arrangement, Returning From Tilt | [Settling](screenshots/weighted-pointer/true-settling.png) |
| Same Arrangement, Settled Level | [Balanced](screenshots/weighted-pointer/true-balanced.png) |
| Smallest Allowed Difference | [Small Imbalance](screenshots/weighted-pointer/true-small-imbalance.png) |
| Diagram Parity | [Fallback](screenshots/weighted-pointer/fallback-balanced.png) |
| Projector View | [1920 × 1080](screenshots/weighted-pointer/projector.png) |

The [snapshot manifest](screenshots/weighted-pointer/build-manifest.json) and
[verification record](screenshots/weighted-pointer/verification.json) identify
this historical local review artifact. CI produces a new PR-scoped identity
and includes its own screenshots and verification in the downloadable artifact.
Classroom hardware and student playtesting remain for the owner's review.

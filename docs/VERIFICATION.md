# Core Verification

The September 27 report below records historical core verification. The
[Weighted Pointer Review](WEIGHTED-POINTER.md) supersedes its balanced-tilt
and reduced-animation behavior and records the current change's evidence.

Verified locally on September 27, 2026, with Node.js 24.19.0 and Chromium
153.0.8010.0 using software WebGL. The normal Playwright browser download failed
in this environment; the same Playwright test runner used an alternate locally
installed Chromium executable via `CHROMIUM_EXECUTABLE`. No additional runtime
or repository dependency was introduced for that workaround.

## Automated Checks

| Check                  | Result and Coverage                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | Eleven tests pass. Enumerates all 1,360 legal coordinate arrangements and exercises constrained moves, keyboard steps, distances, masses, swaps, restore, and finite motion.                                                                                                                                                  |
| Required example       | 200 g × 100 mm = 100 g × 200 mm; IMA 2. After swap: 40,000 vs. 10,000 g·mm; IMA 0.5; the Load side descends.                                                                                                                                                                                                                 |
| Off-center swap        | Exact coordinates exchange; fulcrum and masses remain fixed. Two swaps restore the full role-coordinate state.                                                                                                                                                                                                               |
| Actual mesh checks     | Persistent mesh identity and color; 1,600 distinct mass/position/tilt combinations; direct rail contact; crate rotates with beam; weights clear support and desk; vertical Effort and arrows; point-load torque agrees with rendered axis anchors.                                                                                                                              |
| `npm run build`        | Self-contained static build passes, with bundled JavaScript, local fonts, and retained licenses.                                                                                                                                                                                                                             |
| `npm run test:browser` | Passes under software WebGL. Live model/UI/SVG/save consistency, held and released swaps, continuous motion, load-side descent, numeric/slider/halve/double/keyboard/drag constraints, drag cancellation, actual fulcrum raycasting, presets, reset, tabs, tooltips, rounding/range explanations, persistence, and invalid saves. |
| Overlay/layout checks  | 1366×768, 1024×768, 390×844, 844×390; separate readable labels including four-digit masses; stable full-window canvas and projected coordinates when panels toggle; orbit/rear view and both extreme tilt directions.                                                                                                        |
| Degraded access        | WebGL context loss and startup without WebGL or localStorage. Diagram, math, mass/fulcrum inputs, reset, presets, swap, and release remain usable.                                                                                                                                                                           |
| Runtime isolation      | No uncaught page errors and no external runtime asset requests in the browser checks; root and repository-prefix hosting both work.                                                                                                                                                                                          |

## Issue #13: Continuous Beam Motion

The scene regressions reproduced the original resets before the fix. They now
check all three roles at rest and in motion, state edits, cancellation, continued
physics during grabs, held edits, and Help pauses. The normal `npm test` command
runs these checks, including in the PR workflow.

The browser suite includes a controlled-clock desktop check for both object
arrangements: grabbing/releasing each label preserves tilt and status; moving
Load, Effort, or Fulcrum reverses the beam while still dragging; Escape,
pointer cancellation, and blur restore coordinates without leveling. It also
checks the no-WebGL diagram, slider edits, balanced tilt, Help, Reduced Animation,
Hold/Release, Reset, and motion preservation on WebGL loss. Clock control catches
an immediate level reset even if a subsequent frame would hide it.

Reduced Animation intentionally skips the animated transition; the weighted
pointer revision targets the constrained equilibrium angle, including level.
The tests use Chromium software WebGL, not classroom hardware.

## Visual Review

Issue #9 adds [Compact Menus and Tooltip Review](TOOLTIPS.md), with current
laptop/projector comparisons, a 1024×768 touch viewport, keyboard/touch tooltip
examples, and the diagram fallback. The shared tooltip browser checks cover
focus, hover, pinning, dismissal, persistent accessible descriptions, scrolling,
and help interactions that leave the apparatus unchanged.

Reviewed desktop and phone screenshots, short landscape, controls, rear view,
required swap/release, no-WebGL diagram, and extreme arrangements at both tilt
stops. Review found and corrected clipped phone label text and a raised load
hidden by a label; the viewport-based fit now reserves more vertical clearance.
The fallback instruction line also stays above the math panel.

Historical screenshots below show the original core apparatus. For the current
seated crate, see the before/after comparisons and additional geometry/browser
checks in [Load Contact Review](LOAD-CONTACT.md).

Original core screenshots:

- [Balanced Default](screenshots/balanced.png)
- [Swapped and Released](screenshots/swapped-released.png)
- [Phone Layout](screenshots/phone.png)
- [Extreme Raised Load](screenshots/extreme-raised-load.png)

## Remaining Limits

- Browser checks used Chromium with software rendering. Native classroom
  hardware, touch gestures, screen readers, and Firefox/Safari need the
  classroom release verification in Issue #3.
- Small screens use scrollable control and math panels. Deliberately orbiting
  into an end-on view can obscure physical geometry; Side View/Fit View and
  numeric controls remain available. This is not an occlusion-free camera.
- Dynamics are an ideal teaching illustration, not calibrated timing or a
  contact/pendulum simulation. See [Model and Teaching Notes](MODEL-AND-TEACHING.md).
- Nothing was deployed. Classroom release preparation is Issue #3; environment
  integration is Issue #4. Source games were neither edited nor deployed.

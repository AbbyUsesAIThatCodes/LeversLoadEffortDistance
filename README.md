# Levers: Load, Effort, and Distance

An independent classroom lever game: a **gold Load** sits on and tilts with the beam,
and a **teal Effort** hangs below the beam. Change either mass, change either arm,
move the purple fulcrum, predict the result, and release the beam.

Version **0.1.0** implements the integrated core in
[Issue #2](https://github.com/AbbyUsesAIThatCodes/LeversLoadEffortDistance/issues/2).
It still needs the classroom readiness work in
[Issue #3](https://github.com/AbbyUsesAIThatCodes/LeversLoadEffortDistance/issues/3).
See the [Roadmap](docs/ROADMAP.md). Review builds identify the existing
**Integrated Core** milestone with a full build ID beneath the game title.
See [Build Identity](docs/BUILD_IDENTITY.md) for the release record and inventory.

## Explore

- **Controls** opens number boxes, sliders, and halve/double buttons for each
  object's mass and arm length. The gold **Load** panel starts left, the teal
  **Effort** panel starts right, and both follow their objects when swapped.
  The fulcrum has one shared strip. Camera orbit never exchanges the panels.
  Phone and portrait-tablet layouts use a scrollable bottom dock; closing it
  restores the previous math visibility. **Show Math** switches back directly.
  Escape or **Hide Controls** closes all controls and returns focus to the
  toggle. See the [Control Layout Review](docs/CONTROL-LAYOUT.md).
- Drag an object, the fulcrum, or a floating role label. The fulcrum always stays
  between the objects. Tab to a label and use left/right arrows to move across
  the screen; up/down changes that object's mass.
- **Swap Positions** exchanges the objects' exact coordinates, keeping each
  object's mass, mesh, color, role, and label. The fulcrum stays fixed. The arm
  lengths exchange. Swap twice to return to the original arrangement.
- **Hold Level** and **Hide Math** support predictions. Release tests the current
  turning effects. A held arrangement stays held after swapping; a released
  arrangement responds from its current tilt and motion, including while
  dragging. Grabbing or releasing alone does not level the beam. The weighted
  **Balance Pointer** returns matching turning effects smoothly to level. The
  status shows **Settling…** until it is level and nearly stationary. Small
  imbalances settle at a visible tilt; larger ones reach a travel stop.
  See [Weighted Pointer Review](docs/WEIGHTED-POINTER.md).
- **Balance & Advantage** compares mass × distance, IMA, and required effort mass.
  **Grams → Newtons** expands SI conversions. Hover or focus dotted terms and
  **?** buttons for explanations. Click/tap to keep help open; repeat, press
  Escape, or tap elsewhere to dismiss. **Help** still opens the complete guide.
  The actual force ratio equals IMA only at ideal balance. See the
  [Compact Menus and Tooltip Review](docs/TOOLTIPS.md).
- Orbit/zoom freely, or use **Side View** and **Fit View**. Panels are overlays;
  opening them never resizes the full-window 3D viewport or resets your camera.
  Presets fit the current arrangement through its full travel, with space for
  labels and overlays. See the [Camera Framing Review](docs/CAMERA-FRAMING.md).
- If WebGL is unavailable or lost, the diagram, math, presets, swap, hold/release,
  and numeric controls still work. Storage failure does not prevent use.

## Run Locally

Use Node.js 22 or later:

```sh
npm ci
npm run build
npm run dev
```

Open <http://localhost:4173/LeversLoadEffortDistance/> or
<http://localhost:4173/>. Serve `dist/` over HTTP, not `file://`. Each build also creates an immutable
`artifacts/builds/<full-ID>/` folder containing `build-manifest.json` and
`BUILD_REPORT.md`; `artifacts/current-build.json` identifies the latest local
review build. Run `node scripts/verify-build.mjs` to check identity consistency.

```sh
npm test
npx playwright install chromium
npm run test:browser
node tests/weighted-pointer-browser.mjs
```

For headless Linux, `BROWSER_SOFTWARE_GL=1` enables software WebGL and
`CHROMIUM_EXECUTABLE` can point to an existing compatible Chromium.
`PORT` overrides the server port (4173 for development, 4178 in the browser check).
Screenshots from browser checks go to ignored `artifacts/`.

## Bounds and Assumptions

| Quantity                | Permitted Values                                                               |
| ----------------------- | ------------------------------------------------------------------------------ |
| Load and Effort masses  | 25–1,000 g, in 25 g steps                                                      |
| Object beam coordinates | −250 to +250 mm, in 25 mm steps                                                |
| Minimum arm length      | 75 mm                                                                          |
| Fulcrum coordinate      | Between the objects, at least 75 mm from each; global extremes ±175 mm         |
| Arm lengths             | Derived from coordinates; 75–425 mm, depending on the current fulcrum and side |
| Beam motion             | ±12°, with illustrative damping                                                |

The support and bounds keep the maximum masses above the work surface at both
stops. The crate rests directly on the rail and tilts with it; the Effort and
both downward force arrows stay vertical. The crate represents a point load at
its labeled beam-axis coordinate, not a full rigid-body center-of-mass model.
The modeled masses are the labeled Load and Effort plus a fixed 250 g pointer
bob 125 mm below the axle when level. The beam, pointer rod, and other attachments
are ideal and massless; the pivot is ideal. The pointer contributes no torque
at level, so the classroom mass × distance equality is unchanged. Read
[Model and Teaching Notes](docs/MODEL-AND-TEACHING.md) for support assumptions,
force application points, torque, and motion limitations.
See the [Load Contact Review](docs/LOAD-CONTACT.md) for Issue #8 comparisons.

## Independent Identity and Review

This game adapts [ThreeKindsOfLevers](https://github.com/AbbyUsesAIThatCodes/ThreeKindsOfLevers)
and [MechanicalAdvantage](https://github.com/AbbyUsesAIThatCodes/MechanicalAdvantage).
Exact source commits and adapted components are recorded in
[Provenance](docs/PROVENANCE.md), with licenses in
[Third-Party Notices](THIRD_PARTY_NOTICES.md).

Changes are delivered as PRs for review before merging. After the Pages workflow
is merged, changes to `main` run the model checks, build the game, and publish
`dist/` through GitHub Actions. PR builds never deploy. Follow the
[GitHub Pages Setup Guide](docs/DEPLOYMENT.md) for the initial settings and run.
Neither source game is modified or deployed by this workflow. Classroom release
verification remains in Issue #3; classroom virtualization belongs to Issue #4.

All scripts, fonts, and visuals are bundled locally. No accounts, tracking,
student data, or runtime CDN requests are used. This app saves its arrangement,
hold setting, math visibility, and reduced-animation preference only under
`levers-load-effort-distance-v1`. It does not read or overwrite the source games'
saved state. Invalid saves revert to the safe default.

import { LeverScene } from "./scene.js";
import {
  ROLES,
  OBJECTS,
  DEFAULT,
  PRESETS,
  STORAGE_KEY,
  arm,
  massKey,
  move,
  step,
  setMass,
  setDistance,
  distanceBounds,
  positionBounds,
  swapPositions,
  measures,
  valid,
  restore,
  restingAngle,
  advance,
  POINTER,
  balanceStatus,
} from "./model.js";
import { fmt, helpTip, setTip, describeTooltips, renderMath, installTooltips } from "./math.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  cap = (s) => s[0].toUpperCase() + s.slice(1);
const colors = { load: "#89500b", effort: "#176b61", fulcrum: "#714896" };
const compactViewport = matchMedia(
  "(max-width: 900px) and (min-height: 501px), (max-width: 700px)",
);
let saved;
try {
  saved = localStorage.getItem(STORAGE_KEY);
} catch {}
let { state, held, showMath, reduced } = restore(saved);
reduced ||= matchMedia("(prefers-reduced-motion: reduce)").matches;
let scene = null,
  ready = false,
  fallback = false,
  selected = "load",
  fallbackMotion = { angle: 0, velocity: 0 },
  fallbackTime = null;
function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state, held, showMath, reduced }),
    );
  } catch {}
}
function notice(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
for (const role of OBJECTS) {
  const name = cap(role);
  $(`#panel-${role}`).innerHTML =
    `<div class="role-heading"><h2 id="heading-${role}">${name}</h2>${helpTip(role, name)}</div>
    <div class="quantity-heading"><label for="mass-${role}">Mass (g)</label>${helpTip("g", `${name} Mass Units`)}</div>
    <div class="quantity-row"><input id="mass-${role}" type="number" min="25" max="1000" step="25" aria-label="${name} Mass in Grams"><div class="quick-actions"><button data-scale="${role},mass,0.5" aria-label="Halve ${name} Mass">÷ 2</button><button data-scale="${role},mass,2" aria-label="Double ${name} Mass">× 2</button></div></div>
    <input id="mass-slider-${role}" type="range" min="25" max="1000" step="25" aria-label="${name} Mass">
    <div class="quantity-heading"><label for="distance-${role}">Distance From Fulcrum (mm)</label>${helpTip("arm", `${name} Arm Length`)}</div>
    <div class="quantity-row"><input id="distance-${role}" type="number" step="25" aria-label="${name} Arm in Millimeters"><div class="quick-actions"><button data-scale="${role},distance,0.5" aria-label="Halve ${name} Arm">÷ 2</button><button data-scale="${role},distance,2" aria-label="Double ${name} Arm">× 2</button></div></div>
    <input id="distance-slider-${role}" type="range" step="25" aria-label="${name} Arm">
    <p class="force-reading"><span id="force-${role}"></span> ${helpTip("motion", `${name} Force and Motion`)}</p>`;
}
// Help is separate from input labels and drag targets, so opening it cannot
// activate a neighboring control or begin an apparatus drag.
for (const [id, key] of [["model-help", "model"], ["workbench-help", "controls"], ["forces-help", "motion"], ["fulcrum-help", "coordinate"]]) setTip($("#" + id), key);
function orderControls() {
  // Beam coordinates, never the camera or swap count, own the panel order.
  // Move the existing nodes so keyboard order follows the visible arrangement.
  const container = $("#object-controls");
  const first = $(`#panel-${state.load < state.effort ? "load" : "effort"}`);
  if (container.firstElementChild !== first) {
    const focused = document.activeElement;
    container.prepend(first);
    if (container.contains(focused)) focused.focus({ preventScroll: true });
  }
}
for (const role of ROLES) {
  const tag = document.createElement("button");
  tag.className = `part-tag ${role}`;
  tag.dataset.tag = role;
  tag.dataset.select = role;
  tag.setAttribute("aria-label", `Select or Drag ${cap(role)}`);
  $("#tags").append(tag);
  tag.addEventListener("click", () => select(role));
  tag.addEventListener("pointerdown", (e) => {
    if (ready) scene.beginDrag(e, role);
  });
  tag.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      keyboardStep(role, e.key);
    }
  });
}
function select(role) {
  selected = role;
  if (ready) scene.select(role);
  renderSelection();
}
function renderSelection() {
  for (const role of ROLES)
    $(`[data-tag="${role}"]`).setAttribute(
      "aria-pressed",
      String(selected === role),
    );
}
function setState(next) {
  if (!valid(next)) return;
  state = { ...next };
  if (ready) scene.setState(state);
  render();
  save();
}
function keyboardStep(role, key) {
  select(role);
  if (key === "ArrowLeft" || key === "ArrowRight")
    setState(
      step(
        state,
        role,
        (key === "ArrowRight" ? 1 : -1) * (ready ? scene.screenSign() : 1),
      ),
    );
  else if (role !== "fulcrum")
    setState(
      setMass(
        state,
        role,
        state[massKey(role)] + (key === "ArrowUp" ? 25 : -25),
      ),
    );
}
function render() {
  orderControls();
  $("#preset").value =
    Object.entries(PRESETS).find(([, s]) =>
      Object.keys(DEFAULT).every((k) => s[k] === state[k]),
    )?.[0] || "custom";
  for (const role of OBJECTS) {
    const [min, max] = distanceBounds(state, role);
    for (const prefix of ["mass", "mass-slider"]) {
      const input = $(`#${prefix}-${role}`);
      input.value = state[massKey(role)];
      input.setAttribute("aria-valuetext", `${state[massKey(role)]} grams`);
    }
    for (const prefix of ["distance", "distance-slider"]) {
      const input = $(`#${prefix}-${role}`);
      input.min = min;
      input.max = max;
      input.value = arm(state, role);
      input.setAttribute(
        "aria-valuetext",
        `${arm(state, role)} millimeters from the fulcrum`,
      );
    }
    $(`#force-${role}`).textContent =
      `Downward force: ${fmt(measures(state)[role + "Force"])} N`;
    $(`[data-tag="${role}"]`).innerHTML =
      `<span class="tag-title">${cap(role)} <span class="tag-mass">· ${state[massKey(role)]} g</span></span><small>${arm(state, role)} mm from fulcrum</small>`;
  }
  const [min, max] = positionBounds(state, "fulcrum");
  for (const id of ["fulcrum-position", "fulcrum-slider"]) {
    const input = $("#" + id);
    input.min = min;
    input.max = max;
    input.value = state.fulcrum;
    input.setAttribute(
      "aria-valuetext",
      `${state.fulcrum} millimeters on the beam`,
    );
  }
  $('[data-tag="fulcrum"]').innerHTML =
    `Fulcrum<small>${state.fulcrum} mm on beam</small>`;
  $("#coordinates").textContent =
    `Beam coordinates: Load ${state.load} mm · Fulcrum ${state.fulcrum} mm · Effort ${state.effort} mm.`;
  $("#hold").textContent = held ? "Release" : "Hold Level";
  $("#hold").setAttribute("aria-pressed", String(held));
  syncPanelVisibility();
  $("#app").dataset.held = String(held);
  for (const role of ROLES)
    $(`[data-tag="${role}"]`).dataset.coordinate = state[role];
  hideTip?.();
  renderMath(state);
  describeTooltips();
  renderSelection();
  updateStatus();
  if (fallback) drawFallback();
  if (ready) scene.dirty = true;
}
function updateStatus(isHeld = held, motion = ready ? scene.motion : fallbackMotion) {
  const status = balanceStatus(state, motion, isHeld);
  if ($("#beam-status").textContent !== status)
    $("#beam-status").textContent = status;
  $("#beam-status").classList.toggle(
    "balanced",
    status === "Balanced",
  );
}
// Reserve the overlays even while hidden: toggling them must never reframe
// a student's camera. Read their real CSS dimensions rather than duplicating
// responsive breakpoints and card sizes in the scene.
function viewBounds() {
  const app = $("#app"), controls = $("#controls-panel"), math = $("#math-panel");
  const controlsHidden = controls.hidden, mathHidden = math.hidden;
  const controlsOpen = app.classList.contains("controls-open");
  const mathHeight = app.style.getPropertyValue("--math-height");
  const toolbarBottom = app.style.getPropertyValue("--toolbar-bottom");
  try {
    controls.hidden = math.hidden = false;
    app.classList.remove("controls-open");
    const mathRect = math.getBoundingClientRect();
    app.style.setProperty("--math-height", `${mathRect.height}px`);
    const compact = compactViewport.matches;
    const toolbar = $("#top").getBoundingClientRect();
    app.style.setProperty("--toolbar-bottom", `${toolbar.bottom}px`);
    const shared = $("#panel-fulcrum").getBoundingClientRect();
    const cards = [...$("#object-controls").children].map((e) => e.getBoundingClientRect());
    const top = Math.max(toolbar.bottom, !compact && innerHeight > 500 ? shared.bottom : 0);
    const bottom = Math.min(mathRect.top,
      compact ? controls.getBoundingClientRect().top : innerHeight <= 500 ? shared.top : innerHeight);
    const labelHeight = Math.max(...$$(".part-tag").map((e) => e.getBoundingClientRect().height));
    return {
      left: compact ? 14 : cards[0].right + 14,
      right: compact ? innerWidth - 14 : cards[1].left - 14,
      top: top + labelHeight + 18,
      bottom: bottom - 14,
    };
  } finally {
    controls.hidden = controlsHidden;
    math.hidden = mathHidden;
    app.classList.toggle("controls-open", controlsOpen);
    if (mathHeight) app.style.setProperty("--math-height", mathHeight);
    else app.style.removeProperty("--math-height");
    if (toolbarBottom) app.style.setProperty("--toolbar-bottom", toolbarBottom);
    else app.style.removeProperty("--toolbar-bottom");
  }
}

function onFrame({ positions, angle, velocity, held: isHeld }) {
  updateStatus(isHeld, { angle, velocity });
  $("#app").dataset.angle = angle;
  if (!positions.load) return;
  const compactControls = !$("#controls-panel").hidden && compactViewport.matches;
  const sharedControlsAbove =
    !$("#controls-panel").hidden && !compactControls && innerHeight > 500;
  const top = Math.max(
    $("#top").getBoundingClientRect().bottom,
    sharedControlsAbove ? $("#panel-fulcrum").getBoundingClientRect().bottom : 0,
  );
  const bottom = compactControls
    ? $("#controls-panel").getBoundingClientRect().top
    : showMath
      ? $("#math-panel").getBoundingClientRect().top
      : innerHeight - 12;
  const parts = [...ROLES].sort((a, b) => positions[a].x - positions[b].x);
  const tags = parts.map((p) => $(`[data-tag="${p}"]`));
  const widths = tags.map((t) => t.getBoundingClientRect().width),
    heights = tags.map((t) => t.getBoundingClientRect().height);
  const sideControls = !$("#controls-panel").hidden && !compactControls;
  const left = sideControls
    ? $("#object-controls").firstElementChild.getBoundingClientRect().right + 8
    : 10;
  const right = sideControls
    ? $("#object-controls").lastElementChild.getBoundingClientRect().left - 8
    : innerWidth - 10;
  const xs = parts.map((p, i) =>
    Math.max(
      left + widths[i] / 2,
      Math.min(right - widths[i] / 2, positions[p].x),
    ),
  );
  for (let i = 1; i < 3; i++)
    xs[i] = Math.max(xs[i], xs[i - 1] + (widths[i - 1] + widths[i]) / 2 + 8);
  if (xs[2] + widths[2] / 2 > right) {
    xs[2] = right - widths[2] / 2;
    for (let i = 1; i >= 0; i--)
      xs[i] = Math.min(xs[i], xs[i + 1] - (widths[i] + widths[i + 1]) / 2 - 8);
  }
  const maxHeight = Math.max(...heights);
  const y = Math.max(
    top + maxHeight + 8,
    Math.min(
      bottom - 12,
      Math.min(...ROLES.map((p) => positions[p + "top"] ?? positions[p].y)) -
        25,
    ),
  );
  $("#leaders").innerHTML = parts
    .map((role, i) => {
      const point = positions[role];
      tags[i].style.left = `${xs[i]}px`;
      tags[i].style.top = `${y}px`;
      return `<path d="M${xs[i]} ${y + 2}L${point.x} ${point.y}" stroke="${colors[role]}" stroke-width="1.5" fill="none" opacity=".7"/><circle data-point="${role}" cx="${point.x}" cy="${point.y}" r="4" fill="${colors[role]}" stroke="#fffcef"/>`;
    })
    .join("");
}
function drawFallback() {
  const angle = fallbackMotion.angle,
    scale = 0.96,
    px = 400 + state.fulcrum * scale;
  const point = (x) => ({
    x: px + (x - state.fulcrum) * Math.cos(angle) * scale,
    y: 195 - (x - state.fulcrum) * Math.sin(angle) * scale,
  });
  const ends = [point(-317.5), point(317.5)];
  const pointerLength = POINTER.length * scale;
  const pointerX = px + pointerLength * Math.sin(angle);
  const pointerY = 195 + pointerLength * Math.cos(angle);
  $("#fallback-svg").innerHTML =
    `<defs>${OBJECTS.map((p) => `<marker id="arrow-${p}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0L7,3L0,6Z" fill="${colors[p]}"/></marker>`).join("")}</defs><path d="M${px - 18} 360L${px} 195L${px + 18} 360Z" fill="${colors.fulcrum}"/><path data-beam d="M${ends[0].x} ${ends[0].y}L${ends[1].x} ${ends[1].y}" stroke="#839a94" stroke-width="12"/>${OBJECTS.map(
      (role) => {
        const p = point(state[role]),
          size = Math.cbrt(state[massKey(role)] / 100),
          gold = role === "load";
        // SVG y points down: rotate only the crate by -angle. Its bottom sits
        // on the beam stroke's top edge, six units from the beam axis.
        const body = gold
          ? `<g data-body="load" transform="translate(${p.x} ${p.y}) rotate(${-angle * 180 / Math.PI})"><rect data-crate x="${-size * 10}" y="${-6 - size * 18}" width="${size * 20}" height="${size * 18}" fill="#bf8630"/><path d="M${-size * 10} ${-6 - size * 14}h${size * 20}M${-size * 10} ${-6 - size * 4}h${size * 20}" stroke="#e9ba61" stroke-width="2"/></g>`
          : `<g data-body="effort"><path d="M${p.x} ${p.y}v32" stroke="#927449" stroke-width="4"/><rect x="${p.x - size * 12}" y="${p.y + 32}" width="${size * 24}" height="${size * 16}" rx="6" fill="#257e73"/></g>`;
        return `<g data-object="${role}" data-coordinate="${state[role]}">${body}<circle data-application-point="${role}" cx="${p.x}" cy="${p.y}" r="3" fill="${colors[role]}"/><path data-force="${role}" d="M${p.x + 34} ${p.y - 38}v30" stroke="${colors[role]}" stroke-width="3" marker-end="url(#arrow-${role})"/><text x="${p.x}" y="${p.y - 80}" text-anchor="middle" fill="${colors[role]}" font-size="21" font-weight="bold">${cap(role)} · ${state[massKey(role)]} g</text><text x="${p.x}" y="${p.y - 59}" text-anchor="middle" fill="${colors[role]}" font-size="18">${arm(state, role)} mm</text></g>`;
      },
    ).join(
      "",
    )}<g data-balance-pointer role="img" aria-label="Weighted balance pointer"><path d="M${px} 195L${pointerX} ${pointerY}" stroke="#b68d46" stroke-width="5"/><circle data-pointer-bob cx="${pointerX}" cy="${pointerY}" r="13" fill="#b68d46"/><circle cx="${pointerX}" cy="${pointerY}" r="8" fill="${colors.fulcrum}"/><path data-pointer-zero d="M${px} ${195 + pointerLength + 18}v15" stroke="#b68d46" stroke-width="3"/></g><text x="${px}" y="386" text-anchor="middle" font-size="21" fill="${colors.fulcrum}">Fulcrum · ${state.fulcrum} mm</text>`;
  $("#app").dataset.angle = angle;
  updateStatus();
}
function fallbackFrame(time) {
  if (!fallback) return;
  const dt = fallbackTime === null ? 0 : (time - fallbackTime) / 1000;
  fallbackTime = time;
  const old = fallbackMotion.angle;
  if (held) fallbackMotion = { angle: 0, velocity: 0 };
  else if (!$("dialog[open]")) {
    if (reduced)
      fallbackMotion = { angle: restingAngle(state, fallbackMotion.angle), velocity: 0 };
    else fallbackMotion = advance(state, fallbackMotion, dt);
  }
  if (old !== fallbackMotion.angle) drawFallback();
  requestAnimationFrame(fallbackFrame);
}
function holdScene() {
  if (ready) {
    scene.setHeld(held);
    scene.paused = !!$("dialog[open]");
  }
  if (held) fallbackMotion = { angle: 0, velocity: 0 };
  if (fallback) drawFallback();
}
function syncPanelVisibility() {
  const visible =
    showMath && !(!$("#controls-panel").hidden && compactViewport.matches);
  $("#math-panel").hidden = !visible;
  $("#math-toggle").textContent = visible ? "Hide Math" : "Show Math";
  $("#math-toggle").setAttribute("aria-expanded", String(visible));
}
compactViewport.addEventListener("change", () => {
  syncPanelVisibility();
  if (ready) scene.dirty = true;
});
function showControls(show) {
  $("#controls-panel").hidden = !show;
  $("#app").classList.toggle("controls-open", show);
  $("#controls-toggle").setAttribute("aria-expanded", String(show));
  $("#controls-toggle").textContent = show ? "Hide Controls" : "Controls";
  syncPanelVisibility();
  hideTip();
  if (show) {
    for (const panel of $$("#object-controls, .control-card")) panel.scrollTop = 0;
    $("#object-controls input").focus({ preventScroll: true });
  } else $("#controls-toggle").focus({ preventScroll: true });
  if (ready) scene.dirty = true;
}
for (const role of OBJECTS)
  for (const kind of ["mass", "distance"])
    for (const slider of [false, true]) {
      const input = $(`#${kind}${slider ? "-slider" : ""}-${role}`);
      input.addEventListener(slider ? "input" : "change", () => {
        if (input.value === "" || !Number.isFinite(Number(input.value))) {
          notice("Enter a number; the previous value is kept.");
          render();
          return;
        }
        const wanted = Number(input.value),
          next =
            kind === "mass"
              ? setMass(state, role, wanted)
              : setDistance(state, role, wanted);
        const actual = kind === "mass" ? next[massKey(role)] : arm(next, role);
        if (actual !== wanted)
          notice(
            `Adjusted to ${actual} ${kind === "mass" ? "g" : "mm"} within the available 25-unit steps and safe range.`,
          );
        setState(next);
      });
    }
for (const id of ["fulcrum-position", "fulcrum-slider"])
  $("#" + id).addEventListener(
    id.endsWith("slider") ? "input" : "change",
    () => {
      const wanted = $("#" + id).value,
        next = move(state, "fulcrum", wanted);
      if (wanted === "" || Number(wanted) !== next.fulcrum)
        notice(
          "The fulcrum snaps to 25 mm steps and stays at least 75 mm from each object.",
        );
      setState(next);
    },
  );
for (const b of $$("[data-scale]"))
  b.addEventListener("click", () => {
    const [role, kind, factor] = b.dataset.scale.split(","),
      wanted =
        (kind === "mass" ? state[massKey(role)] : arm(state, role)) *
        Number(factor);
    const next =
        kind === "mass"
          ? setMass(state, role, wanted)
          : setDistance(state, role, wanted),
      actual = kind === "mass" ? next[massKey(role)] : arm(next, role);
    if (actual !== wanted)
      notice(
        `The result snaps to ${actual} ${kind === "mass" ? "g" : "mm"} within the available steps and range.`,
      );
    setState(next);
  });
$("#swap").addEventListener("click", () => {
  scene?.finishDrag();
  setState(swapPositions(state));
  $("#announcement").textContent =
    `Positions and control panels exchanged. ${state.load < state.effort ? "Load controls left; Effort controls right" : "Effort controls left; Load controls right"}. Load keeps ${state.loadMass} grams; Effort keeps ${state.effortMass} grams.`;
});
$("#hold").addEventListener("click", () => {
  held = !held;
  holdScene();
  render();
  save();
});
$("#math-toggle").addEventListener("click", () => {
  if (compactViewport.matches && !$("#controls-panel").hidden) {
    showControls(false);
    $("#math-toggle").focus();
    showMath = true;
  } else showMath = !showMath;
  render();
  save();
});
function switchTab(name) {
  hideTip();
  for (const tab of ["balance", "force"]) {
    const active = tab === name,
      b = $("#tab-" + tab);
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
    $("#" + tab + "-math").hidden = !active;
  }
  if (ready) scene.dirty = true;
}
for (const name of ["balance", "force"]) {
  $("#tab-" + name).addEventListener("click", () => switchTab(name));
  $("#tab-" + name).addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const other = name === "balance" ? "force" : "balance";
      switchTab(other);
      $("#tab-" + other).focus();
    }
  });
}
$("#preset").addEventListener("change", () => {
  if (PRESETS[$("#preset").value]) setState(PRESETS[$("#preset").value]);
});
$("#reset").addEventListener("click", () => {
  held = true;
  holdScene();
  setState(DEFAULT);
  select("load");
  if (ready) scene.resetCamera();
});
$("#controls-toggle").addEventListener("click", () =>
  showControls($("#controls-panel").hidden),
);
$("#close-controls").addEventListener("click", () => {
  showControls(false);
});
for (const [id, method] of [
  ["side", "sideCamera"],
  ["fit", "resetCamera"],
  ["orbit", "turn"],
])
  $("#" + id).addEventListener("click", () => {
    if (ready) scene[method]();
  });
$("#help").addEventListener("click", () => {
  hideTip();
  $("#help-dialog").showModal();
  holdScene();
});
for (const b of $$(".dialog-close"))
  b.addEventListener("click", () => $("#help-dialog").close());
$("#help-dialog").addEventListener("close", holdScene);
$("#reduced").checked = reduced;
$("#reduced").addEventListener("change", () => {
  reduced = $("#reduced").checked;
  if (ready) scene.reduced = reduced;
  save();
});
$("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    notice("Full screen is unavailable in this browser.");
  }
});
if (!document.fullscreenEnabled) $("#fullscreen").hidden = true;
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    !$("#controls-panel").hidden &&
    !$("dialog[open]") &&
    $("#tooltip").hidden
  ) {
    showControls(false);
  }
});
new ResizeObserver(() => {
  $("#app").style.setProperty(
    "--toolbar-bottom",
    `${$("#top").getBoundingClientRect().bottom}px`,
  );
  if (ready) scene.dirty = true;
}).observe($("#top"));
new ResizeObserver(() => {
  $("#app").style.setProperty(
    "--math-height",
    `${$("#math-panel").getBoundingClientRect().height}px`,
  );
  if (ready) scene.dirty = true;
}).observe($("#math-panel"));
const hideTip = installTooltips();
function unavailable() {
  if (fallback) return;
  ready = false;
  fallback = true;
  if (scene) {
    scene.active = false;
    fallbackMotion = { ...scene.motion };
  }
  $("#scene").hidden = true;
  $("#tags").hidden = true;
  $("#leaders").hidden = true;
  $("#fallback").hidden = false;
  $$(".camera-controls button").forEach((b) => (b.disabled = true));
  $("#app").dataset.ready = "fallback";
  drawFallback();
  requestAnimationFrame(fallbackFrame);
}
render();
try {
  scene = new LeverScene($("#scene"), {
    onChange: setState,
    onSelect: (role) => {
      selected = role;
      renderSelection();
    },
    onFrame,
    viewBounds,
    onNotice: notice,
    onUnavailable: unavailable,
    onStep: keyboardStep,
  });
  await scene.init();
  ready = true;
  scene.reduced = reduced;
  scene.setHeld(held);
  scene.setState(state);
  scene.select(selected);
  await document.fonts.ready;
  scene.resetCamera();
  $("#app").dataset.ready = "true";
} catch (error) {
  console.warn("3D unavailable; using diagram.", error.message);
  unavailable();
}

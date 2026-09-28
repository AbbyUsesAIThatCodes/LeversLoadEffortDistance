import { measures, massKey, GRAVITY } from "./model.js";
const $ = (s) => document.querySelector(s);
export const fmt = (n, d = 4) =>
  Number(n.toFixed(d)).toLocaleString("en-US", { maximumFractionDigits: d });
const tips = {
  g: "g means gram: a unit of mass. Mass tells how much matter an object has. 1,000 g = 1 kg.",
  kg: "kg means kilogram: 1 kilogram is 1,000 grams.",
  mm: "mm means millimeter: a small unit of length. 10 mm = 1 cm; 1,000 mm = 1 m.",
  m: "m means meter: 1 meter is 1,000 millimeters.",
  N: "N means newton: a unit of force. Here it measures the downward pull of gravity on the mass.",
  "N/kg":
    "N/kg means newtons per kilogram. Near Earth, gravity pulls with about 9.81 N on each kilogram.",
  "N·m":
    "N·m means newton-meter: force multiplied by its perpendicular distance from the fulcrum. It measures turning effect (torque).",
  "g·mm":
    "g·mm means gram-millimeter: mass multiplied by distance. Compare the two sides using this shortcut; both masses feel the same gravity.",
  times:
    "Multiply: combine a force or mass with its distance. Twice either value gives twice the turning effect.",
  divide:
    "Divide: find how many times the bottom value fits into the top value.",
  equals: "Equals: both sides have the same value.",
  approx:
    "Approximately equal: this displayed number is rounded. The model calculates using the full value.",
  ima: "Ideal mechanical advantage (IMA) is effort-arm distance divided by load-arm distance. It describes the advantage provided by the lever’s shape.",
  effort:
    "Effort is the input force used to balance or move the load. In this lab one hanging weight supplies that force.",
  load: "Load is the force you want the lever to balance or move. The gold crate rests on the beam and tilts with it. This ideal model applies its downward force at the labeled beam-axis point; it does not simulate the crate’s full center of mass.",
  fulcrum:
    "The fulcrum is the movable pivot. Measure each arm along the beam from its center to the labeled force point.",
  balance:
    "The load and effort have equal turning effects at level. The weighted pointer gently brings a tilted beam back to level. Settling means the beam is still moving toward balance.",
  arm: "Measure along the beam from the fulcrum’s center to the labeled force point. This is the arm length, not the gap between the two objects. Arms use 25 mm steps and stay at least 75 mm long.",
  motion: "The gold Load presses on the beam; the teal hanging Effort pulls through its cord. Both force arrows point down, even when an object moves up. Force direction and motion direction are different.",
  controls: "Drag an object or its role label along the beam. With a label focused, left/right arrows move it across the screen; up/down changes its mass. Controls also offers number boxes, sliders, and halve/double buttons. Swap Positions exchanges places while each object keeps its mass and role.",
  coordinate: "Negative beam coordinates are toward the beam’s marked left end. The fulcrum stays between the objects, at least 75 mm from each, and moves in 25 mm steps.",
  model: "Ideal lever with a weighted balance pointer: the two labeled masses determine level balance. A fixed 250 g pointer bob 125 mm below the axle restores level when tilted. The beam, cord, and pointer rod are massless; the pivot is ideal. The crate stays fixed on the beam and acts as a downward point load at its labeled beam-axis point, not its full center of mass. Motion is illustrative, with damping and ±12° stops. Open Help for the full model.",
  ratio: "Load force divided by effort force equals IMA only at ideal balance. A longer effort arm needs less effort force at balance; equal arms need equal forces. Away from balance, compare the turning effects instead of equating the ratios.",
  fraction: "A fraction means divide: the entire top value divided by the bottom value. In IMA, millimeters divided by millimeters cancel, leaving a ratio with no length unit.",
  needed: "Divide load mass × load-arm distance by effort-arm distance to find the effort mass needed for ideal balance. Both masses experience the same gravity, so grams work in this calculation. Try the result, then release the lever.",
  torque: "Turning effect is force × perpendicular distance from the fulcrum. The panel shows torque at level. When tilted, both horizontal moment arms shrink by cos(angle), so both load/effort torques shrink by the same factor. The pointer adds a restoring torque when tilted and no torque at level.",
  shortcut: "Both masses feel the same gravity, about 9.81 N/kg. Multiplying both sides by the same factor keeps the balance. That is why comparing mass × arm length gives the same balance prediction as comparing force × arm length.",
};
const escapeAttribute = (text) => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
export const tip = (text, keyOrText, cls = "", label = `${text} Help`) =>
  `<button type="button" class="tip ${cls}" aria-label="${escapeAttribute(label)}" data-tip="${escapeAttribute(tips[keyOrText] || keyOrText)}">${text}</button>`;
export const helpTip = (key, label) => tip("?", key, "help-tip", `${label} Help`);
export function setTip(element, key) {
  element.classList.add("tip");
  element.dataset.tip = tips[key] || key;
}
let descriptionId = 0;
export function describeTooltips() {
  for (const trigger of document.querySelectorAll("[data-tip]")) {
    if (trigger.dataset.tipDescription) continue;
    const description = document.createElement("span");
    description.id = `tip-description-${++descriptionId}`;
    description.hidden = true;
    description.textContent = trigger.dataset.tip;
    trigger.after(description);
    trigger.dataset.tipDescription = description.id;
    trigger.setAttribute("aria-describedby", [trigger.getAttribute("aria-describedby"), description.id].filter(Boolean).join(" "));
  }
}
export const unit = (u) => tip(u, u),
  op = (symbol, k) => tip(symbol, k);
const value = (n, u, cls = "") =>
  `<span class="${cls}">${fmt(n)} ${unit(u)}</span>`;
const equalSign = (n, decimals = 4) =>
  Number(n.toFixed(decimals)) === n ? op("=", "equals") : op("≈", "approx");
export function renderMath(state) {
  const m = measures(state),
    balanced = m.direction === "balance";
  const needed =
    Number.isInteger(m.neededMass / 25) &&
    m.neededMass >= 25 &&
    m.neededMass <= 1000;
  const comparison = balanced ? "=" : m.loadMoment > m.effortMoment ? ">" : "<";
  $("#balance-math").innerHTML = `<div class="math-grid">
  <div class="math-cell"><h2>1 · Turning Effects ${helpTip("shortcut", "Turning Effects")}</h2><div class="turning"><span class="load-color">Load: ${value(state.loadMass, "g")} ${op("×", "times")} ${value(m.loadArm, "mm")}</span><b id="load-product">${fmt(m.loadMoment)}</b><span class="effort-color">Effort: ${value(state.effortMass, "g")} ${op("×", "times")} ${value(m.effortArm, "mm")}</span><b id="effort-product">${fmt(m.effortMoment)}</b></div><p>${value(m.loadMoment, "g·mm")} ${tip(comparison, balanced ? "equals" : `${m.direction === "load" ? "Load" : "Effort"} has the larger turning effect.`)} ${value(m.effortMoment, "g·mm")}</p><p class="balance-feedback"><b>${balanced ? "Equal turning effects → settles level." : `${m.direction === "load" ? "Load" : "Effort"} side goes down when released.`}</b></p></div>
  <div class="math-cell"><h2>2 · Ideal Mechanical Advantage ${helpTip("ratio", "Force Ratio and IMA")}</h2><div class="equation">${tip("IMA", "ima")} ${op("=", "equals")} <span class="fraction"><span>${tip("effort arm", "arm")}</span><span>${tip("load arm", "arm")}</span></span> ${op("=", "equals")} <span class="fraction"><span>${value(m.effortArm, "mm", "effort-color")}</span><span>${value(m.loadArm, "mm", "load-color")}</span></span> ${equalSign(m.ima, 2)} <span id="ima-result" class="math-result">${fmt(m.ima, 2)}×</span></div><p class="math-help-row">${tip("Fractions", "fraction")} · ${tip("Force Ratio", "ratio")}</p></div>
  <div class="math-cell"><h2>3 · Effort Mass at Balance ${helpTip("needed", "Effort Mass at Balance")}</h2><div class="equation compact"><span class="fraction"><span>${value(state.loadMass, "g", "load-color")} ${op("×", "times")} ${value(m.loadArm, "mm", "load-color")}</span><span>${value(m.effortArm, "mm", "effort-color")}</span></span> ${equalSign(m.neededMass)} <span id="needed-mass" class="math-result">${value(m.neededMass, "g", "effort-color")}</span></div><p id="step-note">${needed ? "Set this mass, then release." : m.neededMass < 25 || m.neededMass > 1000 ? "Answer is outside 25–1,000 g. Change an arm or the load mass." : "Answer is between 25 g steps. Change an arm or the load mass."}</p></div></div>`;
  $("#force-math").innerHTML = `<div class="conversion-grid">${[
    "load",
    "effort",
  ]
    .map((role) => {
      const mass = state[massKey(role)],
        f = m[role + "Force"],
        distance = m[role + "Arm"],
        t = m[role + "Torque"];
      return `<div><h2 class="${role}-color">${role === "load" ? "Load" : "Effort"} · Mass → Force → Torque ${helpTip("torque", `${role === "load" ? "Load" : "Effort"} Torque`)}</h2><p>${value(mass, "g")} ${tip("÷", "Divide by 1,000 to change grams into kilograms.")} 1,000 ${op("=", "equals")} ${value(mass / 1000, "kg")}</p><p>${value(mass / 1000, "kg")} ${op("×", "times")} ${value(GRAVITY, "N/kg")} ${equalSign(f)} ${value(f, "N")}</p><p>${value(distance, "mm")} ${tip("÷", "Divide by 1,000 to change millimeters into meters.")} 1,000 ${op("=", "equals")} ${value(distance / 1000, "m")}</p><p>${value(f, "N")} ${op("×", "times")} ${value(distance / 1000, "m")} ${Number(f.toFixed(4)) === f ? equalSign(t) : op("≈", "approx")} ${value(t, "N·m")}</p></div>`;
    })
    .join(
      "",
    )}<div><h2>Force Ratio ${helpTip("shortcut", "Mass Shortcut")}</h2><p>${tip("Load force ÷ effort force", "ratio")} ${equalSign(m.forceRatio, 3)} <b id="force-ratio">${fmt(m.forceRatio, 3)}</b></p><p>${tip("IMA", "ima")} ${equalSign(m.ima, 3)} <b>${fmt(m.ima, 3)}</b></p><p class="ratio-feedback"><b>${balanced ? "Balanced: ratios match." : "Unbalanced: ratios differ."}</b></p><p class="math-help-row">${tip("Torque at Level", "torque")} · ${tip("Rounding", "approx")}</p></div></div>`;
}
export function installTooltips() {
  let target = null, originalDescription = null, timer;
  let pinned = false, hovered = null, overBox = false;
  const box = $("#tooltip");
  const triggerAt = (node) => node instanceof Element ? node.closest("[data-tip]") : null;
  function hide() {
    clearTimeout(timer);
    if (target) {
      if (originalDescription === null) target.removeAttribute("aria-describedby");
      else target.setAttribute("aria-describedby", originalDescription);
    }
    target = null;
    pinned = false;
    overBox = false;
    box.hidden = true;
  }
  function show(t) {
    clearTimeout(timer);
    if (target === t) return;
    hide();
    target = t;
    originalDescription = t.getAttribute("aria-describedby");
    box.textContent = t.dataset.tip;
    // Keep other descriptions (for example coordinate guidance) intact.
    const ids = (originalDescription || "").split(/\s+/).filter((id) => id && id !== t.dataset.tipDescription);
    t.setAttribute("aria-describedby", [...ids, "tooltip"].join(" "));
    const viewport = window.visualViewport;
    box.style.maxWidth = `${Math.max(1, Math.min(325, (viewport?.width || innerWidth) - 24))}px`;
    box.style.maxHeight = `${Math.max(1, (viewport?.height || innerHeight) - 24)}px`;
    box.hidden = false;
    const r = t.getBoundingClientRect(), b = box.getBoundingClientRect();
    const left = (viewport?.offsetLeft || 0) + 12;
    const top = (viewport?.offsetTop || 0) + 12;
    const right = left + (viewport?.width || innerWidth) - 24;
    const bottom = top + (viewport?.height || innerHeight) - 24;
    box.style.left = `${Math.max(left, Math.min(right - b.width, r.left + (r.width - b.width) / 2))}px`;
    box.style.top = `${Math.max(top, Math.min(bottom - b.height, r.top >= top + b.height + 8 ? r.top - b.height - 8 : r.bottom + 8))}px`;
  }
  function leave() {
    clearTimeout(timer);
    // Cross the gap between trigger and tooltip without losing the text.
    timer = setTimeout(() => {
      if (!pinned && !overBox && hovered !== target && document.activeElement !== target) hide();
    }, 250);
  }
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const t = triggerAt(e.target);
    if (t) { hovered = t; show(t); }
  });
  document.addEventListener("pointerout", (e) => {
    const t = triggerAt(e.target);
    if (t && !t.contains(e.relatedTarget)) { hovered = null; leave(); }
  });
  box.addEventListener("pointerenter", () => { overBox = true; clearTimeout(timer); });
  box.addEventListener("pointerleave", () => { overBox = false; leave(); });
  document.addEventListener("focusin", (e) => {
    const t = triggerAt(e.target);
    if (t) show(t);
    else hide();
  });
  document.addEventListener("focusout", leave);
  // Help buttons are independent controls, never children of drag targets or
  // labels. Capture their pointer events before apparatus handlers can see them.
  document.addEventListener("pointerdown", (e) => {
    if (triggerAt(e.target) || box.contains(e.target)) e.stopPropagation();
    else hide();
  }, true);
  document.addEventListener("click", (e) => {
    const t = triggerAt(e.target);
    if (t) {
      e.stopPropagation();
      if (target === t && pinned) hide();
      else { show(t); pinned = true; }
    } else if (!box.contains(e.target)) hide();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && target) {
      hide();
      e.preventDefault();
      e.stopImmediatePropagation(); // First Escape dismisses only the tooltip.
    }
  }, true);
  window.addEventListener("resize", hide);
  window.visualViewport?.addEventListener("resize", hide);
  window.visualViewport?.addEventListener("scroll", hide);
  window.addEventListener("scroll", (e) => {
    if (!box.contains(e.target)) hide();
  }, true);
  return hide;
}

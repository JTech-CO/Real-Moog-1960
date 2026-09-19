(function () {
  "use strict";

  const knobs = new Map();
  let active = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function decimals(step) {
    const text = String(step);
    return text.includes(".") ? text.split(".")[1].length : 0;
  }

  function valueToRatio(record, value) {
    if (record.scale === "log") {
      const safeMin = Math.max(0.000001, record.min);
      return Math.log(value / safeMin) / Math.log(record.max / safeMin);
    }
    return (value - record.min) / (record.max - record.min);
  }

  function ratioToValue(record, ratio) {
    const normalized = clamp(ratio, 0, 1);
    let value;
    if (record.scale === "log") {
      value = record.min * Math.pow(record.max / record.min, normalized);
    } else {
      value = record.min + normalized * (record.max - record.min);
    }
    return Math.round(value / record.step) * record.step;
  }

  function formatValue(value, format) {
    switch (format) {
      case "octave": return value === 0 ? "8′" : value === 1 ? "4′" : value === 2 ? "2′" : value === -1 ? "16′" : "32′";
      case "semitone": return `${value >= 0 ? "+" : ""}${value.toFixed(1)} st`;
      case "cents": return `${Math.round(value)} ¢`;
      case "hz": return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 1 : 2)} kHz` : `${value < 10 ? value.toFixed(2) : Math.round(value)} Hz`;
      case "seconds": return value < 1 ? `${Math.round(value * 1000)} ms` : `${value.toFixed(2)} s`;
      case "percent": return `${Math.round(value * 100)}%`;
      case "gain": return `${value.toFixed(2)}×`;
      case "q": return value.toFixed(1);
      case "bpm": return `${Math.round(value)} BPM`;
      case "noteOffset": return `${value >= 0 ? "+" : ""}${Math.round(value)} st`;
      default: return String(value);
    }
  }

  function paint(record, emit) {
    const ratio = clamp(valueToRatio(record, record.value), 0, 1);
    const angle = -135 + ratio * 270;
    record.el.style.setProperty("--angle", `${angle}deg`);
    record.el.dataset.value = String(record.value);
    record.el.setAttribute("aria-valuemin", String(record.min));
    record.el.setAttribute("aria-valuemax", String(record.max));
    record.el.setAttribute("aria-valuenow", String(record.value));
    record.el.setAttribute("aria-valuetext", formatValue(record.value, record.format));
    const output = record.el.closest(".control-unit")?.querySelector("output");
    if (output) output.textContent = formatValue(record.value, record.format);
    if (emit) {
      record.el.dispatchEvent(new CustomEvent("knobchange", {
        bubbles: true,
        detail: { id: record.id, value: record.value }
      }));
    }
  }

  function setValue(idOrElement, nextValue, emit = true) {
    const record = typeof idOrElement === "string" ? knobs.get(idOrElement) : knobs.get(idOrElement?.dataset?.knob);
    if (!record) return;
    const rounded = Number(clamp(Number(nextValue), record.min, record.max).toFixed(decimals(record.step) + 2));
    record.value = Math.round(rounded / record.step) * record.step;
    record.value = Number(record.value.toFixed(Math.min(6, decimals(record.step) + 2)));
    paint(record, emit);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    const record = knobs.get(event.currentTarget.dataset.knob);
    if (!record) return;
    event.preventDefault();
    active = {
      record,
      pointerId: event.pointerId,
      startY: event.clientY,
      startX: event.clientX,
      startRatio: valueToRatio(record, record.value)
    };
    record.el.classList.add("is-dragging");
    record.el.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    const dy = active.startY - event.clientY;
    const dx = event.clientX - active.startX;
    const sensitivity = event.shiftKey ? 0.0013 : 0.0048;
    setValue(active.record.el, ratioToValue(active.record, active.startRatio + (dy + dx * .28) * sensitivity));
  }

  function endDrag(event) {
    if (!active || (event.pointerId != null && event.pointerId !== active.pointerId)) return;
    active.record.el.classList.remove("is-dragging");
    active = null;
  }

  function onWheel(event) {
    event.preventDefault();
    const record = knobs.get(event.currentTarget.dataset.knob);
    const current = valueToRatio(record, record.value);
    const amount = event.shiftKey ? 0.004 : 0.018;
    setValue(record.el, ratioToValue(record, current + (event.deltaY < 0 ? amount : -amount)));
  }

  function onKeyDown(event) {
    const record = knobs.get(event.currentTarget.dataset.knob);
    if (!record) return;
    const pageStep = (record.max - record.min) / 10;
    let next = null;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") next = record.value + record.step;
    if (event.key === "ArrowDown" || event.key === "ArrowLeft") next = record.value - record.step;
    if (event.key === "PageUp") next = record.value + pageStep;
    if (event.key === "PageDown") next = record.value - pageStep;
    if (event.key === "Home") next = record.min;
    if (event.key === "End") next = record.max;
    if (next == null) return;
    event.preventDefault();
    setValue(record.el, next);
  }

  function init(root = document) {
    root.querySelectorAll("[data-knob]").forEach((el) => {
      const id = el.dataset.knob;
      const record = {
        id,
        el,
        min: Number(el.dataset.min ?? 0),
        max: Number(el.dataset.max ?? 1),
        step: Number(el.dataset.step ?? .01),
        value: Number(el.dataset.value ?? 0),
        defaultValue: Number(el.dataset.default ?? el.dataset.value ?? 0),
        scale: el.dataset.scale || "linear",
        format: el.dataset.format || "number"
      };
      knobs.set(id, record);
      el.addEventListener("pointerdown", onPointerDown);
      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("keydown", onKeyDown);
      el.addEventListener("dblclick", () => setValue(el, record.defaultValue));
      paint(record, false);
    });
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  }

  function getValue(id) {
    return knobs.get(id)?.value;
  }

  function snapshot() {
    return Object.fromEntries(Array.from(knobs, ([id, record]) => [id, record.value]));
  }

  function restore(values, emit = true) {
    Object.entries(values || {}).forEach(([id, value]) => setValue(id, value, emit));
  }

  window.RealMoogKnobs = { init, getValue, setValue, snapshot, restore, formatValue };
})();

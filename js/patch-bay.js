(function () {
  "use strict";

  const CABLE_COLORS = ["#df513a", "#d0aa3f", "#4f93af", "#64865f", "#d8cfb2", "#a5648b", "#d36f35", "#6282a9"];

  class PatchBay {
    constructor(engine, options = {}) {
      this.engine = engine;
      this.toast = options.toast || (() => {});
      this.onChange = options.onChange || (() => {});
      this.rack = document.getElementById("rackShell");
      this.svg = document.getElementById("cableLayer");
      this.group = document.getElementById("cableGroup");
      this.draft = document.getElementById("draftCable");
      this.list = document.getElementById("patchList");
      this.count = document.getElementById("patchCount");
      this.jacks = new Map();
      this.patches = [];
      this.selectedJack = null;
      this.pointer = null;
      this.nextId = 1;
      this.resizeObserver = null;
    }

    init() {
      document.querySelectorAll(".jack[data-jack]").forEach((jack) => {
        this.jacks.set(jack.dataset.jack, jack);
        jack.addEventListener("pointerdown", (event) => this._pointerDown(event, jack));
        jack.addEventListener("keydown", (event) => this._keyDown(event, jack));
      });
      window.addEventListener("pointermove", (event) => this._pointerMove(event), { passive: false });
      window.addEventListener("pointerup", (event) => this._pointerUp(event));
      window.addEventListener("pointercancel", () => this._cancelPointer());
      window.addEventListener("resize", () => this.renderCables());
      document.getElementById("rackViewport")?.addEventListener("scroll", () => this.renderCables(), { passive: true });
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.renderCables());
        this.resizeObserver.observe(this.rack);
      }
      this.render();
    }

    _pointerDown(event, jack) {
      if (event.button !== 0) return;
      event.preventDefault();
      this.pointer = {
        id: event.pointerId,
        jack,
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        moved: false
      };
      jack.setPointerCapture?.(event.pointerId);
    }

    _pointerMove(event) {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      const distance = Math.hypot(event.clientX - this.pointer.startX, event.clientY - this.pointer.startY);
      if (distance > 5 && !this.pointer.moved) {
        this.pointer.moved = true;
        this.pointer.jack.classList.add("is-selected");
      }
      this.pointer.currentX = event.clientX;
      this.pointer.currentY = event.clientY;
      if (!this.pointer.moved) return;
      event.preventDefault();
      this.draft.hidden = false;
      const start = this._jackCenter(this.pointer.jack);
      const svgRect = this.svg.getBoundingClientRect();
      const end = { x: event.clientX - svgRect.left, y: event.clientY - svgRect.top };
      this.draft.setAttribute("d", this._cablePath(start, end, true));
      document.querySelectorAll(".jack.is-target").forEach((node) => node.classList.remove("is-target"));
      const candidate = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".jack[data-jack]");
      if (candidate && this._compatibility(this.pointer.jack, candidate).ok) candidate.classList.add("is-target");
    }

    _pointerUp(event) {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      const state = this.pointer;
      this.pointer = null;
      this.draft.hidden = true;
      this.draft.setAttribute("d", "");
      document.querySelectorAll(".jack.is-target").forEach((node) => node.classList.remove("is-target"));

      if (state.moved) {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".jack[data-jack]");
        if (target && target !== state.jack) this._tryConnect(state.jack, target);
        state.jack.classList.remove("is-selected");
        return;
      }

      if (!this.selectedJack) {
        this._selectJack(state.jack);
      } else if (this.selectedJack && this.selectedJack !== state.jack) {
        const first = this.selectedJack;
        this._selectJack(null);
        this._tryConnect(first, state.jack);
      } else if (this.selectedJack === state.jack) {
        this._selectJack(null);
      }
    }

    _cancelPointer() {
      this.pointer?.jack?.classList.remove("is-selected");
      this.pointer = null;
      this.draft.hidden = true;
      document.querySelectorAll(".jack.is-target").forEach((node) => node.classList.remove("is-target"));
    }

    _keyDown(event, jack) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!this.selectedJack) {
        this._selectJack(jack);
      } else if (this.selectedJack === jack) {
        this._selectJack(null);
      } else {
        const first = this.selectedJack;
        this._selectJack(null);
        this._tryConnect(first, jack);
      }
    }

    _selectJack(jack) {
      if (this.selectedJack && this.selectedJack !== jack) this.selectedJack.classList.remove("is-selected");
      this.selectedJack = jack;
      jack?.classList.add("is-selected");
    }

    _moduleId(jack) {
      return jack.closest("[data-module]")?.dataset.module || jack.dataset.jack.split("-")[0];
    }

    _wouldCreateAudioCycle(fromJack, toJack) {
      if (fromJack.dataset.signal !== "audio") return false;
      const start = this._moduleId(fromJack);
      const end = this._moduleId(toJack);
      if (start === end) return true;
      const graph = new Map();
      this.patches.filter((patch) => patch.signal === "audio").forEach((patch) => {
        const from = this._moduleId(this.jacks.get(patch.from));
        const to = this._moduleId(this.jacks.get(patch.to));
        if (!graph.has(from)) graph.set(from, new Set());
        graph.get(from).add(to);
      });
      if (!graph.has(start)) graph.set(start, new Set());
      graph.get(start).add(end);
      const stack = [end];
      const visited = new Set();
      while (stack.length) {
        const node = stack.pop();
        if (node === start) return true;
        if (visited.has(node)) continue;
        visited.add(node);
        graph.get(node)?.forEach((next) => stack.push(next));
      }
      return false;
    }

    _compatibility(a, b) {
      if (!a || !b || a === b) return { ok: false, message: "서로 다른 두 잭을 선택하십시오." };
      if (a.dataset.direction === b.dataset.direction) return { ok: false, message: "출력(OUT)과 입력(IN)을 연결해야 합니다." };
      const output = a.dataset.direction === "output" ? a : b;
      const input = a.dataset.direction === "input" ? a : b;
      if (output.dataset.signal !== input.dataset.signal) {
        const names = { audio: "AUDIO", cv: "CONTROL VOLTAGE", gate: "GATE" };
        return { ok: false, message: `${names[output.dataset.signal]} 출력은 ${names[input.dataset.signal]} 입력에 연결할 수 없습니다.` };
      }
      if (this._wouldCreateAudioCycle(output, input)) return { ok: false, message: "무한 피드백이 생기는 오디오 연결은 안전을 위해 차단했습니다." };
      return { ok: true, output, input };
    }

    _tryConnect(a, b) {
      const result = this._compatibility(a, b);
      if (!result.ok) {
        this.toast(result.message);
        return false;
      }
      return this.addPatch(result.output.dataset.jack, result.input.dataset.jack);
    }

    addPatch(from, to, color = null, silent = false) {
      const fromJack = this.jacks.get(from);
      const toJack = this.jacks.get(to);
      const compatibility = this._compatibility(fromJack, toJack);
      if (!compatibility.ok) {
        if (!silent) this.toast(compatibility.message);
        return false;
      }
      const normalizedFrom = compatibility.output.dataset.jack;
      const normalizedTo = compatibility.input.dataset.jack;
      if (this.patches.some((patch) => patch.from === normalizedFrom && patch.to === normalizedTo)) {
        if (!silent) this.toast("이미 연결된 패치입니다.");
        return false;
      }

      const occupied = this.patches.find((patch) => patch.to === normalizedTo);
      if (occupied) this.removePatch(occupied.id, true);
      const patch = {
        id: this.nextId++,
        from: normalizedFrom,
        to: normalizedTo,
        signal: compatibility.output.dataset.signal,
        color: color || CABLE_COLORS[this.patches.length % CABLE_COLORS.length]
      };
      this.patches.push(patch);
      this.engine.connectPatch(patch.from, patch.to);
      this.render();
      if (!silent) this.toast(`${this._shortLabel(fromJack)} → ${this._shortLabel(toJack)} 연결`);
      return true;
    }

    removePatch(id, silent = false) {
      const index = this.patches.findIndex((patch) => patch.id === Number(id));
      if (index < 0) return;
      const [patch] = this.patches.splice(index, 1);
      this.engine.disconnectPatch(patch.from, patch.to);
      this.render();
      if (!silent) this.toast(`${this._shortLabel(this.jacks.get(patch.from))} 케이블 제거`);
    }

    clear(silent = false) {
      this.engine.disconnectAllPatches();
      this.patches = [];
      this.render();
      if (!silent) this.toast("모든 패치 케이블을 제거했습니다.");
    }

    load(patches) {
      this.clear(true);
      (patches || []).forEach((patch, index) => {
        this.addPatch(patch.from, patch.to, patch.color || CABLE_COLORS[index % CABLE_COLORS.length], true);
      });
      this.toast(`${this.patches.length}개의 케이블로 패치를 구성했습니다.`);
    }

    reconnectAll() {
      if (!this.engine.ready) return;
      this.engine.disconnectAllPatches();
      this.patches.forEach((patch) => this.engine.connectPatch(patch.from, patch.to));
    }

    _shortLabel(jack) {
      if (!jack) return "UNKNOWN";
      const label = jack.getAttribute("aria-label") || jack.dataset.jack;
      return label
        .replace(/ audio output| audio input| control output| control input| pitch control| gain control| cutoff control| gate output| gate input/gi, "")
        .replace(/Oscillator/gi, "OSC")
        .replace(/channel/gi, "CH")
        .trim();
    }

    _jackCenter(jack) {
      const jackRect = jack.getBoundingClientRect();
      const svgRect = this.svg.getBoundingClientRect();
      return {
        x: jackRect.left + jackRect.width / 2 - svgRect.left,
        y: jackRect.top + jackRect.height / 2 - svgRect.top
      };
    }

    _cablePath(start, end, draft = false) {
      const dx = Math.abs(end.x - start.x);
      const dy = Math.abs(end.y - start.y);
      const sag = Math.min(240, 42 + dx * .11 + dy * .08);
      const lowerY = Math.max(start.y, end.y) + sag;
      const bias = draft ? .52 : .46;
      return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${start.x.toFixed(1)} ${(start.y + sag * bias).toFixed(1)}, ${end.x.toFixed(1)} ${lowerY.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    }

    renderCables() {
      this.group.replaceChildren();
      const namespace = "http://www.w3.org/2000/svg";
      this.patches.forEach((patch) => {
        const fromJack = this.jacks.get(patch.from);
        const toJack = this.jacks.get(patch.to);
        if (!fromJack || !toJack) return;
        const start = this._jackCenter(fromJack);
        const end = this._jackCenter(toJack);
        const d = this._cablePath(start, end);
        const group = document.createElementNS(namespace, "g");
        group.classList.add("patch-cable-group");
        group.style.setProperty("--cable-color", patch.color);
        group.dataset.patchId = patch.id;

        const cable = document.createElementNS(namespace, "path");
        cable.setAttribute("d", d);
        cable.classList.add("patch-cable");
        const highlight = document.createElementNS(namespace, "path");
        highlight.setAttribute("d", d);
        highlight.classList.add("patch-cable-highlight");
        const hit = document.createElementNS(namespace, "path");
        hit.setAttribute("d", d);
        hit.classList.add("patch-cable-hit");
        hit.addEventListener("dblclick", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.removePatch(patch.id);
        });
        const startPlug = document.createElementNS(namespace, "circle");
        startPlug.setAttribute("cx", start.x);
        startPlug.setAttribute("cy", start.y);
        startPlug.setAttribute("r", "8");
        startPlug.classList.add("patch-cable-plug");
        const endPlug = document.createElementNS(namespace, "circle");
        endPlug.setAttribute("cx", end.x);
        endPlug.setAttribute("cy", end.y);
        endPlug.setAttribute("r", "8");
        endPlug.classList.add("patch-cable-plug");
        group.append(cable, highlight, hit, startPlug, endPlug);
        this.group.append(group);
      });
    }

    renderList() {
      this.list.replaceChildren();
      if (this.patches.length === 0) {
        const empty = document.createElement("span");
        empty.className = "patch-empty";
        empty.textContent = "케이블이 없습니다. 출력 잭을 입력 잭으로 드래그하십시오.";
        this.list.append(empty);
        return;
      }
      this.patches.forEach((patch) => {
        const chip = document.createElement("span");
        chip.className = "patch-chip";
        chip.style.setProperty("--chip-color", patch.color);
        chip.textContent = `${this._shortLabel(this.jacks.get(patch.from))} → ${this._shortLabel(this.jacks.get(patch.to))}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `${chip.textContent} 케이블 제거`);
        remove.addEventListener("click", () => this.removePatch(patch.id));
        chip.append(remove);
        this.list.append(chip);
      });
    }

    render() {
      this.count.textContent = String(this.patches.length);
      document.querySelectorAll(".jack.is-connected").forEach((jack) => jack.classList.remove("is-connected"));
      this.patches.forEach((patch) => {
        this.jacks.get(patch.from)?.classList.add("is-connected");
        this.jacks.get(patch.to)?.classList.add("is-connected");
      });
      this.renderCables();
      this.renderList();
      this.onChange(this.snapshot());
    }

    snapshot() {
      return this.patches.map(({ from, to, signal, color }) => ({ from, to, signal, color }));
    }
  }

  window.RealMoogPatchBay = PatchBay;
})();

(function () {
  "use strict";

  const PRESETS = {
    warmBass: {
      name: "WARM BASS",
      knobs: {
        vco1Octave: -1, vco1Tune: 0, vco1Mod: 35,
        vco2Octave: -1, vco2Tune: .08, vco2Mod: 28,
        vco3Octave: -2, vco3Tune: 0, vco3Mod: 45,
        mix1: .68, mix2: .58, mix3: .38, mix4: .2,
        filterCutoff: 1250, filterResonance: 6.5, filterMod: 2600, filterDrive: 1.65,
        env1Attack: .025, env1Decay: .24, env1Sustain: .72, env1Release: .34,
        env2Attack: .015, env2Decay: .42, env2Sustain: .26, env2Release: .28,
        vcaInitial: 0, vcaCvAmount: .9, lfoRate: 4.8, lfoAmount: .72,
        masterVolume: .42, glide: .03, tempo: 112
      },
      patches: [
        ["vco1-saw", "mixer-in1"], ["vco2-square", "mixer-in2"], ["vco3-triangle", "mixer-in3"],
        ["mixer-out", "filter-in"], ["filter-out", "vca-in"], ["vca-out", "output-in"],
        ["keyboard-cv", "vco1-pitch"], ["keyboard-cv", "vco2-pitch"], ["keyboard-cv", "vco3-pitch"],
        ["keyboard-gate", "env1-gate"], ["keyboard-gate", "env2-gate"],
        ["env1-out", "vca-cv"], ["env2-out", "filter-cutoff"]
      ]
    },
    glassLead: {
      name: "GLASS LEAD",
      knobs: {
        vco1Octave: 0, vco1Tune: 0, vco1Mod: 18,
        vco2Octave: 0, vco2Tune: .12, vco2Mod: 16,
        vco3Octave: 1, vco3Tune: 0, vco3Mod: 22,
        mix1: .38, mix2: .3, mix3: .16, mix4: 0,
        filterCutoff: 3600, filterResonance: 10.2, filterMod: 4200, filterDrive: 1.2,
        env1Attack: .015, env1Decay: .3, env1Sustain: .56, env1Release: .62,
        env2Attack: .025, env2Decay: .78, env2Sustain: .2, env2Release: .7,
        vcaInitial: 0, vcaCvAmount: .82, lfoRate: 5.6, lfoAmount: .62,
        masterVolume: .38, glide: .11, tempo: 126
      },
      patches: [
        ["vco1-triangle", "mixer-in1"], ["vco2-saw", "mixer-in2"], ["vco3-sine", "mixer-in3"],
        ["mixer-out", "filter-in"], ["filter-out", "vca-in"], ["vca-out", "output-in"],
        ["keyboard-cv", "vco1-pitch"], ["keyboard-cv", "vco2-pitch"], ["keyboard-cv", "vco3-pitch"],
        ["keyboard-gate", "env1-gate"], ["keyboard-gate", "env2-gate"],
        ["env1-out", "vca-cv"], ["env2-out", "filter-cutoff"], ["lfo-sine", "vco2-pitch"]
      ]
    },
    lunarPulse: {
      name: "LUNAR PULSE",
      knobs: {
        vco1Octave: -1, vco1Tune: 0, vco1Mod: 40,
        vco2Octave: 0, vco2Tune: 7, vco2Mod: 26,
        vco3Octave: -2, vco3Tune: 0, vco3Mod: 55,
        mix1: .6, mix2: .26, mix3: .1, mix4: .15,
        filterCutoff: 820, filterResonance: 13.2, filterMod: 3400, filterDrive: 2.3,
        env1Attack: .008, env1Decay: .11, env1Sustain: .42, env1Release: .12,
        env2Attack: .008, env2Decay: .23, env2Sustain: .05, env2Release: .18,
        vcaInitial: 0, vcaCvAmount: .92, lfoRate: .32, lfoAmount: .48,
        masterVolume: .4, glide: .015, tempo: 118,
        step1: 0, step2: 3, step3: 7, step4: 10, step5: 7, step6: 3, step7: -2, step8: -5
      },
      patches: [
        ["vco1-square", "mixer-in1"], ["vco2-saw", "mixer-in2"], ["noise-pink", "mixer-in3"],
        ["mixer-out", "filter-in"], ["filter-out", "vca-in"], ["vca-out", "output-in"],
        ["sequencer-cv", "vco1-pitch"], ["sequencer-cv", "vco2-pitch"],
        ["sequencer-gate", "env1-gate"], ["sequencer-gate", "env2-gate"],
        ["env1-out", "vca-cv"], ["env2-out", "filter-cutoff"]
      ]
    },
    selfSweep: {
      name: "SELF SWEEP",
      knobs: {
        vco1Octave: -1, vco1Tune: 0, vco1Mod: 62,
        vco2Octave: -1, vco2Tune: 7, vco2Mod: 48,
        vco3Octave: 0, vco3Tune: 0, vco3Mod: 40,
        mix1: .54, mix2: .22, mix3: 0, mix4: .14,
        filterCutoff: 420, filterResonance: 15, filterMod: 5200, filterDrive: 2.55,
        env1Attack: .12, env1Decay: .42, env1Sustain: .68, env1Release: 1.25,
        env2Attack: .02, env2Decay: .8, env2Sustain: .18, env2Release: .8,
        vcaInitial: 0, vcaCvAmount: .72, lfoRate: .22, lfoAmount: .82,
        masterVolume: .36, glide: .18, tempo: 88
      },
      patches: [
        ["vco1-saw", "mixer-in1"], ["vco2-triangle", "mixer-in2"], ["noise-white", "mixer-in4"],
        ["mixer-out", "filter-in"], ["filter-out", "vca-in"], ["vca-out", "output-in"],
        ["keyboard-cv", "vco1-pitch"], ["keyboard-cv", "vco2-pitch"],
        ["keyboard-gate", "env1-gate"], ["env1-out", "vca-cv"],
        ["lfo-triangle", "filter-cutoff"]
      ]
    },
    blank: { name: "BLANK PANEL", knobs: {}, patches: [] }
  };

  const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);
  const KEY_MAP = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k"];

  let knobs;
  let engine;
  let patchBay;
  let sequencer;
  let visualizer;
  let toastTimer;
  let keyboardBase = 48;
  const pressedComputerKeys = new Map();
  const pointerNotes = new Map();

  function toast(message) {
    const element = document.getElementById("toast");
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element.classList.remove("show"), 2400);
  }

  function setStatus(title, text) {
    document.getElementById("statusTitle").textContent = title;
    document.getElementById("statusText").textContent = text;
  }

  async function setPower(on) {
    const button = document.getElementById("powerButton");
    button.disabled = true;
    try {
      const powered = await engine.setPower(on);
      if (powered) {
        patchBay.reconnectAll();
        engine.updateAllKnobs();
        document.body.classList.add("audio-on");
        button.setAttribute("aria-pressed", "true");
        button.querySelector("small").textContent = "오디오 작동 중";
        setStatus("SYSTEM ONLINE", `${engine.context.sampleRate.toLocaleString()} Hz · ${patchBay.patches.length} PATCH CORDS`);
      } else {
        sequencer.stop();
        document.body.classList.remove("audio-on");
        button.setAttribute("aria-pressed", "false");
        button.querySelector("small").textContent = "오디오 시작";
        setStatus("STANDBY", "POWER를 눌러 오디오를 시작하십시오");
      }
      return powered;
    } catch (error) {
      console.error(error);
      toast(error.message || "오디오를 시작할 수 없습니다.");
      setStatus("AUDIO ERROR", error.message || "브라우저 오디오 초기화 실패");
      return false;
    } finally {
      button.disabled = false;
    }
  }

  async function ensurePower() {
    return engine.powered || setPower(true);
  }

  function asPatches(pairs) {
    return pairs.map(([from, to]) => ({ from, to }));
  }

  function loadPreset(id, options = {}) {
    const preset = PRESETS[id] || PRESETS.warmBass;
    sequencer?.stop();
    knobs.restore(preset.knobs, true);
    patchBay.load(asPatches(preset.patches));
    document.getElementById("presetSelect").value = id;
    setStatus(engine.powered ? "PATCH LOADED" : "PATCH READY", `${preset.name} · ${preset.patches.length} CORDS`);
    if (!options.silent) toast(`${preset.name} 패치를 불러왔습니다.`);
  }

  function noteName(midi) {
    return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function renderKeyboard() {
    const keyboard = document.getElementById("keyboard");
    keyboard.replaceChildren();
    const notes = Array.from({ length: 25 }, (_, index) => keyboardBase + index);
    const whiteNotes = notes.filter((midi) => WHITE_PITCHES.has(midi % 12));
    const whiteWidth = 100 / whiteNotes.length;
    const blackWidth = whiteWidth * .62;
    let whiteIndex = 0;

    notes.forEach((midi, relativeIndex) => {
      const isWhite = WHITE_PITCHES.has(midi % 12);
      const key = document.createElement("button");
      key.type = "button";
      key.className = `piano-key ${isWhite ? "white" : "black"}`;
      key.dataset.midi = midi;
      key.setAttribute("aria-label", `${noteName(midi)} 연주`);
      if (isWhite) {
        key.style.left = `${whiteIndex * whiteWidth}%`;
        key.style.width = `${whiteWidth + .06}%`;
        whiteIndex += 1;
      } else {
        key.style.left = `${whiteIndex * whiteWidth - blackWidth / 2}%`;
        key.style.width = `${blackWidth}%`;
      }
      const label = document.createElement("span");
      const mappedIndex = relativeIndex >= 0 && relativeIndex < KEY_MAP.length ? relativeIndex : -1;
      label.textContent = mappedIndex >= 0 ? `${noteName(midi)} · ${KEY_MAP[mappedIndex].toUpperCase()}` : noteName(midi);
      key.append(label);
      key.addEventListener("pointerdown", (event) => pressPointerNote(event, key));
      key.addEventListener("pointerup", (event) => releasePointerNote(event, key));
      key.addEventListener("pointercancel", (event) => releasePointerNote(event, key));
      key.addEventListener("contextmenu", (event) => event.preventDefault());
      keyboard.append(key);
    });
    document.getElementById("octaveReadout").textContent = `${noteName(keyboardBase)}–${noteName(keyboardBase + 24)}`;
  }

  async function pressPointerNote(event, key) {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    const midi = Number(key.dataset.midi);
    pointerNotes.set(event.pointerId, midi);
    key.setPointerCapture?.(event.pointerId);
    key.classList.add("active");
    if (await ensurePower()) {
      if (pointerNotes.get(event.pointerId) === midi) engine.noteOn(midi, .92);
    }
  }

  function releasePointerNote(event, key) {
    const midi = pointerNotes.get(event.pointerId);
    if (midi == null) return;
    pointerNotes.delete(event.pointerId);
    key.classList.remove("active");
    engine.noteOff(midi);
  }

  function clearActiveKeys() {
    document.querySelectorAll(".piano-key.active").forEach((key) => key.classList.remove("active"));
    pointerNotes.clear();
    pressedComputerKeys.clear();
  }

  function shiftOctave(direction) {
    keyboardBase = Math.min(72, Math.max(24, keyboardBase + direction * 12));
    engine.panic();
    clearActiveKeys();
    renderKeyboard();
    toast(`건반 범위: ${noteName(keyboardBase)}–${noteName(keyboardBase + 24)}`);
  }

  async function computerKeyDown(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    const key = event.key.toLowerCase();
    if (key === "z") { event.preventDefault(); shiftOctave(-1); return; }
    if (key === "x") { event.preventDefault(); shiftOctave(1); return; }
    const index = key === " " ? 0 : KEY_MAP.indexOf(key);
    if (index < 0) return;
    event.preventDefault();
    const midi = keyboardBase + index;
    pressedComputerKeys.set(event.code, midi);
    document.querySelector(`.piano-key[data-midi="${midi}"]`)?.classList.add("active");
    if (await ensurePower() && pressedComputerKeys.get(event.code) === midi) engine.noteOn(midi, .9);
  }

  function computerKeyUp(event) {
    const midi = pressedComputerKeys.get(event.code);
    if (midi == null) return;
    event.preventDefault();
    pressedComputerKeys.delete(event.code);
    document.querySelector(`.piano-key[data-midi="${midi}"]`)?.classList.remove("active");
    engine.noteOff(midi);
  }

  function bindUi() {
    document.addEventListener("knobchange", (event) => engine.updateKnob(event.detail.id, event.detail.value));
    document.getElementById("powerButton").addEventListener("click", () => setPower(!engine.powered));
    document.getElementById("loadPresetButton").addEventListener("click", () => loadPreset(document.getElementById("presetSelect").value));
    document.getElementById("presetSelect").addEventListener("change", (event) => loadPreset(event.target.value));
    document.getElementById("clearPatchButton").addEventListener("click", () => patchBay.clear());
    document.getElementById("panicButton").addEventListener("click", () => {
      sequencer.stop();
      engine.panic();
      clearActiveKeys();
      toast("PANIC: 모든 게이트와 음을 정지했습니다.");
    });

    const sequenceButton = document.getElementById("sequenceButton");
    sequenceButton.addEventListener("click", () => sequencer.toggle());
    document.querySelectorAll("[data-octave-shift]").forEach((button) => button.addEventListener("click", () => shiftOctave(Number(button.dataset.octaveShift))));

    const helpDialog = document.getElementById("helpDialog");
    document.getElementById("helpButton").addEventListener("click", () => helpDialog.showModal());
    document.getElementById("loadTutorialButton").addEventListener("click", () => {
      loadPreset("warmBass");
      helpDialog.close();
      document.getElementById("rackViewport").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    window.addEventListener("keydown", computerKeyDown);
    window.addEventListener("keyup", computerKeyUp);
    window.addEventListener("blur", () => {
      engine.panic();
      clearActiveKeys();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        engine.panic();
        clearActiveKeys();
      }
    });
  }

  function init() {
    knobs = window.RealMoogKnobs;
    knobs.init();
    engine = new window.RealMoogAudioEngine(knobs);
    patchBay = new window.RealMoogPatchBay(engine, {
      toast,
      onChange: (patches) => {
        if (engine.powered) setStatus("SYSTEM ONLINE", `${engine.context.sampleRate.toLocaleString()} Hz · ${patches.length} PATCH CORDS`);
      }
    });
    patchBay.init();
    sequencer = new window.RealMoogSequencer(engine, knobs, {
      onNeedPower: ensurePower,
      onChange: (running) => {
        const button = document.getElementById("sequenceButton");
        button.setAttribute("aria-pressed", String(running));
        if (running) setStatus("SEQUENCER RUNNING", `${Math.round(knobs.getValue("tempo"))} BPM · EIGHT STEPS`);
        else if (engine.powered) setStatus("SYSTEM ONLINE", `${engine.context.sampleRate.toLocaleString()} Hz · ${patchBay.patches.length} PATCH CORDS`);
      }
    });
    visualizer = new window.RealMoogVisualizer(engine);
    visualizer.start();
    renderKeyboard();
    bindUi();
    loadPreset("warmBass", { silent: true });

    window.RealMoogApp = {
      version: "1.0.0",
      engine,
      patchBay,
      sequencer,
      knobs,
      presets: PRESETS,
      loadPreset,
      setPower,
      getState: () => ({
        engine: engine.getDebugState(),
        patches: patchBay.snapshot(),
        knobs: knobs.snapshot(),
        sequencerRunning: sequencer.running,
        keyboardBase
      })
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

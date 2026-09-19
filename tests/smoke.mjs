import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const { window } = parseHTML(html);

class MockAudioParam {
  constructor(value = 0) { this.value = value; }
  cancelScheduledValues() {}
  cancelAndHoldAtTime() {}
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  setTargetAtTime(value) { this.value = value; }
}

class MockNode {
  constructor() { this.connections = new Set(); }
  connect(target) { this.connections.add(target); return target; }
  disconnect(target) { if (target) this.connections.delete(target); else this.connections.clear(); }
}

class MockGain extends MockNode { constructor() { super(); this.gain = new MockAudioParam(1); } }
class MockOscillator extends MockNode {
  constructor() { super(); this.type = "sine"; this.frequency = new MockAudioParam(440); this.detune = new MockAudioParam(0); this.started = false; }
  start() { this.started = true; }
}
class MockConstantSource extends MockNode {
  constructor() { super(); this.offset = new MockAudioParam(0); this.started = false; }
  start() { this.started = true; }
}
class MockBufferSource extends MockNode {
  constructor() { super(); this.buffer = null; this.loop = false; }
  start() {}
}
class MockFilter extends MockNode {
  constructor() { super(); this.type = "lowpass"; this.frequency = new MockAudioParam(350); this.Q = new MockAudioParam(1); }
}
class MockCompressor extends MockNode {
  constructor() {
    super();
    this.threshold = new MockAudioParam(); this.knee = new MockAudioParam(); this.ratio = new MockAudioParam();
    this.attack = new MockAudioParam(); this.release = new MockAudioParam();
  }
}
class MockAnalyser extends MockNode {
  constructor() { super(); this.fftSize = 2048; this.smoothingTimeConstant = 0; }
  getByteTimeDomainData(array) { array.fill(128); }
}
class MockAudioContext {
  constructor() { this.state = "suspended"; this.sampleRate = 48000; this.currentTime = 0; this.destination = new MockNode(); }
  createGain() { return new MockGain(); }
  createOscillator() { return new MockOscillator(); }
  createConstantSource() { return new MockConstantSource(); }
  createBufferSource() { return new MockBufferSource(); }
  createBiquadFilter() { return new MockFilter(); }
  createDynamicsCompressor() { return new MockCompressor(); }
  createAnalyser() { return new MockAnalyser(); }
  createWaveShaper() { const node = new MockNode(); node.curve = null; node.oversample = "none"; return node; }
  createBuffer(channels, length) {
    const arrays = Array.from({ length: channels }, () => new Float32Array(length));
    return { getChannelData: (channel) => arrays[channel] };
  }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
}

Object.assign(window, {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  ResizeObserver: class { observe() {} disconnect() {} },
  devicePixelRatio: 1
});

window.HTMLCanvasElement.prototype.getContext = () => ({
  fillStyle: "", strokeStyle: "", lineWidth: 1, shadowBlur: 0, shadowColor: "", font: "", textAlign: "",
  fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, save() {}, restore() {}
});
window.Element.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, right: 25, bottom: 25, width: 25, height: 25 });
window.Element.prototype.setPointerCapture = () => {};
window.Element.prototype.scrollIntoView = () => {};
window.HTMLDialogElement ??= window.HTMLElement;
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };
Object.defineProperty(window.document.getElementById("presetSelect"), "value", { value: "warmBass", writable: true, configurable: true });

const sandbox = vm.createContext({
  window,
  document: window.document,
  console,
  performance,
  CustomEvent: window.CustomEvent,
  Event: window.Event,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLSelectElement: window.HTMLSelectElement,
  HTMLTextAreaElement: window.HTMLTextAreaElement,
  setTimeout,
  clearTimeout,
  requestAnimationFrame: window.requestAnimationFrame,
  cancelAnimationFrame: window.cancelAnimationFrame,
  ResizeObserver: window.ResizeObserver
});

for (const source of ["knob.js", "audio-engine.js", "patch-bay.js", "sequencer.js", "visualizer.js", "app.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", source), "utf8"), sandbox, { filename: source });
}

const app = window.RealMoogApp;
assert.ok(app, "application should initialize");
assert.equal(app.version, "1.0.0");
assert.equal(window.document.querySelectorAll(".piano-key").length, 25, "keyboard should render 25 keys");
assert.equal(app.patchBay.patches.length, 13, "warm bass preset should load 13 cords");
assert.equal(app.engine.ready, false, "audio should remain gesture-gated before power");

await app.setPower(true);
assert.equal(app.engine.ready, true);
assert.equal(app.engine.powered, true);
assert.equal(app.engine.context.state, "running");
assert.equal(app.engine.connections.size, 13, "all visible cords should connect to the audio graph");
assert.equal(app.engine.vcos.length, 3);
assert.equal(app.engine.getDebugState().oscillatorCount, 12);

app.engine.noteOn(60);
assert.equal(app.engine.keyboardCV.offset.value, 1, "C4 should be one volt/octave above C3 reference");
app.engine.noteOff(60);

app.knobs.setValue("filterCutoff", 2400);
assert.equal(app.engine.filterStages[0].frequency.value, 2400);
assert.equal(app.engine.filterStages[1].frequency.value, 2400);

app.loadPreset("lunarPulse", { silent: true });
assert.equal(app.patchBay.patches.length, 12);
assert.equal(app.engine.connections.size, 12);
await app.sequencer.start();
assert.equal(app.sequencer.running, true);
app.sequencer.stop();
assert.equal(app.sequencer.running, false);

app.patchBay.clear(true);
assert.equal(app.patchBay.patches.length, 0);
assert.equal(app.engine.connections.size, 0);
assert.equal(app.patchBay.addPatch("vco1-saw", "mixer-in1", null, true), true);
assert.equal(app.patchBay.addPatch("mixer-out", "filter-in", null, true), true);
assert.equal(app.patchBay.addPatch("filter-out", "filter-in", null, true), false, "same-module feedback should be blocked");

await app.setPower(false);
assert.equal(app.engine.powered, false);
assert.equal(app.engine.context.state, "suspended");

const duplicateIds = [...window.document.querySelectorAll("[id]")]
  .map((node) => node.id)
  .filter((id, index, all) => all.indexOf(id) !== index);
assert.deepEqual(duplicateIds, [], "HTML IDs must be unique");

console.log(JSON.stringify({
  result: "PASS",
  keyboardKeys: 25,
  initialPatchCords: 13,
  audioOscillators: app.engine.getDebugState().oscillatorCount,
  audioInputs: app.engine.getDebugState().inputCount,
  audioOutputs: app.engine.getDebugState().outputCount
}, null, 2));

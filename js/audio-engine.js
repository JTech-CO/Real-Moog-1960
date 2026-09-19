(function () {
  "use strict";

  const SHAPES = ["sine", "triangle", "saw", "square"];
  const SHAPE_TYPES = { sine: "sine", triangle: "triangle", saw: "sawtooth", square: "square" };
  const BASE_C3 = 130.81278265;

  function softClipCurve(amount = 2) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const k = Math.max(0.01, amount * 18);
    for (let i = 0; i < samples; i += 1) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function makeNoiseBuffer(context, color) {
    const length = context.sampleRate * 3;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    if (color === "white") {
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    } else {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = .99886 * b0 + white * .0555179;
        b1 = .99332 * b1 + white * .0750759;
        b2 = .96900 * b2 + white * .1538520;
        b3 = .86650 * b3 + white * .3104856;
        b4 = .55000 * b4 + white * .5329522;
        b5 = -.7616 * b5 - white * .0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * .5362) * .11;
        b6 = white * .115926;
      }
    }
    return buffer;
  }

  class RealMoogAudioEngine {
    constructor(knobs) {
      this.knobs = knobs;
      this.context = null;
      this.ready = false;
      this.powered = false;
      this.outputs = new Map();
      this.inputs = new Map();
      this.connections = new Map();
      this.vcos = [];
      this.envelopes = {};
      this.gateState = new Map();
      this.keyboardNotes = new Set();
      this.currentMidi = 48;
      this.analyser = null;
      this.compressor = null;
      this.masterGain = null;
      this.keyboardCV = null;
      this.sequencerCV = null;
      this.noiseSources = [];
      this.onStateChange = null;
    }

    async initialize() {
      if (this.ready) return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("이 브라우저는 Web Audio API를 지원하지 않습니다.");
      this.context = new AudioContextClass({ latencyHint: "interactive" });
      this._buildMaster();
      this._buildOscillators();
      this._buildNoise();
      this._buildLfo();
      this._buildMixer();
      this._buildFilter();
      this._buildEnvelopes();
      this._buildVca();
      this._buildControllers();
      this._registerOutputInput();
      this.ready = true;
      this.updateAllKnobs();
    }

    _buildMaster() {
      const ctx = this.context;
      this.masterInput = ctx.createGain();
      this.masterWarmth = ctx.createWaveShaper();
      this.masterWarmth.curve = softClipCurve(.65);
      this.masterWarmth.oversample = "2x";
      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 15;
      this.compressor.ratio.value = 8;
      this.compressor.attack.value = .003;
      this.compressor.release.value = .2;
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = .77;
      this.masterInput.connect(this.masterWarmth);
      this.masterWarmth.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(ctx.destination);
    }

    _buildOscillators() {
      const ctx = this.context;
      for (let index = 1; index <= 3; index += 1) {
        const voice = { index, oscillators: {}, outputs: {}, baseFrequency: BASE_C3 };
        const drift = ctx.createOscillator();
        const driftDepth = ctx.createGain();
        drift.type = "sine";
        drift.frequency.value = .047 + index * .021;
        driftDepth.gain.value = 1.2 + index * .45;
        drift.connect(driftDepth);
        drift.start();
        voice.drift = drift;
        voice.driftDepth = driftDepth;

        SHAPES.forEach((shape) => {
          const osc = ctx.createOscillator();
          const output = ctx.createGain();
          osc.type = SHAPE_TYPES[shape];
          osc.frequency.value = BASE_C3;
          output.gain.value = shape === "sine" ? .23 : .15;
          osc.connect(output);
          driftDepth.connect(osc.detune);
          osc.start();
          voice.oscillators[shape] = osc;
          voice.outputs[shape] = output;
          this.outputs.set(`vco${index}-${shape}`, { node: output, signal: "audio", role: "oscillator" });
        });

        const pitchInput = { signal: "cv", role: "vcoPitch", voiceIndex: index, params: SHAPES.map((shape) => voice.oscillators[shape].detune) };
        this.inputs.set(`vco${index}-pitch`, pitchInput);
        this.vcos.push(voice);
      }
    }

    _buildNoise() {
      ["white", "pink"].forEach((color) => {
        const source = this.context.createBufferSource();
        const output = this.context.createGain();
        source.buffer = makeNoiseBuffer(this.context, color);
        source.loop = true;
        output.gain.value = color === "white" ? .12 : .2;
        source.connect(output);
        source.start();
        this.noiseSources.push(source);
        this.outputs.set(`noise-${color}`, { node: output, signal: "audio", role: "noise" });
      });
    }

    _buildLfo() {
      this.lfo = { oscillators: {}, outputs: {} };
      ["sine", "triangle", "square"].forEach((shape) => {
        const osc = this.context.createOscillator();
        const output = this.context.createGain();
        osc.type = shape;
        osc.frequency.value = 4.8;
        output.gain.value = .72;
        osc.connect(output);
        osc.start();
        this.lfo.oscillators[shape] = osc;
        this.lfo.outputs[shape] = output;
        this.outputs.set(`lfo-${shape}`, { node: output, signal: "cv", role: "modulation" });
      });
    }

    _buildMixer() {
      const ctx = this.context;
      this.mixerInputs = [];
      this.mixerSum = ctx.createGain();
      this.mixerSaturation = ctx.createWaveShaper();
      this.mixerSaturation.curve = softClipCurve(1.15);
      this.mixerSaturation.oversample = "4x";
      this.mixerOutput = ctx.createGain();
      this.mixerOutput.gain.value = .82;
      this.mixerSum.connect(this.mixerSaturation);
      this.mixerSaturation.connect(this.mixerOutput);
      for (let index = 1; index <= 4; index += 1) {
        const input = ctx.createGain();
        input.gain.value = .5;
        input.connect(this.mixerSum);
        this.mixerInputs.push(input);
        this.inputs.set(`mixer-in${index}`, { node: input, signal: "audio", role: "audioInput" });
      }
      this.outputs.set("mixer-out", { node: this.mixerOutput, signal: "audio", role: "audioBus" });
    }

    _buildFilter() {
      const ctx = this.context;
      this.filterInput = ctx.createGain();
      this.filterDrive = ctx.createGain();
      this.filterSaturation = ctx.createWaveShaper();
      this.filterSaturation.curve = softClipCurve(1.45);
      this.filterSaturation.oversample = "4x";
      this.filterStages = [ctx.createBiquadFilter(), ctx.createBiquadFilter()];
      this.filterOutput = ctx.createGain();
      this.filterInput.connect(this.filterDrive);
      this.filterDrive.connect(this.filterSaturation);
      this.filterSaturation.connect(this.filterStages[0]);
      this.filterStages[0].connect(this.filterStages[1]);
      this.filterStages[1].connect(this.filterOutput);
      this.filterStages.forEach((filter) => {
        filter.type = "lowpass";
        filter.frequency.value = 1250;
        filter.Q.value = 3.25;
      });
      this.inputs.set("filter-in", { node: this.filterInput, signal: "audio", role: "audioInput" });
      this.inputs.set("filter-cutoff", { params: this.filterStages.map((stage) => stage.frequency), signal: "cv", role: "filterCutoff" });
      this.outputs.set("filter-out", { node: this.filterOutput, signal: "audio", role: "audioBus" });
    }

    _buildEnvelopes() {
      [1, 2].forEach((index) => {
        const source = this.context.createConstantSource();
        source.offset.value = 0;
        source.start();
        const envelope = { index, source, param: source.offset, gateCount: 0, lastLevel: 0 };
        this.envelopes[`env${index}`] = envelope;
        this.outputs.set(`env${index}-out`, { node: source, signal: "cv", role: "envelope", envelopeIndex: index });
        this.inputs.set(`env${index}-gate`, { signal: "gate", role: "envelopeGate", envelopeIndex: index });
      });
    }

    _buildVca() {
      const ctx = this.context;
      this.vcaInput = ctx.createGain();
      this.vca = ctx.createGain();
      this.vcaOutput = ctx.createGain();
      this.vca.gain.value = 0;
      this.vcaOutput.gain.value = .92;
      this.vcaInput.connect(this.vca);
      this.vca.connect(this.vcaOutput);
      this.inputs.set("vca-in", { node: this.vcaInput, signal: "audio", role: "audioInput" });
      this.inputs.set("vca-cv", { params: [this.vca.gain], signal: "cv", role: "vcaGain" });
      this.outputs.set("vca-out", { node: this.vcaOutput, signal: "audio", role: "audioBus" });
    }

    _buildControllers() {
      this.keyboardCV = this.context.createConstantSource();
      this.keyboardCV.offset.value = 0;
      this.keyboardCV.start();
      this.sequencerCV = this.context.createConstantSource();
      this.sequencerCV.offset.value = 0;
      this.sequencerCV.start();
      this.outputs.set("keyboard-cv", { node: this.keyboardCV, signal: "cv", role: "pitch" });
      this.outputs.set("sequencer-cv", { node: this.sequencerCV, signal: "cv", role: "pitch" });
      this.outputs.set("keyboard-gate", { signal: "gate", role: "gate" });
      this.outputs.set("sequencer-gate", { signal: "gate", role: "gate" });
    }

    _registerOutputInput() {
      this.inputs.set("output-in", { node: this.masterInput, signal: "audio", role: "audioInput" });
    }

    async setPower(on) {
      if (on) {
        await this.initialize();
        await this.context.resume();
        const now = this.context.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(this.knobs.getValue("masterVolume") ?? .42, now + .06);
        this.powered = true;
      } else if (this.ready) {
        const now = this.context.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + .04);
        await new Promise((resolve) => window.setTimeout(resolve, 55));
        await this.context.suspend();
        this.powered = false;
      }
      this.onStateChange?.(this.powered);
      return this.powered;
    }

    _linkScale(source, target) {
      if (target.role === "vcoPitch") {
        if (source.role === "pitch") return 1200;
        return this.knobs.getValue(`vco${target.voiceIndex}Mod`) ?? 35;
      }
      if (target.role === "filterCutoff") return this.knobs.getValue("filterMod") ?? 2600;
      if (target.role === "vcaGain") return this.knobs.getValue("vcaCvAmount") ?? .9;
      return 1;
    }

    connectPatch(from, to) {
      if (!this.ready) return false;
      const key = `${from}>${to}`;
      if (this.connections.has(key)) return true;
      const source = this.outputs.get(from);
      const target = this.inputs.get(to);
      if (!source || !target || source.signal !== target.signal) return false;

      const connection = { from, to, source, target, link: null };
      if (source.signal !== "gate") {
        const link = this.context.createGain();
        link.gain.value = this._linkScale(source, target);
        source.node.connect(link);
        if (target.node) link.connect(target.node);
        if (target.params) target.params.forEach((param) => link.connect(param));
        connection.link = link;
      }
      this.connections.set(key, connection);
      return true;
    }

    disconnectPatch(from, to) {
      const key = `${from}>${to}`;
      const connection = this.connections.get(key);
      if (!connection) return;
      if (connection.link) {
        try { connection.source.node.disconnect(connection.link); } catch (_) { /* already disconnected */ }
        try { connection.link.disconnect(); } catch (_) { /* already disconnected */ }
      }
      this.connections.delete(key);
    }

    disconnectAllPatches() {
      Array.from(this.connections.values()).forEach(({ from, to }) => this.disconnectPatch(from, to));
    }

    _setParam(param, value, glide = .012) {
      if (!this.ready) return;
      const now = this.context.currentTime;
      param.cancelScheduledValues(now);
      param.setTargetAtTime(value, now, Math.max(.001, glide));
    }

    _updateVco(index) {
      const voice = this.vcos[index - 1];
      if (!voice) return;
      const octave = this.knobs.getValue(`vco${index}Octave`) ?? 0;
      const tune = this.knobs.getValue(`vco${index}Tune`) ?? 0;
      const frequency = BASE_C3 * Math.pow(2, octave) * Math.pow(2, tune / 12);
      voice.baseFrequency = frequency;
      Object.values(voice.oscillators).forEach((osc) => this._setParam(osc.frequency, frequency, .008));
    }

    _refreshConnectionScales(role, voiceIndex) {
      this.connections.forEach((connection) => {
        if (!connection.link) return;
        if (role && connection.target.role !== role) return;
        if (voiceIndex && connection.target.voiceIndex !== voiceIndex) return;
        this._setParam(connection.link.gain, this._linkScale(connection.source, connection.target), .005);
      });
    }

    updateKnob(id, value) {
      if (!this.ready) return;
      if (/^vco[1-3](Octave|Tune)$/.test(id)) {
        this._updateVco(Number(id.charAt(3)));
      } else if (/^vco[1-3]Mod$/.test(id)) {
        this._refreshConnectionScales("vcoPitch", Number(id.charAt(3)));
      } else if (/^mix[1-4]$/.test(id)) {
        const index = Number(id.charAt(3)) - 1;
        this._setParam(this.mixerInputs[index].gain, value, .008);
      } else if (id === "lfoRate") {
        Object.values(this.lfo.oscillators).forEach((osc) => this._setParam(osc.frequency, value, .01));
      } else if (id === "lfoAmount") {
        Object.values(this.lfo.outputs).forEach((gain) => this._setParam(gain.gain, value, .01));
      } else if (id === "filterCutoff") {
        this.filterStages.forEach((filter) => this._setParam(filter.frequency, value, .008));
      } else if (id === "filterResonance") {
        this.filterStages.forEach((filter) => this._setParam(filter.Q, value / 2, .008));
      } else if (id === "filterDrive") {
        this._setParam(this.filterDrive.gain, value, .008);
      } else if (id === "filterMod") {
        this._refreshConnectionScales("filterCutoff");
      } else if (id === "vcaInitial") {
        this._setParam(this.vca.gain, value, .006);
      } else if (id === "vcaCvAmount") {
        this._refreshConnectionScales("vcaGain");
      } else if (id === "masterVolume" && this.powered) {
        this._setParam(this.masterGain.gain, value, .01);
      }
    }

    updateAllKnobs() {
      [1, 2, 3].forEach((index) => this._updateVco(index));
      [1, 2, 3, 4].forEach((index) => this.updateKnob(`mix${index}`, this.knobs.getValue(`mix${index}`)));
      ["lfoRate", "lfoAmount", "filterCutoff", "filterResonance", "filterDrive", "vcaInitial"].forEach((id) => this.updateKnob(id, this.knobs.getValue(id)));
    }

    _envelopeSettings(index) {
      return {
        attack: this.knobs.getValue(`env${index}Attack`) ?? .01,
        decay: this.knobs.getValue(`env${index}Decay`) ?? .2,
        sustain: this.knobs.getValue(`env${index}Sustain`) ?? .7,
        release: this.knobs.getValue(`env${index}Release`) ?? .3
      };
    }

    _holdParam(param, now) {
      if (typeof param.cancelAndHoldAtTime === "function") {
        param.cancelAndHoldAtTime(now);
      } else {
        const current = param.value;
        param.cancelScheduledValues(now);
        param.setValueAtTime(current, now);
      }
    }

    triggerEnvelope(index, on, velocity = 1) {
      if (!this.ready) return;
      const envelope = this.envelopes[`env${index}`];
      if (!envelope) return;
      const settings = this._envelopeSettings(index);
      const now = this.context.currentTime;
      const param = envelope.param;
      this._holdParam(param, now);
      if (on) {
        const peak = Math.min(1, Math.max(.05, velocity));
        param.linearRampToValueAtTime(peak, now + settings.attack);
        param.setTargetAtTime(settings.sustain * peak, now + settings.attack, Math.max(.004, settings.decay / 4));
      } else {
        param.setTargetAtTime(0, now, Math.max(.004, settings.release / 5));
        param.setValueAtTime(0, now + settings.release * 1.6);
      }
    }

    triggerGate(sourceJack, on, velocity = 1) {
      if (!this.ready) return;
      this.connections.forEach((connection) => {
        if (connection.from !== sourceJack || connection.target.role !== "envelopeGate") return;
        const key = `${sourceJack}>${connection.to}`;
        const count = this.gateState.get(key) || 0;
        if (on) {
          this.gateState.set(key, count + 1);
          if (count === 0) this.triggerEnvelope(connection.target.envelopeIndex, true, velocity);
        } else {
          const next = Math.max(0, count - 1);
          this.gateState.set(key, next);
          if (next === 0) this.triggerEnvelope(connection.target.envelopeIndex, false, velocity);
        }
      });
    }

    noteOn(midi, velocity = .92) {
      if (!this.ready) return;
      const note = Number(midi);
      const wasEmpty = this.keyboardNotes.size === 0;
      this.keyboardNotes.add(note);
      this.currentMidi = note;
      const target = (note - 48) / 12;
      const now = this.context.currentTime;
      const glide = this.knobs.getValue("glide") ?? .03;
      this.keyboardCV.offset.cancelScheduledValues(now);
      if (glide > .001) this.keyboardCV.offset.setTargetAtTime(target, now, Math.max(.002, glide / 4));
      else this.keyboardCV.offset.setValueAtTime(target, now);
      if (wasEmpty) this.triggerGate("keyboard-gate", true, velocity);
    }

    noteOff(midi) {
      if (!this.ready) return;
      this.keyboardNotes.delete(Number(midi));
      if (this.keyboardNotes.size === 0) {
        this.triggerGate("keyboard-gate", false);
      } else {
        const remaining = Array.from(this.keyboardNotes).at(-1);
        this.noteOn(remaining, .9);
      }
    }

    setSequencerPitch(semitones) {
      if (!this.ready) return;
      const now = this.context.currentTime;
      const value = Number(semitones) / 12;
      this.sequencerCV.offset.cancelScheduledValues(now);
      this.sequencerCV.offset.setTargetAtTime(value, now, .004);
    }

    sequencerGate(on, velocity = .85) {
      this.triggerGate("sequencer-gate", on, velocity);
    }

    panic() {
      this.keyboardNotes.clear();
      this.gateState.clear();
      if (!this.ready) return;
      const now = this.context.currentTime;
      Object.values(this.envelopes).forEach((envelope) => {
        envelope.param.cancelScheduledValues(now);
        envelope.param.setTargetAtTime(0, now, .006);
      });
      if (this.powered) {
        const target = this.knobs.getValue("masterVolume") ?? .42;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(0, now);
        this.masterGain.gain.linearRampToValueAtTime(target, now + .08);
      }
    }

    getAnalyser() {
      return this.analyser;
    }

    getDebugState() {
      return {
        ready: this.ready,
        powered: this.powered,
        contextState: this.context?.state || "none",
        sampleRate: this.context?.sampleRate || 0,
        connections: Array.from(this.connections.keys()),
        currentMidi: this.currentMidi,
        oscillatorCount: this.vcos.length * SHAPES.length,
        outputCount: this.outputs.size,
        inputCount: this.inputs.size
      };
    }
  }

  window.RealMoogAudioEngine = RealMoogAudioEngine;
})();

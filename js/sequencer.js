(function () {
  "use strict";

  class RealMoogSequencer {
    constructor(engine, knobs, options = {}) {
      this.engine = engine;
      this.knobs = knobs;
      this.onChange = options.onChange || (() => {});
      this.onNeedPower = options.onNeedPower || (async () => true);
      this.running = false;
      this.step = -1;
      this.timer = null;
      this.gateTimer = null;
      this.nextTickAt = 0;
      this.stepElements = Array.from(document.querySelectorAll(".step[data-step]"));
    }

    _duration() {
      const bpm = Math.max(30, this.knobs.getValue("tempo") || 112);
      return 60000 / bpm / 2;
    }

    _paintStep(index) {
      this.stepElements.forEach((element) => element.classList.toggle("active", Number(element.dataset.step) === index));
    }

    _tick() {
      if (!this.running) return;
      const now = performance.now();
      this.step = (this.step + 1) % 8;
      this._paintStep(this.step);
      const pitch = this.knobs.getValue(`step${this.step + 1}`) || 0;
      this.engine.setSequencerPitch(pitch);
      this.engine.sequencerGate(true, .84);
      window.clearTimeout(this.gateTimer);
      const duration = this._duration();
      this.gateTimer = window.setTimeout(() => this.engine.sequencerGate(false), duration * .58);
      this.nextTickAt = Math.max(this.nextTickAt + duration, now + duration * .55);
      this.timer = window.setTimeout(() => this._tick(), Math.max(8, this.nextTickAt - performance.now()));
    }

    async start() {
      if (this.running) return true;
      const powered = await this.onNeedPower();
      if (!powered) return false;
      this.running = true;
      this.step = -1;
      this.nextTickAt = performance.now();
      this._tick();
      this.onChange(true);
      return true;
    }

    stop() {
      if (!this.running) return;
      this.running = false;
      window.clearTimeout(this.timer);
      window.clearTimeout(this.gateTimer);
      this.engine.sequencerGate(false);
      this.step = -1;
      this._paintStep(-1);
      this.onChange(false);
    }

    async toggle() {
      if (this.running) {
        this.stop();
        return false;
      }
      return this.start();
    }
  }

  window.RealMoogSequencer = RealMoogSequencer;
})();

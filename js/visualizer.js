(function () {
  "use strict";

  class RealMoogVisualizer {
    constructor(engine) {
      this.engine = engine;
      this.canvas = document.getElementById("scopeCanvas");
      this.context2d = this.canvas.getContext("2d");
      this.vu = document.getElementById("vuBar");
      this.timeData = null;
      this.frame = 0;
      this.lastWidth = 0;
      this.lastHeight = 0;
      this.running = false;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this._draw();
    }

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (width === this.lastWidth && height === this.lastHeight) return;
      this.canvas.width = width;
      this.canvas.height = height;
      this.lastWidth = width;
      this.lastHeight = height;
    }

    _grid(ctx, width, height) {
      ctx.fillStyle = "#080c08";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(104, 144, 86, .16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += width / 8) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = 0; y <= height; y += height / 4) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(151, 185, 112, .22)";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    _standby(ctx, width, height) {
      const glow = .4 + Math.sin(performance.now() / 850) * .15;
      ctx.fillStyle = `rgba(135, 166, 103, ${glow})`;
      ctx.font = `${Math.max(8, height * .09)}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.fillText("NO SIGNAL · POWER OFF", width / 2, height / 2 + 3);
      this.vu.style.height = "2%";
    }

    _wave(ctx, width, height, analyser) {
      if (!this.timeData || this.timeData.length !== analyser.fftSize) this.timeData = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(this.timeData);
      let sum = 0;
      let max = 0;
      for (let i = 0; i < this.timeData.length; i += 1) {
        const normalized = (this.timeData[i] - 128) / 128;
        sum += normalized * normalized;
        max = Math.max(max, Math.abs(normalized));
      }
      const rms = Math.sqrt(sum / this.timeData.length);
      const level = Math.min(1, Math.max(max * .78, rms * 2.8));
      this.vu.style.height = `${Math.max(2, level * 100)}%`;

      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(151, 205, 111, .8)";
      ctx.strokeStyle = "#9dcc79";
      ctx.lineWidth = Math.max(1.2, height / 75);
      ctx.beginPath();
      const stride = Math.max(1, Math.floor(this.timeData.length / width));
      for (let x = 0, index = 0; x < width && index < this.timeData.length; x += 1, index += stride) {
        const value = (this.timeData[index] - 128) / 128;
        const y = height / 2 + value * height * .43;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    _draw() {
      if (!this.running) return;
      this._resize();
      const ctx = this.context2d;
      const width = this.canvas.width;
      const height = this.canvas.height;
      this._grid(ctx, width, height);
      const analyser = this.engine.getAnalyser();
      if (!analyser || !this.engine.powered) this._standby(ctx, width, height);
      else this._wave(ctx, width, height, analyser);
      this.frame = requestAnimationFrame(() => this._draw());
    }
  }

  window.RealMoogVisualizer = RealMoogVisualizer;
})();

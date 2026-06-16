/**
 * ピクトグラミング実行エンジン
 * キャラクターの状態管理とブロック命令の実行
 */

class PictoEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reset();
  }

  reset() {
    const c = this.canvas;
    this.state = {
      x: c.width / 2,
      y: c.height / 2,
      dir: 0,          // 0=上, 90=右, 180=下, 270=左 (degrees)
      color: '#5b6ef5',
      trail: [],
      stamps: [],
    };
    this.logs = [];
    this._redraw();
  }

  // ブロック定義: type -> 実行関数
  get blockDefs() {
    return {
      'move-forward': (param) => this._move(param ?? 30),
      'move-back':    (param) => this._move(-(param ?? 30)),
      'turn-left':    (param) => { this.state.dir = (this.state.dir - (param ?? 90) + 360) % 360; },
      'turn-right':   (param) => { this.state.dir = (this.state.dir + (param ?? 90)) % 360; },
      'color-red':    ()      => { this.state.color = '#ff4d4d'; },
      'color-blue':   ()      => { this.state.color = '#4d9fff'; },
      'color-green':  ()      => { this.state.color = '#4dcc88'; },
      'stamp':        ()      => this._stamp(),
      'sound-beep':   ()      => this._playBeep(440, 0.1),
      'sound-tada':   ()      => this._playTada(),
      'wait':         (param) => new Promise(res => setTimeout(res, (param ?? 1) * 500)),
    };
  }

  // ブロック配列を順番に実行（repeat対応）
  async run(blocks, onStep, onLog) {
    this._log = onLog || (() => {});
    await this._runBlocks(blocks, onStep);
    this._log('✅ プログラム完了！', 'done');
  }

  async _runBlocks(blocks, onStep) {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (onStep) onStep(block.id);

      if (block.type === 'repeat') {
        const times = parseInt(block.param ?? 2, 10);
        const inner = blocks.slice(i + 1);
        for (let r = 0; r < times; r++) {
          this._log(`🔁 くりかえす (${r + 1}/${times})`, 'action');
          await this._runBlocks(inner, onStep);
        }
        // repeatブロック以降はループ内で処理済み → 終了
        break;
      }

      if (block.type === 'if') {
        // 簡易版: 常に真として実行（将来条件を拡張可能）
        this._log(`❓ もしも → 真として実行`, 'action');
        continue;
      }

      const fn = this.blockDefs[block.type];
      if (fn) {
        this._log(`${this._emoji(block.type)} ${block.label}`, 'action');
        await fn(parseInt(block.param, 10) || undefined);
        this._redraw();
        await this._wait(80);
      }
    }
  }

  _move(dist) {
    const rad = (this.state.dir - 90) * Math.PI / 180;
    const nx = this.state.x + Math.cos(rad) * dist;
    const ny = this.state.y + Math.sin(rad) * dist;
    this.state.trail.push({
      x1: this.state.x, y1: this.state.y,
      x2: nx, y2: ny,
      color: this.state.color
    });
    this.state.x = Math.max(10, Math.min(this.canvas.width - 10, nx));
    this.state.y = Math.max(10, Math.min(this.canvas.height - 10, ny));
  }

  _stamp() {
    this.state.stamps.push({
      x: this.state.x,
      y: this.state.y,
      color: this.state.color,
      dir: this.state.dir,
    });
  }

  _redraw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景グリッド
    ctx.strokeStyle = '#e8ecf8';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 軌跡
    for (const t of this.state.trail) {
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
    }

    // スタンプ
    for (const s of this.state.stamps) {
      this._drawChar(s.x, s.y, s.dir, s.color, 0.4);
    }

    // キャラクター
    this._drawChar(this.state.x, this.state.y, this.state.dir, this.state.color, 1.0);
  }

  _drawChar(x, y, dir, color, alpha) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate((dir * Math.PI) / 180);

    // 体
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 4, 10, 0, Math.PI * 2);
    ctx.fill();

    // 頭
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -8, 8, 0, Math.PI * 2);
    ctx.fill();

    // 目
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-3, -9, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -9, 2, 0, Math.PI * 2); ctx.fill();

    // 進行方向マーカー（鼻）
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -14, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  _emoji(type) {
    const m = {
      'move-forward': '⬆️', 'move-back': '⬇️',
      'turn-left': '↰', 'turn-right': '↱',
      'color-red': '🔴', 'color-blue': '🔵', 'color-green': '🟢',
      'stamp': '🖊️', 'sound-beep': '🔔', 'sound-tada': '🎉',
      'wait': '⏳', 'repeat': '🔁', 'if': '❓',
    };
    return m[type] || '▶';
  }

  _wait(ms) { return new Promise(res => setTimeout(res, ms)); }

  _playBeep(freq, duration) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { /* 音声API未対応の場合は無視 */ }
  }

  _playTada() {
    this._playBeep(523, 0.1);
    setTimeout(() => this._playBeep(659, 0.1), 120);
    setTimeout(() => this._playBeep(784, 0.25), 240);
  }
}

// グローバルに公開
window.PictoEngine = PictoEngine;

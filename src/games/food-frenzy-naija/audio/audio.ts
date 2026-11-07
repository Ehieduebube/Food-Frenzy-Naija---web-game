/**
 * Procedural sound effects and music (Web Audio API). No audio files are shipped:
 * every sound is synthesised, so nothing can fail to load and nothing is copyrighted.
 *
 * The AudioContext is created on the first user gesture (browser autoplay rules).
 */
import { MusicLoop } from './music';

export type SfxName =
  | 'swap'
  | 'invalid'
  | 'match'
  | 'special'
  | 'rocket'
  | 'blast'
  | 'fire'
  | 'obstacle'
  | 'click'
  | 'win'
  | 'lose'
  | 'coin'
  | 'star'
  | 'shuffle'
  | 'booster'
  | 'select';

/** A major-pentatonic ladder for rising combo notes (highlife-friendly). */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private music: MusicLoop | null = null;
  private sfxOn = true;
  private musicOn = true;
  private hidden = false;
  private lastPlay = new Map<SfxName, number>();

  /** Call from a user gesture. Safe to call often. */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.55;
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.16;
      this.musicBus.connect(this.master);
      const len = ctx.sampleRate;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.music = new MusicLoop(ctx, this.musicBus, this.noiseBuf);
    }
    // a tap while the game is hidden or paused by the host must not bring the sound back
    if (this.ctx.state === 'suspended' && !this.hidden) void this.ctx.resume().catch(() => {});
    this.syncMusic();
  }

  configure(opts: { sfx: boolean; music: boolean }): void {
    this.sfxOn = opts.sfx;
    this.musicOn = opts.music;
    this.syncMusic();
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend().catch(() => {});
    else void this.ctx.resume().catch(() => {});
    this.syncMusic();
  }

  private syncMusic(): void {
    if (!this.music) return;
    if (this.musicOn && !this.hidden) this.music.start();
    else this.music.stop();
  }

  dispose(): void {
    this.music?.stop();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.music = null;
  }

  // ───────────── building blocks ─────────────

  private tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, glideTo?: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(this.sfxBus!);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  /** Marimba-like bar: fundamental plus a bright, quickly decaying 4th partial. */
  private marimba(freq: number, start: number, gain = 0.32, dur = 0.42): void {
    this.tone(freq, start, dur, 'sine', gain);
    this.tone(freq * 4, start, dur * 0.25, 'sine', gain * 0.18);
    this.tone(freq * 2, start, dur * 0.5, 'triangle', gain * 0.12);
  }

  private noise(start: number, dur: number, gain: number, filter: BiquadFilterType, f0: number, f1?: number, q = 1): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = filter;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(f0, start);
    if (f1) filt.frequency.exponentialRampToValueAtTime(f1, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filt).connect(g).connect(this.sfxBus!);
    src.start(start, Math.random() * 0.5);
    src.stop(start + dur + 0.02);
  }

  // ───────────── public sounds ─────────────

  play(name: SfxName, level = 0): void {
    if (!this.sfxOn || !this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    // avoid stacking the same sound many times in one frame
    const last = this.lastPlay.get(name) ?? 0;
    if (t - last < 0.035 && name !== 'match') return;
    this.lastPlay.set(name, t);

    switch (name) {
      case 'click':
        this.tone(880, t, 0.06, 'sine', 0.18);
        this.tone(1320, t + 0.015, 0.04, 'sine', 0.08);
        break;
      case 'select':
        this.tone(600, t, 0.07, 'triangle', 0.14, 760);
        break;
      case 'swap':
        this.tone(320, t, 0.11, 'sine', 0.16, 560);
        this.noise(t, 0.09, 0.05, 'bandpass', 1200, 3000, 1.2);
        break;
      case 'invalid':
        this.tone(190, t, 0.12, 'triangle', 0.22, 130);
        this.tone(160, t + 0.11, 0.14, 'triangle', 0.18, 110);
        break;
      case 'match': {
        const step = PENTA[Math.min(level, PENTA.length - 1)];
        const f = midi(67 + step);
        this.marimba(f, t, 0.3);
        if (level >= 2) this.marimba(f * 1.5, t + 0.05, 0.14);
        this.noise(t, 0.05, 0.08, 'highpass', 3000);
        break;
      }
      case 'special':
        [0, 4, 7, 12].forEach((n, i) => this.tone(midi(79 + n), t + i * 0.045, 0.22, 'triangle', 0.13));
        this.noise(t, 0.3, 0.05, 'highpass', 6000);
        break;
      case 'rocket':
        this.noise(t, 0.38, 0.22, 'bandpass', 500, 5000, 2);
        this.tone(300, t, 0.3, 'sawtooth', 0.05, 1400);
        break;
      case 'blast':
        this.noise(t, 0.5, 0.42, 'lowpass', 1600, 90);
        this.tone(140, t, 0.45, 'sine', 0.42, 38);
        break;
      case 'fire':
        for (let i = 0; i < 9; i++) this.noise(t + Math.random() * 0.45, 0.04, 0.16, 'bandpass', 1500 + Math.random() * 2500, undefined, 3);
        this.noise(t, 0.6, 0.12, 'bandpass', 300, 2600, 0.8);
        break;
      case 'obstacle':
        this.noise(t, 0.09, 0.3, 'bandpass', 900, 600, 4);
        this.tone(230, t, 0.12, 'triangle', 0.2, 160);
        break;
      case 'shuffle':
        for (let i = 0; i < 5; i++) this.noise(t + i * 0.06, 0.08, 0.1, 'bandpass', 2000 + i * 300, undefined, 2);
        this.tone(400, t, 0.35, 'sine', 0.08, 800);
        break;
      case 'booster':
        [1, 2.76, 5.4].forEach((m) => this.tone(520 * m, t, 0.5, 'sine', 0.12 / m));
        this.noise(t, 0.12, 0.12, 'highpass', 4000);
        break;
      case 'coin':
        this.tone(midi(88), t, 0.12, 'square', 0.06);
        this.tone(midi(95), t + 0.07, 0.3, 'square', 0.06);
        this.tone(midi(95), t + 0.07, 0.3, 'sine', 0.12);
        break;
      case 'star':
        this.marimba(midi(76 + PENTA[level * 2 + 2]), t, 0.3, 0.6);
        this.tone(midi(88 + PENTA[level]), t + 0.03, 0.4, 'sine', 0.08);
        break;
      case 'win': {
        const notes = [60, 64, 67, 72, 76, 79];
        notes.forEach((n, i) => this.marimba(midi(n), t + i * 0.09, 0.28, 0.5));
        [72, 76, 79, 84].forEach((n) => this.tone(midi(n), t + 0.6, 1.1, 'triangle', 0.07));
        this.noise(t + 0.6, 0.6, 0.06, 'highpass', 7000);
        break;
      }
      case 'lose':
        [67, 64, 60, 55].forEach((n, i) => this.marimba(midi(n), t + i * 0.16, 0.22, 0.5));
        break;
    }
  }

  haptic(pattern: number | number[], enabled: boolean): void {
    if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

export const audio = new AudioEngine();

/**
 * A light, original highlife-flavoured groove: shaker, kick, talking-drum glides,
 * a walking bass and a bright palm-wine guitar arpeggio over I - IV - V - I.
 * Scheduled with a small look-ahead timer so it stays steady and cheap.
 */
const BPM = 104;
const STEPS_PER_BAR = 16;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// chords as MIDI roots with major triads (key of F)
const PROGRESSION = [53, 58, 60, 53]; // F, Bb, C, F
const GUITAR_PATTERN = [0, 7, 12, 16, 12, 7, 19, 12, 0, 7, 12, 16, 19, 16, 12, 7];
const GUITAR_STEPS = new Set([0, 2, 3, 5, 6, 8, 10, 11, 13, 14]);
const BASS_STEPS: Record<number, number> = { 0: 0, 3: 0, 6: 7, 8: 12, 11: 7, 14: 4 };
const KICK_STEPS = new Set([0, 6, 8, 11]);
const DRUM_STEPS: Record<number, [number, number]> = { 3: [210, 150], 7: [180, 240], 10: [240, 170], 15: [200, 260] };

export class MusicLoop {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private out: GainNode;

  constructor(
    private ctx: AudioContext,
    bus: GainNode,
    private noise: AudioBuffer,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(bus);
  }

  start(): void {
    if (this.timer) return;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(1, now + 1.2);
    this.nextTime = now + 0.1;
    this.timer = setInterval(() => this.schedule(), 30);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + 0.3);
  }

  private schedule(): void {
    if (this.ctx.state !== 'running') return;
    const stepDur = 60 / BPM / 4;
    // if the tab stalled, skip ahead instead of playing a burst of notes
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % STEPS_PER_BAR;
      if (this.step === 0) this.bar = (this.bar + 1) % PROGRESSION.length;
    }
  }

  private env(start: number, attack: number, peak: number, dur: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    g.connect(this.out);
    return g;
  }

  private osc(type: OscillatorType, f: number, start: number, dur: number, g: GainNode, glide?: number): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, start);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, start + dur * 0.8);
    o.connect(g);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  private playStep(step: number, t: number, stepDur: number): void {
    const root = PROGRESSION[this.bar];
    // shaker
    {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 6500;
      const accent = step % 4 === 2 ? 0.16 : step % 2 === 0 ? 0.08 : 0.05;
      const g = this.env(t, 0.004, accent, 0.06);
      src.connect(f).connect(g);
      src.start(t, Math.random() * 0.5);
      src.stop(t + 0.08);
    }
    if (KICK_STEPS.has(step)) this.osc('sine', 115, t, 0.22, this.env(t, 0.004, 0.55, 0.22), 42);
    const drum = DRUM_STEPS[step];
    if (drum) this.osc('sine', drum[0], t, 0.2, this.env(t, 0.005, 0.22, 0.2), drum[1]);
    if (step in BASS_STEPS) {
      const n = root - 12 + BASS_STEPS[step];
      this.osc('triangle', midi(n), t, stepDur * 2.2, this.env(t, 0.01, 0.38, stepDur * 2.2));
    }
    if (GUITAR_STEPS.has(step)) {
      const n = root + 12 + GUITAR_PATTERN[step];
      const g = this.env(t, 0.003, 0.11, 0.32);
      this.osc('triangle', midi(n), t, 0.32, g);
      this.osc('sine', midi(n) * 2, t, 0.12, this.env(t, 0.003, 0.03, 0.12));
    }
  }
}

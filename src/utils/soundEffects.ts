// Clean Web Audio API sound synthesizer for platform notifications & execution chimes
class SoundEffects {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Read user preference
    const saved = localStorage.getItem("platform_sound_effects");
    this.enabled = saved !== "false";
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem("platform_sound_effects", val ? "true" : "false");
  }

  // Soft high-tech ping for confluence alerts
  public playAlert() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.15); // A6

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch {
      // Ignore audio context failures
    }
  }

  // Upbeat two-tone chime for trade execution
  public playOrderExecuted(direction: 'BUY' | 'SELL' = 'BUY') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      const startFreq = direction === 'BUY' ? 523.25 : 659.25; // C5 or E5
      const endFreq = direction === 'BUY' ? 783.99 : 440; // G5 or A4

      osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {
      // Ignore audio context failures
    }
  }

  // Crisp multi-tone chime for real live broker order execution
  public playLiveOrderExecuted(direction: 'BUY' | 'SELL' = 'BUY') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Two-phase affirmative chord
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      if (direction === 'BUY') {
        osc1.frequency.setValueAtTime(523.25, t); // C5
        osc1.frequency.exponentialRampToValueAtTime(1046.50, t + 0.22); // C6
        osc2.frequency.setValueAtTime(659.25, t); // E5
        osc2.frequency.exponentialRampToValueAtTime(1318.51, t + 0.22); // E6
      } else {
        osc1.frequency.setValueAtTime(880, t); // A5
        osc1.frequency.exponentialRampToValueAtTime(587.33, t + 0.22); // D5
        osc2.frequency.setValueAtTime(698.46, t); // F5
        osc2.frequency.exponentialRampToValueAtTime(440, t + 0.22); // A4
      }

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.4);
      osc2.stop(t + 0.4);
    } catch {
      // Ignore audio context failures
    }
  }

  // Warning tone for Loss Protection Shield trigger
  public playShieldWarning() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(330, this.ctx.currentTime); // E4
      osc.frequency.setValueAtTime(293.66, this.ctx.currentTime + 0.1); // D4

      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch {
      // Ignore audio context failures
    }
  }
}

export const soundEffects = new SoundEffects();

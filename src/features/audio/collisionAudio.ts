import type { CollisionEvent } from "../physics/types";

export class CollisionAudio {
  private context: AudioContext | null = null;
  private lastHitAt = 0;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async unlock(): Promise<void> {
    if (!this.enabled) return;

    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextCtor) return;

    this.context ??= new AudioContextCtor();

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  playCollisions(events: readonly CollisionEvent[]): void {
    if (!this.enabled || !this.context || this.context.state !== "running") return;

    const now = this.context.currentTime;
    if (events.length === 0 || now - this.lastHitAt < 0.035) return;

    const strongest = events.reduce((best, event) => (event.impulse > best.impulse ? event : best), events[0]!);
    const impulse = Math.min(1, Math.max(0.04, strongest.impulse));
    const pan = Math.max(-0.85, Math.min(0.85, strongest.point[0] * 0.9));
    const pitch = 130 + impulse * 520 + Math.abs(strongest.point[2]) * 80;

    this.lastHitAt = now;
    this.playImpulse(now, pitch, impulse, pan);
  }

  playTear(amount: number): void {
    if (!this.enabled || !this.context || this.context.state !== "running") return;

    const now = this.context.currentTime;
    const impulse = Math.min(1, 0.18 + amount * 0.035);
    this.lastHitAt = now;
    this.playImpulse(now, 780 + amount * 8, impulse, 0);
  }

  private playImpulse(start: number, frequency: number, impulse: number, pan: number): void {
    if (!this.context) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const panner = this.context.createStereoPanner();

    oscillator.type = impulse > 0.5 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(80, frequency * 0.45), start + 0.16);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900 + impulse * 2600, start);
    filter.Q.setValueAtTime(0.8, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.045 * impulse, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    panner.pan.setValueAtTime(pan, start);
    oscillator.connect(filter).connect(gain).connect(panner).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.24);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

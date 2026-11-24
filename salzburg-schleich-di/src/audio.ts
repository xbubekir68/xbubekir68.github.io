import { PowerUpKind } from './types';

/**
 * Purely procedural, strictly non-musical foley & nature sound synthesizer.
 * Zero background music, zero melodies, zero jingles, zero musical notes.
 * Synthesizes footsteps on stone/gravel/roof, wind, rain, flowing river water,
 * bicycle tyre friction, umbrella fabric rustle, pretzel crunch, and wood collision thuds.
 */
export class NaturalSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;

  private windGain: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rumbleGain: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;

  private muted: boolean;
  private unlocked = false;
  private effectsVolume = 0.8;
  private voiceVolume = 0;
  public setVolumes(effects: number, voices: number): void {
    this.effectsVolume = effects; this.voiceVolume = voices; this.setMuted(this.muted);
    if (voices === 0) this.stopVoice();
  }
  public stopVoice(): void { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
  public speak(text: string): void {
    if (this.muted || this.voiceVolume <= 0 || !('speechSynthesis' in window)) return;
    this.stopVoice(); const speech = new SpeechSynthesisUtterance(text); speech.lang = 'de-AT'; speech.volume = this.voiceVolume;
    window.speechSynthesis.speak(speech);
  }
  private stepToggle = false;
  private chainTimer = 0;

  constructor(initiallyMuted = false) {
    this.muted = initiallyMuted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.stopVoice();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.effectsVolume, this.ctx.currentTime, 0.03);
    }
  }

  /**
   * Must only be called in response to a direct user interaction.
   */
  public unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.effectsVolume;
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createWhiteNoiseBuffer(this.ctx, 2.5);
      this.brownBuffer = this.createBrownNoiseBuffer(this.ctx, 3.0);
      this.setupAmbientLoops();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.unlocked = true;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.025 * white) / 1.025;
      data[i] = Math.max(-1, Math.min(1, last * 3.4));
    }
    return buffer;
  }

  private setupAmbientLoops(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || !this.brownBuffer) return;

    // 1. Gentle evening wind loop
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = this.brownBuffer;
    windSrc.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 340;
    windFilter.Q.value = 0.7;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSrc.start();

    // 2. Flowing Salzach / fountain water loop
    const waterSrc = this.ctx.createBufferSource();
    waterSrc.buffer = this.noiseBuffer;
    waterSrc.loop = true;
    const waterFilter = this.ctx.createBiquadFilter();
    waterFilter.type = 'bandpass';
    waterFilter.frequency.value = 780;
    waterFilter.Q.value = 0.55;
    this.waterGain = this.ctx.createGain();
    this.waterGain.gain.value = 0;
    waterSrc.connect(waterFilter);
    waterFilter.connect(this.waterGain);
    this.waterGain.connect(this.masterGain);
    waterSrc.start();

    // 3. Schnürlregen drizzle patter loop
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = this.noiseBuffer;
    rainSrc.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 2600;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    rainSrc.start();

    // 4. Bicycle tyres on cobblestone
    const rumbleSrc = this.ctx.createBufferSource();
    rumbleSrc.buffer = this.brownBuffer;
    rumbleSrc.loop = true;
    this.rumbleFilter = this.ctx.createBiquadFilter();
    this.rumbleFilter.type = 'lowpass';
    this.rumbleFilter.frequency.value = 125;
    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;
    rumbleSrc.connect(this.rumbleFilter);
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.masterGain);
    rumbleSrc.start();
  }

  public updateContinuous(params: {
    active: boolean;
    speedRatio: number;
    dangerRatio: number;
    hasWater: boolean;
    hasRain: boolean;
    gliding: boolean;
    dt: number;
  }): void {
    if (!this.unlocked || !this.ctx || !this.windGain || !this.waterGain || !this.rainGain || !this.rumbleGain || !this.rumbleFilter) {
      return;
    }

    const now = this.ctx.currentTime;
    if (!params.active || this.muted) {
      this.windGain.gain.setTargetAtTime(0, now, 0.08);
      this.waterGain.gain.setTargetAtTime(0, now, 0.08);
      this.rainGain.gain.setTargetAtTime(0, now, 0.08);
      this.rumbleGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const windLevel = (params.gliding ? 0.14 : 0.055) + params.speedRatio * 0.045;
    const waterLevel = params.hasWater ? 0.042 : 0.0;
    const rainLevel = params.hasRain ? 0.018 : 0.0;
    const rumbleLevel = params.dangerRatio * (0.07 + params.speedRatio * 0.04);

    this.windGain.gain.setTargetAtTime(windLevel, now, 0.12);
    this.waterGain.gain.setTargetAtTime(waterLevel, now, 0.25);
    this.rainGain.gain.setTargetAtTime(rainLevel, now, 0.25);
    this.rumbleGain.gain.setTargetAtTime(rumbleLevel, now, 0.09);
    this.rumbleFilter.frequency.setTargetAtTime(105 + params.speedRatio * 55 + params.dangerRatio * 45, now, 0.1);

    // Small irregular chain clicks
    this.chainTimer -= params.dt * (1 + params.dangerRatio * 0.9);
    if (this.chainTimer <= 0) {
      this.chainTimer = 0.28 + Math.random() * 0.35;
      this.triggerNoiseBurst({
        duration: 0.025,
        filterType: 'bandpass',
        freq: 3800 + Math.random() * 1400,
        q: 2.2,
        gain: 0.014 + params.dangerRatio * 0.018,
      });
    }
  }

  public playFootstep(surface: 'stone' | 'gravel' | 'roof' | 'wood'): void {
    if (!this.canPlay()) return;
    this.stepToggle = !this.stepToggle;
    const jitter = (this.stepToggle ? 1 : 0.92) * (0.95 + Math.random() * 0.1);

    if (surface === 'gravel') {
      this.triggerNoiseBurst({
        duration: 0.055,
        filterType: 'bandpass',
        freq: 1650 * jitter,
        q: 0.9,
        gain: 0.075,
      });
      return;
    }

    const baseFreq = surface === 'roof' ? 140 : surface === 'wood' ? 115 : 105;
    // Crisp stone/tile heel tap: damped non-tonal impact + grit scuff
    this.triggerImpactThud(baseFreq * jitter, 38, 0.032, 0.085);
    this.triggerNoiseBurst({
      duration: 0.028,
      filterType: 'bandpass',
      freq: (surface === 'roof' ? 1900 : 1350) * jitter,
      q: 1.4,
      gain: 0.048,
    });
  }

  public playJump(): void {
    if (!this.canPlay()) return;
    // Shoe push-off + cloth movement whoosh
    this.triggerImpactThud(130, 52, 0.045, 0.09);
    this.triggerNoiseSweep(450, 1200, 0.11, 0.055);
  }

  public playSlide(): void {
    if (!this.canPlay()) return;
    // Cobblestone sole slide friction
    this.triggerNoiseSweep(1400, 520, 0.26, 0.075);
  }

  public playLaneShift(): void {
    if (!this.canPlay()) return;
    this.triggerNoiseSweep(620, 920, 0.065, 0.032);
  }

  public playPretzelCollect(): void {
    if (!this.canPlay()) return;
    // Dry crusty pretzel crunch + paper bag rustle (strictly non-musical)
    this.triggerNoiseBurst({
      duration: 0.024,
      filterType: 'bandpass',
      freq: 2450 + Math.random() * 350,
      q: 1.5,
      gain: 0.095,
    });
    this.triggerNoiseBurst({
      duration: 0.03,
      filterType: 'highpass',
      freq: 3400,
      q: 0.8,
      gain: 0.07,
      delay: 0.024,
    });
  }

  public playUmbrellaOpen(): void {
    if (!this.canPlay()) return;
    // Distinct fabric canopy rustle & wooden latch snap
    this.triggerNoiseSweep(520, 2600, 0.19, 0.12);
    this.triggerNoiseBurst({
      duration: 0.07,
      filterType: 'bandpass',
      freq: 1850,
      q: 1.1,
      gain: 0.09,
      delay: 0.08,
    });
  }

  public playPowerUpPick(kind: PowerUpKind): void {
    if (!this.canPlay()) return;
    if (kind === 'umbrella') {
      this.playUmbrellaOpen();
    } else if (kind === 'watch') {
      // Crisp mechanical pocket-watch escapement clicks (no musical pitch)
      for (let i = 0; i < 3; i++) {
        this.triggerNoiseBurst({
          duration: 0.012,
          filterType: 'bandpass',
          freq: i % 2 === 0 ? 4200 : 3500,
          q: 3.5,
          gain: 0.09,
          delay: i * 0.055,
        });
      }
    } else {
      // Mechanical magnet snap & cardboard rustle
      this.triggerImpactThud(165, 65, 0.04, 0.1);
      this.triggerNoiseBurst({
        duration: 0.035,
        filterType: 'bandpass',
        freq: 2100,
        q: 2.0,
        gain: 0.08,
        delay: 0.02,
      });
    }
  }

  public playCollision(fatal: boolean): void {
    if (!this.canPlay()) return;
    // Heavy wooden crate thud + parcel cardboard crunch
    this.triggerImpactThud(fatal ? 88 : 112, 28, fatal ? 0.22 : 0.13, fatal ? 0.28 : 0.2);
    this.triggerNoiseBurst({
      duration: fatal ? 0.24 : 0.12,
      filterType: 'lowpass',
      freq: 920,
      q: 0.8,
      gain: fatal ? 0.16 : 0.12,
    });
    if (fatal) {
      // Cardboard and parcel contents scatter
      this.triggerNoiseSweep(1600, 260, 0.34, 0.12);
    }
  }

  public playUiClick(): void {
    if (!this.canPlay()) return;
    this.triggerNoiseBurst({
      duration: 0.015,
      filterType: 'bandpass',
      freq: 2200,
      q: 2.0,
      gain: 0.05,
    });
  }

  private canPlay(): boolean {
    return Boolean(this.unlocked && !this.muted && this.ctx && this.masterGain && this.noiseBuffer);
  }

  private triggerImpactThud(startFreq: number, endFreq: number, duration: number, peakGain: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private triggerNoiseBurst(opts: {
    duration: number;
    filterType: BiquadFilterType;
    freq: number;
    q: number;
    gain: number;
    delay?: number;
  }): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const start = this.ctx.currentTime + (opts.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const maxOffset = Math.max(0, this.noiseBuffer.duration - opts.duration - 0.05);
    const offset = Math.random() * maxOffset;

    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.filterType;
    filter.frequency.setValueAtTime(opts.freq, start);
    filter.Q.setValueAtTime(opts.q, start);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(opts.gain, start);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + opts.duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(start, offset, opts.duration);
  }

  private triggerNoiseSweep(startFreq: number, endFreq: number, duration: number, peakGain: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, endFreq), now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.002, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 0.8, duration);
  }
}

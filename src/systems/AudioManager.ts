export interface PlaybackHandle {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export interface PlayOptions {
  volume?: number;
  loop?: boolean;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private musicSource: PlaybackHandle | null = null;
  private initialized = false;
  private masterGain: GainNode | null = null;

  init(): void {
    if (this.initialized) return;
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.initialized = true;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  async loadSound(name: string, url: string): Promise<void> {
    if (!this.initialized || !this.context) return;
    try {
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(name, audioBuffer);
    } catch {
      // Sound file not found — silently skip
    }
  }

  /** Generate all game sounds synthetically so no WAV files are needed */
  generateSounds(): void {
    if (!this.context) return;
    const ctx = this.context;
    const rate = ctx.sampleRate;

    const makeBuffer = (duration: number, fill: (data: Float32Array, rate: number) => void): AudioBuffer => {
      const buf = ctx.createBuffer(1, Math.ceil(rate * duration), rate);
      const data = buf.getChannelData(0);
      fill(data, rate);
      return buf;
    };

    // Pistol: short noise burst with pitch drop
    this.buffers.set('pistol', makeBuffer(0.15, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const env = Math.exp(-t * 30);
        d[i] = (Math.random() * 2 - 1) * env * 0.8;
      }
    }));

    // Machine gun: shorter, sharper burst
    this.buffers.set('machinegun', makeBuffer(0.1, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const env = Math.exp(-t * 40);
        d[i] = (Math.random() * 2 - 1) * env * 0.9;
      }
    }));

    // Knife: whoosh
    this.buffers.set('knife', makeBuffer(0.2, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const env = Math.sin(t * Math.PI / 0.2) * Math.exp(-t * 10);
        const freq = 200 + t * 800;
        d[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.3 + (Math.random() * 2 - 1) * env * 0.15;
      }
    }));

    // Door open: low grinding
    this.buffers.set('door_open', makeBuffer(0.5, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const env = Math.min(1, t * 10) * Math.exp(-t * 3);
        d[i] = (Math.random() * 2 - 1) * env * 0.25 + Math.sin(2 * Math.PI * 80 * t) * env * 0.3;
      }
    }));

    // Pickup: cheerful rising tone
    this.buffers.set('pickup', makeBuffer(0.25, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const env = Math.exp(-t * 8);
        const freq = 600 + t * 1200;
        d[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.4;
      }
    }));

    // Enemy die: descending noise
    this.buffers.set('enemy_die', makeBuffer(0.4, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const env = Math.exp(-t * 5);
        const freq = 300 - t * 400;
        d[i] = Math.sin(2 * Math.PI * Math.max(freq, 50) * t) * env * 0.5 + (Math.random() * 2 - 1) * env * 0.2;
      }
    }));

    // Player pain: harsh low hit
    this.buffers.set('player_pain', makeBuffer(0.3, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const env = Math.exp(-t * 10);
        d[i] = Math.sin(2 * Math.PI * 150 * t) * env * 0.6 + (Math.random() * 2 - 1) * env * 0.3;
      }
    }));

    // Secret: ascending arpeggio
    this.buffers.set('secret', makeBuffer(0.5, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const note = Math.floor(t * 8) % 4;
        const freqs = [523, 659, 784, 1047];
        const env = Math.exp(-(t % 0.125) * 16) * Math.exp(-t * 3);
        d[i] = Math.sin(2 * Math.PI * freqs[note] * t) * env * 0.35;
      }
    }));

    // No key: two low buzzes
    this.buffers.set('no_key', makeBuffer(0.3, (d, r) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / r;
        const pulse = t < 0.12 || (t > 0.16 && t < 0.28) ? 1 : 0;
        const env = pulse * Math.exp(-(t % 0.16) * 15);
        d[i] = Math.sin(2 * Math.PI * 120 * t) * env * 0.5;
      }
    }));
  }

  play(name: string, options: PlayOptions = {}): PlaybackHandle | undefined {
    if (!this.initialized || !this.context) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;

    const { volume = 1.0, loop = false } = options;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = this.context.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.masterGain ?? this.context.destination);
    source.start(0);

    return { source, gain };
  }

  playSpatial(name: string, listenerX: number, listenerZ: number, sourceX: number, sourceZ: number, maxDist = 20): void {
    const dx = sourceX - listenerX;
    const dz = sourceZ - listenerZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > maxDist) return;

    const volume = Math.max(0, 1 - dist / maxDist);
    this.play(name, { volume });
  }

  playMusic(name: string): void {
    if (this.musicSource) {
      this.musicSource.source.stop();
    }
    this.musicSource = this.play(name, { volume: 0.5, loop: true }) ?? null;
  }

  stopMusic(): void {
    if (this.musicSource) {
      this.musicSource.source.stop();
      this.musicSource = null;
    }
  }
}

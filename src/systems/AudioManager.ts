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

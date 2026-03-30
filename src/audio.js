export class AudioManager {
    constructor() {
        this.context = null;
        this.buffers = new Map();
        this.musicSource = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.context = new AudioContext();
        this.initialized = true;
    }

    async loadSound(name, url) {
        if (!this.initialized) return;
        try {
            const resp = await fetch(url);
            const arrayBuffer = await resp.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.buffers.set(name, audioBuffer);
        } catch {
            // Sound file not found — silently skip
        }
    }

    play(name, options = {}) {
        if (!this.initialized) return;
        const buffer = this.buffers.get(name);
        if (!buffer) return;

        const { volume = 1.0, loop = false } = options;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        const gain = this.context.createGain();
        gain.gain.value = volume;

        source.connect(gain);
        gain.connect(this.context.destination);
        source.start(0);

        return { source, gain };
    }

    playSpatial(name, listenerX, listenerZ, sourceX, sourceZ, maxDist = 20) {
        const dx = sourceX - listenerX;
        const dz = sourceZ - listenerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > maxDist) return;

        const volume = Math.max(0, 1 - dist / maxDist);
        this.play(name, { volume });
    }

    playMusic(name) {
        if (this.musicSource) {
            this.musicSource.source.stop();
        }
        this.musicSource = this.play(name, { volume: 0.5, loop: true });
    }

    stopMusic() {
        if (this.musicSource) {
            this.musicSource.source.stop();
            this.musicSource = null;
        }
    }
}

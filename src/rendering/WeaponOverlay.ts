import { WeaponId, WEAPON_NAMES } from '../core/constants.js';
import type { VSwapLoader } from '../assets/VSwapLoader.js';

/** VSWAP sprite indices for weapon frames (5 per weapon: idle + 4 attack) */
const WEAPON_VSWAP: Record<string, { base: number }> = {
  knife:      { base: 416 },
  pistol:     { base: 421 },
  machinegun: { base: 426 },
  chaingun:   { base: 431 },
};

export interface WeaponFrameSet {
  idle: HTMLCanvasElement;
  atk1: HTMLCanvasElement;
  atk2: HTMLCanvasElement;
  atk3: HTMLCanvasElement;
  atk4: HTMLCanvasElement;
}

export class WeaponOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentWeapon: WeaponId = WeaponId.Pistol;
  private animFrame = 0;
  private animTimer = 0;
  private firing = false;
  private weaponSprites: Record<string, WeaponFrameSet> = {};

  constructor() {
    const old = document.getElementById('weapon-overlay');
    if (old) old.remove();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'weapon-overlay';
    this.canvas.width = 320;
    this.canvas.height = 320;
    this.canvas.style.cssText = `
      position: absolute;
      bottom: clamp(48px, 6vh, 72px);
      left: 50%;
      transform: translateX(-50%);
      width: 50vw;
      height: 50vw;
      max-width: 640px;
      max-height: 640px;
      min-width: 280px;
      min-height: 280px;
      image-rendering: pixelated;
      pointer-events: none;
      z-index: 10;
    `;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  initSprites(vswap: VSwapLoader | null, proceduralFallback: (name: string, firing: boolean) => HTMLCanvasElement): void {
    const names = ['knife', 'pistol', 'machinegun', 'chaingun'];

    // Try VSWAP weapon sprites first
    if (vswap) {
      let allOk = true;
      const sprites: Record<string, WeaponFrameSet> = {};
      for (const name of names) {
        const base = WEAPON_VSWAP[name]!.base;
        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < 5; i++) {
          const pixels = vswap.getSpriteTexture(base + i);
          if (!pixels) { allOk = false; break; }
          // Convert Uint8ClampedArray to canvas
          const c = document.createElement('canvas');
          c.width = 64; c.height = 64;
          const ctx = c.getContext('2d')!;
          const imgData = ctx.createImageData(64, 64);
          imgData.data.set(pixels);
          ctx.putImageData(imgData, 0, 0);
          frames.push(c);
        }
        if (!allOk) break;
        sprites[name] = { idle: frames[0]!, atk1: frames[1]!, atk2: frames[2]!, atk3: frames[3]!, atk4: frames[4]! };
      }
      if (allOk) {
        this.weaponSprites = sprites;
        return;
      }
    }

    // Fallback to procedural
    for (const name of names) {
      const idle = proceduralFallback(name, false);
      const fire = proceduralFallback(name, true);
      this.weaponSprites[name] = { idle, atk1: fire, atk2: fire, atk3: idle, atk4: idle };
    }
  }

  setWeapon(weapon: WeaponId): void {
    this.currentWeapon = weapon;
  }

  setFiring(firing: boolean): void {
    if (firing && !this.firing) {
      this.animFrame = 1;
      this.animTimer = 0;
    }
    this.firing = firing;
  }

  update(dt: number): void {
    if (this.animFrame > 0) {
      this.animTimer += dt;
      if (this.animTimer >= 0.1) {
        this.animTimer = 0;
        this.animFrame++;
        if (this.animFrame > 4) {
          this.animFrame = 0;
          this.firing = false;
        }
      }
    }
  }

  render(): void {
    const name = WEAPON_NAMES[this.currentWeapon] ?? 'pistol';
    const frameNames = ['idle', 'atk1', 'atk2', 'atk3', 'atk4'] as const;
    const frameName = frameNames[this.animFrame] ?? 'idle';
    const sprite = this.weaponSprites[name]?.[frameName];
    this.ctx.clearRect(0, 0, 320, 320);
    if (sprite) {
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(sprite, 0, 0, 320, 320);
    }
  }

  destroy(): void {
    this.canvas.remove();
  }
}

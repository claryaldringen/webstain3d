import { WeaponId } from '../core/constants.js';
import type { Player } from '../entities/Player.js';

type FaceState = 'healthy' | 'hurt1' | 'hurt2' | 'hurt3';

interface HUDElements {
  level: HTMLElement | null;
  score: HTMLElement | null;
  lives: HTMLElement | null;
  health: HTMLElement | null;
  ammo: HTMLElement | null;
  face: HTMLElement | null;
  keyGold: HTMLElement | null;
  keySilver: HTMLElement | null;
}

export class HUD {
  private readonly els: HUDElements;
  private lastHealth: number = -1;
  private lastWeapon: number = -1;

  private readonly faceCanvas: HTMLCanvasElement;
  private readonly faceCtx: CanvasRenderingContext2D;
  private readonly weaponIconCanvas: HTMLCanvasElement | null;
  private readonly weaponIconCtx: CanvasRenderingContext2D | null;

  constructor() {
    this.els = {
      level: document.getElementById('hud-level'),
      score: document.getElementById('hud-score'),
      lives: document.getElementById('hud-lives'),
      health: document.getElementById('hud-health'),
      ammo: document.getElementById('hud-ammo'),
      face: document.getElementById('hud-face'),
      keyGold: document.getElementById('hud-key-gold'),
      keySilver: document.getElementById('hud-key-silver'),
    };

    // Create canvas for procedural face
    this.faceCanvas = document.createElement('canvas');
    this.faceCanvas.width = 48;
    this.faceCanvas.height = 48;
    this.faceCtx = this.faceCanvas.getContext('2d')!;
    if (this.els.face) {
      this.els.face.style.backgroundSize = 'contain';
      this.els.face.style.imageRendering = 'pixelated';
    }

    // Weapon icon canvas
    const weaponEl = document.getElementById('hud-weapon-icon');
    this.weaponIconCanvas = weaponEl instanceof HTMLCanvasElement ? weaponEl : null;
    if (this.weaponIconCanvas) {
      this.weaponIconCtx = this.weaponIconCanvas.getContext('2d');
      this.weaponIconCanvas.style.imageRendering = 'pixelated';
    } else {
      this.weaponIconCtx = null;
    }
  }

  update(player: Player): void {
    if (this.els.score) this.els.score.textContent = String(player.score).padStart(6, '0');
    if (this.els.lives) this.els.lives.textContent = String(player.lives);
    if (this.els.health) this.els.health.textContent = player.health + '%';
    if (this.els.ammo) this.els.ammo.textContent = String(player.ammo);

    if (this.els.keyGold) this.els.keyGold.classList.toggle('active', player.keys['gold'] ?? false);
    if (this.els.keySilver) this.els.keySilver.classList.toggle('active', player.keys['silver'] ?? false);

    if (player.health !== this.lastHealth) {
      this.lastHealth = player.health;
      this.updateFace(player.health);
    }

    if (player.currentWeapon !== this.lastWeapon) {
      this.lastWeapon = player.currentWeapon;
      this.updateWeaponIcon(player.currentWeapon);
    }
  }

  private updateWeaponIcon(weaponId: WeaponId): void {
    if (!this.weaponIconCtx) return;
    const ctx = this.weaponIconCtx;
    const w = 64;
    const h = 48;
    ctx.clearRect(0, 0, w, h);

    // Dark blue background
    ctx.fillStyle = '#000060';
    ctx.fillRect(0, 0, w, h);

    // Draw weapon silhouette in dark color
    ctx.fillStyle = '#1a1a2a';

    if (weaponId === WeaponId.Knife) {
      // Knife silhouette
      ctx.fillRect(28, 4, 6, 30);  // blade
      ctx.fillRect(30, 2, 4, 4);   // tip
      ctx.fillRect(24, 32, 14, 4); // guard
      ctx.fillRect(28, 36, 8, 10); // handle
    } else if (weaponId === WeaponId.Pistol) {
      // Pistol silhouette (side view)
      ctx.fillRect(14, 14, 30, 8);  // barrel/slide
      ctx.fillRect(16, 22, 24, 6);  // frame
      ctx.fillRect(24, 28, 10, 14); // grip
      ctx.fillRect(18, 26, 8, 4);   // trigger guard
    } else if (weaponId === WeaponId.MachineGun) {
      // MP40 silhouette
      ctx.fillRect(8, 16, 40, 6);   // barrel+receiver
      ctx.fillRect(6, 14, 12, 4);   // barrel shroud
      ctx.fillRect(28, 22, 8, 12);  // grip
      ctx.fillRect(34, 20, 14, 6);  // stock
      ctx.fillRect(38, 26, 8, 8);   // stock butt
      ctx.fillRect(22, 22, 4, 14);  // magazine
    } else if (weaponId === WeaponId.Chaingun) {
      // Gatling silhouette
      ctx.fillRect(6, 12, 36, 8);   // barrel cluster
      ctx.fillRect(4, 10, 8, 4);    // muzzle
      ctx.fillRect(10, 10, 8, 4);   // muzzle 2
      ctx.fillRect(20, 20, 22, 8);  // receiver
      ctx.fillRect(30, 28, 10, 10); // stock
      ctx.fillRect(42, 20, 10, 18); // ammo belt
    }
  }

  private updateFace(health: number): void {
    const ctx = this.faceCtx;
    const w = 48;
    const h = 48;

    ctx.clearRect(0, 0, w, h);

    // Background matches HUD blue
    ctx.fillStyle = '#000060';
    ctx.fillRect(0, 0, w, h);

    if (health <= 0) {
      this.drawDeadFace(ctx, w, h);
    } else if (health > 75) {
      this.drawFace(ctx, w, h, 'healthy');
    } else if (health > 50) {
      this.drawFace(ctx, w, h, 'hurt1');
    } else if (health > 25) {
      this.drawFace(ctx, w, h, 'hurt2');
    } else {
      this.drawFace(ctx, w, h, 'hurt3');
    }

    if (this.els.face) {
      this.els.face.style.backgroundImage = `url(${this.faceCanvas.toDataURL()})`;
      this.els.face.style.backgroundColor = 'transparent';
    }
  }

  private drawFace(ctx: CanvasRenderingContext2D, w: number, h: number, state: FaceState): void {
    const px = 2;

    const skinColors: Record<FaceState, string> = {
      healthy: '#D8A878',
      hurt1: '#C89868',
      hurt2: '#B88858',
      hurt3: '#A87848',
    };
    const skinColor = skinColors[state];

    ctx.fillStyle = skinColor;
    for (let y = 8; y < 40; y += px) {
      const inset = y < 12 ? 8 : y < 16 ? 4 : y > 36 ? 8 : y > 32 ? 4 : 2;
      ctx.fillRect(inset, y, w - inset * 2, px);
    }

    // Hair - brown/auburn (like reference BJ)
    ctx.fillStyle = '#B06820';
    for (let x = 6; x < w - 6; x += px) {
      ctx.fillRect(x, 4, px, px);
      ctx.fillRect(x, 6, px, px);
    }
    for (let x = 4; x < w - 4; x += px) {
      ctx.fillRect(x, 8, px, px);
    }
    ctx.fillRect(4, 10, px * 2, 8);
    ctx.fillRect(w - 8, 10, px * 2, 8);

    // Eyes - blue
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(12, 18, 8, 6);
    ctx.fillRect(28, 18, 8, 6);
    ctx.fillStyle = '#4488CC';
    ctx.fillRect(16, 18, 4, 6);
    ctx.fillRect(32, 18, 4, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(16, 20, 2, 4);
    ctx.fillRect(32, 20, 2, 4);

    // Nose
    ctx.fillStyle = '#C09060';
    ctx.fillRect(22, 24, 4, 6);

    if (state === 'healthy') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(14, 32, 20, 2);
      ctx.fillRect(16, 34, 16, 2);
      ctx.fillStyle = '#C06060';
      ctx.fillRect(18, 34, 12, 2);
    } else if (state === 'hurt1') {
      ctx.fillStyle = '#804040';
      ctx.fillRect(16, 32, 16, 2);
    } else if (state === 'hurt2') {
      ctx.fillStyle = '#600000';
      ctx.fillRect(18, 30, 12, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(20, 30, 2, 2);
      ctx.fillRect(26, 30, 2, 2);
    } else if (state === 'hurt3') {
      ctx.fillStyle = '#600000';
      ctx.fillRect(16, 30, 16, 6);
      ctx.fillStyle = '#CC0000';
      ctx.fillRect(14, 28, 4, 4);
      ctx.fillRect(34, 22, 4, 6);
      ctx.fillStyle = '#AA0000';
      ctx.fillRect(14, 32, 4, 6);
    }

    if (state === 'hurt2' || state === 'hurt3') {
      ctx.fillStyle = '#CC0000';
      ctx.fillRect(8, 14, 2, 4);
      if (state === 'hurt3') {
        ctx.fillRect(36, 16, 4, 6);
        ctx.fillRect(10, 26, 2, 8);
      }
    }
  }

  private drawDeadFace(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const px = 2;
    ctx.fillStyle = '#908070';
    for (let y = 8; y < 40; y += px) {
      const inset = y < 12 ? 8 : y < 16 ? 4 : y > 36 ? 8 : y > 32 ? 4 : 2;
      ctx.fillRect(inset, y, w - inset * 2, px);
    }
    ctx.fillStyle = '#907828';
    for (let x = 6; x < w - 6; x += px) {
      ctx.fillRect(x, 4, px, px);
      ctx.fillRect(x, 6, px, px);
    }
    ctx.fillStyle = '#600000';
    ctx.fillRect(12, 18, 2, 2); ctx.fillRect(18, 18, 2, 2);
    ctx.fillRect(14, 20, 2, 2); ctx.fillRect(16, 20, 2, 2);
    ctx.fillRect(12, 22, 2, 2); ctx.fillRect(18, 22, 2, 2);
    ctx.fillRect(28, 18, 2, 2); ctx.fillRect(34, 18, 2, 2);
    ctx.fillRect(30, 20, 2, 2); ctx.fillRect(32, 20, 2, 2);
    ctx.fillRect(28, 22, 2, 2); ctx.fillRect(34, 22, 2, 2);
    ctx.fillStyle = '#400000';
    ctx.fillRect(16, 32, 16, 4);
    ctx.fillStyle = '#AA0000';
    ctx.fillRect(8, 14, 4, 8);
    ctx.fillRect(36, 16, 4, 10);
    ctx.fillRect(14, 36, 20, 4);
    ctx.fillRect(10, 28, 4, 10);
  }
}

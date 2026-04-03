import * as THREE from 'three';
import { WALL_HEIGHT } from '../core/constants.js';
import { ENEMY_SPRITE_BASE } from '../sprites/SpriteConfig.js';
import type { VSwapLoader } from '../assets/VSwapLoader.js';
import type { EnemySnapshot } from '../../shared/protocol.js';

const WALK_FRAMES = ['walk1', 'walk2', 'walk3', 'walk4'] as const;
const ATTACK_FRAMES = ['shoot1', 'shoot2', 'shoot3'] as const;
const DEATH_FRAMES = ['die1', 'die2', 'die3', 'dead'] as const;
const ANIM_SPEED = 6; // frames per second

interface EnemyVisual {
  sprite: THREE.Sprite;
  type: string;
  lastState: number;
  animTimer: number;
  animFrame: number;
  prevX: number;
  prevZ: number;
}

export class RemoteEnemyRenderer {
  private scene: THREE.Scene;
  private vswap: VSwapLoader | null;
  private enemies = new Map<number, EnemyVisual>();
  private textureCache = new Map<number, THREE.Texture>();

  constructor(scene: THREE.Scene, vswap: VSwapLoader | null) {
    this.scene = scene;
    this.vswap = vswap;
  }

  update(snapshots: EnemySnapshot[], dt: number): void {
    const activeIds = new Set<number>();

    for (const snap of snapshots) {
      activeIds.add(snap.id);

      let ev = this.enemies.get(snap.id);
      if (!ev) {
        ev = this.createEnemy(snap);
        this.enemies.set(snap.id, ev);
      }

      // Update position
      ev.prevX = ev.sprite.position.x;
      ev.prevZ = ev.sprite.position.z;
      ev.sprite.position.set(snap.x, WALL_HEIGHT * 0.5, snap.z);

      // Reset animation on state change
      if (snap.state !== ev.lastState) {
        ev.animFrame = 0;
        ev.animTimer = 0;
        ev.lastState = snap.state;
        ev.type = snap.type;
      }

      // Advance animation
      ev.animTimer += dt;
      if (ev.animTimer >= 1 / ANIM_SPEED) {
        ev.animTimer -= 1 / ANIM_SPEED;
        ev.animFrame++;
      }

      this.applyTexture(ev, snap);
    }

    // Remove enemies no longer in snapshot
    for (const [id, ev] of this.enemies) {
      if (!activeIds.has(id)) {
        this.scene.remove(ev.sprite);
        ev.sprite.material.dispose();
        this.enemies.delete(id);
      }
    }
  }

  private createEnemy(snap: EnemySnapshot): EnemyVisual {
    const mat = new THREE.SpriteMaterial({ transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.9, 0.9, 1);
    sprite.position.set(snap.x, WALL_HEIGHT * 0.5, snap.z);
    this.scene.add(sprite);

    return {
      sprite,
      type: snap.type,
      lastState: snap.state,
      animTimer: 0,
      animFrame: 0,
      prevX: snap.x,
      prevZ: snap.z,
    };
  }

  private applyTexture(ev: EnemyVisual, snap: EnemySnapshot): void {
    const spriteSet = ENEMY_SPRITE_BASE[snap.type];
    if (!spriteSet) return;

    let frameKey: string;
    switch (snap.state) {
      case 2: // Chase — walk cycle
        frameKey = WALK_FRAMES[ev.animFrame % WALK_FRAMES.length]!;
        break;
      case 3: // Attack
        frameKey = ATTACK_FRAMES[Math.min(ev.animFrame, ATTACK_FRAMES.length - 1)]!;
        break;
      case 5: // Death
        frameKey = DEATH_FRAMES[Math.min(ev.animFrame, DEATH_FRAMES.length - 1)]!;
        break;
      case 4: // Pain
        frameKey = 'pain';
        break;
      default: // Idle / Alert
        frameKey = 'stand';
        break;
    }

    const spriteIdx = (spriteSet as any)[frameKey] ?? spriteSet.stand;
    if (spriteIdx == null) return;

    const tex = this.getTexture(spriteIdx);
    if (tex) {
      const mat = ev.sprite.material as THREE.SpriteMaterial;
      if (mat.map !== tex) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
    }
  }

  private getTexture(spriteIndex: number): THREE.Texture | null {
    if (this.textureCache.has(spriteIndex)) {
      return this.textureCache.get(spriteIndex)!;
    }

    if (!this.vswap) return null;
    const pixels = this.vswap.getSpriteTexture(spriteIndex);
    if (!pixels) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(64, 64);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(spriteIndex, tex);
    return tex;
  }

  clear(): void {
    for (const ev of this.enemies.values()) {
      this.scene.remove(ev.sprite);
      ev.sprite.material.dispose();
    }
    this.enemies.clear();
  }

  destroy(): void {
    this.clear();
    for (const tex of this.textureCache.values()) {
      tex.dispose();
    }
    this.textureCache.clear();
  }
}

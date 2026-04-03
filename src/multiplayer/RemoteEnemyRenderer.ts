import * as THREE from 'three';
import { WALL_HEIGHT, TILE_SIZE } from '../core/constants.js';
import { ENEMY_SPRITE_BASE } from '../sprites/SpriteConfig.js';
import type { VSwapLoader } from '../assets/VSwapLoader.js';
import type { EnemySnapshot } from '../../shared/protocol.js';

/** Map enemy state enum to sprite key */
const STATE_SPRITE: Record<number, string> = {
  0: 'stand',  // idle
  1: 'stand',  // alert
  2: 'walk1',  // chase
  3: 'shoot1', // attack
  4: 'pain',   // pain
  5: 'die1',   // death
};

interface EnemyVisual {
  sprite: THREE.Sprite;
  type: string;
  lastState: number;
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

  update(snapshots: EnemySnapshot[]): void {
    const activeIds = new Set<number>();

    for (const snap of snapshots) {
      activeIds.add(snap.id);

      let ev = this.enemies.get(snap.id);
      if (!ev) {
        ev = this.createEnemy(snap);
        this.enemies.set(snap.id, ev);
      }

      // Update position
      ev.sprite.position.set(
        snap.x,
        WALL_HEIGHT * 0.5,
        snap.z,
      );

      // Update texture if state changed
      if (snap.state !== ev.lastState || ev.type !== snap.type) {
        this.updateTexture(ev, snap);
        ev.lastState = snap.state;
        ev.type = snap.type;
      }
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

    const ev: EnemyVisual = { sprite, type: snap.type, lastState: -1 };
    this.updateTexture(ev, snap);
    ev.lastState = snap.state;

    return ev;
  }

  private updateTexture(ev: EnemyVisual, snap: EnemySnapshot): void {
    const spriteSet = ENEMY_SPRITE_BASE[snap.type];
    if (!spriteSet) return;

    const stateKey = STATE_SPRITE[snap.state] ?? 'stand';
    const spriteIdx = (spriteSet as any)[stateKey] ?? spriteSet.stand;
    if (spriteIdx == null) return;

    const tex = this.getTexture(spriteIdx);
    if (tex) {
      (ev.sprite.material as THREE.SpriteMaterial).map = tex;
      (ev.sprite.material as THREE.SpriteMaterial).needsUpdate = true;
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

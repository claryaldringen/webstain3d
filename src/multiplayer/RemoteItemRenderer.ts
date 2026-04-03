import * as THREE from 'three';
import { WALL_HEIGHT } from '../core/constants.js';
import { VSWAP_SPRITE_MAP } from '../sprites/SpriteConfig.js';
import type { VSwapLoader } from '../assets/VSwapLoader.js';
import type { ItemSnapshot } from '../../shared/protocol.js';

export class RemoteItemRenderer {
  private scene: THREE.Scene;
  private vswap: VSwapLoader | null;
  private items = new Map<number, THREE.Sprite>();
  private textureCache = new Map<number, THREE.Texture>();

  constructor(scene: THREE.Scene, vswap: VSwapLoader | null) {
    this.scene = scene;
    this.vswap = vswap;
  }

  update(snapshots: ItemSnapshot[]): void {
    const activeIds = new Set<number>();

    for (const snap of snapshots) {
      activeIds.add(snap.id);

      if (!this.items.has(snap.id)) {
        const sprite = this.createItem(snap);
        if (sprite) this.items.set(snap.id, sprite);
      }
    }

    // Remove picked up items
    for (const [id, sprite] of this.items) {
      if (!activeIds.has(id)) {
        this.scene.remove(sprite);
        sprite.material.dispose();
        this.items.delete(id);
      }
    }
  }

  private createItem(snap: ItemSnapshot): THREE.Sprite | null {
    const spriteIdx = VSWAP_SPRITE_MAP[snap.subtype];
    if (spriteIdx == null) return null;

    const tex = this.getTexture(spriteIdx);
    if (!tex) return null;

    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.6, 0.6, 1);
    sprite.position.set(snap.x, WALL_HEIGHT * 0.35, snap.z);
    this.scene.add(sprite);
    return sprite;
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
    for (const sprite of this.items.values()) {
      this.scene.remove(sprite);
      sprite.material.dispose();
    }
    this.items.clear();
  }

  destroy(): void {
    this.clear();
    for (const tex of this.textureCache.values()) tex.dispose();
    this.textureCache.clear();
  }
}

import * as THREE from 'three';
import { PLAYER_HEIGHT, WALL_HEIGHT } from '../core/constants.js';
import { ENEMY_SPRITE_BASE } from '../sprites/SpriteConfig.js';
import type { EnemySpriteSet } from '../sprites/SpriteConfig.js';
import type { VSwapLoader } from '../assets/VSwapLoader.js';
import type { PlayerSnapshot } from '../../shared/protocol.js';

// Weapon → enemy sprite set mapping
const WEAPON_SKIN: Record<number, string> = {
  0: 'dog',    // knife → dog
  1: 'guard',  // pistol → guard
  2: 'ss',     // machine gun → SS
  3: 'boss',   // chaingun → Hans Grosse (boss)
};

const WALK_FRAMES = ['walk1', 'walk2', 'walk3', 'walk4'] as const;
const SHOOT_FRAMES = ['shoot1', 'shoot2', 'shoot3'] as const;
const ANIM_SPEED = 6;

interface RemotePlayer {
  sprite: THREE.Sprite;
  label: THREE.Sprite;
  lastSnapshot: PlayerSnapshot;
  prevSnapshot: PlayerSnapshot | null;
  interpTime: number;
  animTimer: number;
  animFrame: number;
  currentSpriteIdx: number;
  lastWeapon: number;
  wasAlive: boolean;
  deathTimer: number;
}

const INTERP_DURATION = 0.1; // 100ms — smoother than tick rate to avoid jitter

export class RemotePlayerRenderer {
  private scene: THREE.Scene;
  private players = new Map<string, RemotePlayer>();
  private myId = '';
  private vswap: VSwapLoader | null = null;
  private textureCache = new Map<number, THREE.Texture>();

  constructor(scene: THREE.Scene, vswap?: VSwapLoader | null) {
    this.scene = scene;
    this.vswap = vswap ?? null;
  }

  setVSwap(vswap: VSwapLoader | null): void {
    this.vswap = vswap;
  }

  setMyId(id: string): void {
    this.myId = id;
  }

  update(snapshots: PlayerSnapshot[], dt: number): void {
    const activeIds = new Set<string>();

    for (const snap of snapshots) {
      if (snap.id === this.myId) continue;
      activeIds.add(snap.id);

      let rp = this.players.get(snap.id);
      if (!rp) {
        rp = this.createPlayer(snap);
        this.players.set(snap.id, rp);
      }

      // Update interpolation
      rp.prevSnapshot = { ...rp.lastSnapshot };
      rp.lastSnapshot = snap;
      rp.interpTime = 0;

      // Death transition
      if (!snap.alive && rp.wasAlive) {
        rp.deathTimer = 0;
        rp.animFrame = 0;
      }
      rp.wasAlive = snap.alive;

      if (!snap.alive) {
        rp.deathTimer += dt;
        rp.label.visible = false;
        // Show death animation for 1s, then hide
        rp.sprite.visible = rp.deathTimer < 1.0;
      } else {
        rp.sprite.visible = true;
        rp.label.visible = true;
      }

      // Animate
      rp.animTimer += dt;
      if (rp.animTimer >= 1 / ANIM_SPEED) {
        rp.animTimer -= 1 / ANIM_SPEED;
        rp.animFrame++;
      }

      // Pick sprite frame
      this.updateSpriteTexture(rp, snap);
    }

    // Remove players no longer in snapshot
    for (const [id, rp] of this.players) {
      if (!activeIds.has(id)) {
        this.scene.remove(rp.sprite);
        this.scene.remove(rp.label);
        rp.sprite.material.dispose();
        rp.label.material.dispose();
        this.players.delete(id);
      }
    }

    // Interpolate positions
    for (const rp of this.players.values()) {
      rp.interpTime += dt;
      const t = Math.min(rp.interpTime / INTERP_DURATION, 1);

      if (rp.prevSnapshot) {
        rp.sprite.position.x = rp.prevSnapshot.x + (rp.lastSnapshot.x - rp.prevSnapshot.x) * t;
        rp.sprite.position.z = rp.prevSnapshot.z + (rp.lastSnapshot.z - rp.prevSnapshot.z) * t;
      } else {
        rp.sprite.position.x = rp.lastSnapshot.x;
        rp.sprite.position.z = rp.lastSnapshot.z;
      }
      rp.sprite.position.y = PLAYER_HEIGHT;

      // Label follows sprite
      rp.label.position.copy(rp.sprite.position);
      rp.label.position.y = PLAYER_HEIGHT + 0.7;
    }
  }

  private updateSpriteTexture(rp: RemotePlayer, snap: PlayerSnapshot): void {
    const skinType = WEAPON_SKIN[snap.weapon] ?? 'guard';
    const spriteSet = ENEMY_SPRITE_BASE[skinType] as EnemySpriteSet | undefined;
    if (!spriteSet) return;

    // Determine if player is moving
    const isMoving = rp.prevSnapshot &&
      (Math.abs(snap.x - rp.prevSnapshot.x) > 0.01 || Math.abs(snap.z - rp.prevSnapshot.z) > 0.01);

    let frameKey: string;
    if (!snap.alive) {
      // Death animation
      const DEATH_FRAMES = ['die1', 'die2', 'die3', 'dead'];
      frameKey = DEATH_FRAMES[Math.min(rp.animFrame, DEATH_FRAMES.length - 1)]!;
    } else if (snap.shooting) {
      frameKey = SHOOT_FRAMES[Math.min(rp.animFrame % SHOOT_FRAMES.length, SHOOT_FRAMES.length - 1)]!;
    } else if (isMoving) {
      frameKey = WALK_FRAMES[rp.animFrame % WALK_FRAMES.length]!;
    } else {
      frameKey = 'stand';
    }

    const spriteIdx = (spriteSet as any)[frameKey] ?? spriteSet.stand;
    if (spriteIdx == null || spriteIdx === rp.currentSpriteIdx) return;

    const tex = this.getTexture(spriteIdx);
    if (tex) {
      (rp.sprite.material as THREE.SpriteMaterial).map = tex;
      (rp.sprite.material as THREE.SpriteMaterial).needsUpdate = true;
      rp.currentSpriteIdx = spriteIdx;
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

  private createPlayer(snap: PlayerSnapshot): RemotePlayer {
    const mat = new THREE.SpriteMaterial({ transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.9, 0.9, 1);
    sprite.position.set(snap.x, PLAYER_HEIGHT, snap.z);
    this.scene.add(sprite);

    // Name label with outline for readability
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const lctx = labelCanvas.getContext('2d')!;
    lctx.font = 'bold 32px monospace';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    // Black outline
    lctx.strokeStyle = '#000000';
    lctx.lineWidth = 4;
    lctx.strokeText(snap.name, 128, 32);
    // White fill
    lctx.fillStyle = '#FCFC54';
    lctx.fillText(snap.name, 128, 32);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
    const label = new THREE.Sprite(labelMat);
    label.scale.set(1.5, 0.4, 1);
    label.position.set(snap.x, PLAYER_HEIGHT + 0.7, snap.z);
    this.scene.add(label);

    return {
      sprite,
      label,
      lastSnapshot: snap,
      prevSnapshot: null,
      interpTime: 0,
      animTimer: 0,
      animFrame: 0,
      currentSpriteIdx: -1,
      lastWeapon: snap.weapon,
      wasAlive: snap.alive,
      deathTimer: 0,
    };
  }

  clear(): void {
    for (const rp of this.players.values()) {
      this.scene.remove(rp.sprite);
      this.scene.remove(rp.label);
      rp.sprite.material.dispose();
      rp.label.material.dispose();
    }
    this.players.clear();
  }

  destroy(): void {
    this.clear();
    for (const tex of this.textureCache.values()) tex.dispose();
    this.textureCache.clear();
  }
}

import * as THREE from 'three';
import { WALL_HEIGHT } from '../core/constants.js';
import { VSWAP_SPRITE_MAP } from './SpriteConfig.js';
import type { VSwapLoader } from '../assets/VSwapLoader.js';

export interface SpriteHandle {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  texture: THREE.Texture;
  alive: boolean;
  frames: SpriteFrameLayout | null;
  currentFrame: number;
}

export interface SpriteFrameLayout {
  cols: number;
  rows: number;
}

export interface SpriteCreateOptions {
  width?: number;
  height?: number;
  offsetY?: number;
  frames?: SpriteFrameLayout | null;
  anchorBottom?: boolean;
  label?: string;
  color?: string;
  vswapIndex?: number | null;
}

/** Minimal interface for the scene host needed by SpriteManager. */
export interface SpriteSceneHost {
  scene: THREE.Scene;
  loadTexture(path: string): THREE.Texture;
}

export class SpriteManager {
  private renderer: SpriteSceneHost;
  private vswapLoader: VSwapLoader | null;
  sprites: SpriteHandle[] = [];

  private placeholderCache = new Map<string, THREE.Texture>();
  private vswapTextureCache = new Map<number, THREE.Texture>();

  constructor(renderer: SpriteSceneHost, vswapLoader: VSwapLoader | null = null) {
    this.renderer = renderer;
    this.vswapLoader = vswapLoader;
  }

  getVswapTexture(spriteIndex: number): THREE.Texture | null {
    if (this.vswapTextureCache.has(spriteIndex)) {
      return this.vswapTextureCache.get(spriteIndex)!;
    }
    const loader = this.vswapLoader;
    if (!loader) return null;

    const pixels = loader.getSpriteTexture(spriteIndex);
    if (!pixels) return null;

    // Build a canvas from the Uint8ClampedArray pixel data
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
    this.vswapTextureCache.set(spriteIndex, tex);
    return tex;
  }

  getPlaceholderTexture(label: string, color: string): THREE.Texture {
    const key = `${label}_${color}`;
    if (this.placeholderCache.has(key)) {
      return this.placeholderCache.get(key)!;
    }
    const isCharacter = label === 'guard' || label === 'ss' || label === 'dog';
    const res = isCharacter ? 128 : 64;

    // Simple placeholder canvas
    const canvas = document.createElement('canvas');
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, res, res);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(res / 4)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.substring(0, 4), res / 2, res / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.placeholderCache.set(key, tex);
    return tex;
  }

  create(texturePath: string, x: number, z: number, options: SpriteCreateOptions = {}): SpriteHandle {
    const {
      width = 1,
      height = 1,
      offsetY = 0,
      frames = null,
      anchorBottom = true,
      label = '',
      color = '#ff00ff',
      vswapIndex = null,
    } = options;

    let texture: THREE.Texture | null = null;

    // Try VSWAP sprite first (by explicit index or label mapping)
    const spriteIdx = vswapIndex ?? VSWAP_SPRITE_MAP[label];
    if (spriteIdx !== undefined) {
      texture = this.getVswapTexture(spriteIdx);
    }

    // Fallback to placeholder if VSWAP not available
    if (!texture && label) {
      texture = this.getPlaceholderTexture(label, color);
    } else if (!texture) {
      texture = this.renderer.loadTexture(texturePath);
    }

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });

    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);

    const yPos = anchorBottom ? height / 2 + offsetY : WALL_HEIGHT / 2 + offsetY;
    mesh.position.set(x, yPos, z);

    this.renderer.scene.add(mesh);

    const sprite: SpriteHandle = {
      mesh,
      material,
      texture: texture!,
      alive: true,
      frames,
      currentFrame: 0,
    };

    this.sprites.push(sprite);
    return sprite;
  }

  updateFrame(sprite: SpriteHandle, frameIndex: number): void {
    if (!sprite.frames) return;
    const { cols, rows } = sprite.frames;
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);

    sprite.texture.repeat.set(1 / cols, 1 / rows);
    sprite.texture.offset.set(col / cols, 1 - (row + 1) / rows);
    sprite.currentFrame = frameIndex;
  }

  update(camera: THREE.Camera): void {
    for (const sprite of this.sprites) {
      if (!sprite.alive) continue;
      sprite.mesh.lookAt(camera.position.x, sprite.mesh.position.y, camera.position.z);
    }
  }

  setVswapTexture(sprite: SpriteHandle, spriteIndex: number): void {
    const tex = this.getVswapTexture(spriteIndex);
    if (tex && sprite.material.map !== tex) {
      sprite.material.map = tex;
      sprite.material.needsUpdate = true;
    }
  }

  remove(sprite: SpriteHandle): void {
    sprite.alive = false;
    this.renderer.scene.remove(sprite.mesh);
    sprite.mesh.geometry.dispose();
    sprite.material.dispose();
  }
}

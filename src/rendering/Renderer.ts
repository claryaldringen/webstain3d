import * as THREE from 'three';
import {
  WALL_HEIGHT, PLAYER_HEIGHT, FLOOR_COLOR, CEILING_COLOR,
  MAP_SIZE, TILE_SIZE, CAMERA_FOV, RENDER_SCALE, FOG_NEAR, FOG_FAR,
} from '../core/constants.js';
import { assetUrl } from '../core/assetUrl.js';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly textureLoader: THREE.TextureLoader;

  private readonly floor: THREE.Mesh;
  private readonly ceiling: THREE.Mesh;
  private readonly textureCache: Map<string, THREE.Texture> = new Map();
  private readonly resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(1);

    // Set initial size based on viewport
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const rw = Math.floor(w * RENDER_SCALE);
    const rh = Math.floor(h * RENDER_SCALE);
    this.renderer.setSize(rw, rh, false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CEILING_COLOR);
    this.scene.fog = new THREE.Fog(0x000000, FOG_NEAR, FOG_FAR);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, 0.1, 100);
    this.camera.position.y = PLAYER_HEIGHT;

    // No dynamic lighting -- Wolf3D used distance shading only (fog handles this)

    // Floor
    const floorGeo = new THREE.PlaneGeometry(MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
    const floorMat = new THREE.MeshBasicMaterial({ color: FLOOR_COLOR, fog: false });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(MAP_SIZE * TILE_SIZE / 2, 0, MAP_SIZE * TILE_SIZE / 2);
    this.scene.add(this.floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
    const ceilMat = new THREE.MeshBasicMaterial({ color: CEILING_COLOR, fog: false });
    this.ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    this.ceiling.rotation.x = Math.PI / 2;
    this.ceiling.position.set(MAP_SIZE * TILE_SIZE / 2, WALL_HEIGHT, MAP_SIZE * TILE_SIZE / 2);
    this.scene.add(this.ceiling);

    this.textureLoader = new THREE.TextureLoader();

    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private onResize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const rw = Math.floor(w * RENDER_SCALE);
    const rh = Math.floor(h * RENDER_SCALE);
    this.renderer.setSize(rw, rh, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  loadTexture(path: string): THREE.Texture {
    const cached = this.textureCache.get(path);
    if (cached) {
      return cached;
    }
    const tex = this.textureLoader.load(
      assetUrl(path),
      undefined,
      undefined,
      () => {} // silently handle missing textures
    );
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textureCache.set(path, tex);
    return tex;
  }

  clearLevel(): void {
    // Remove all objects except floor, ceiling
    const keep = new Set<THREE.Object3D>([this.floor, this.ceiling]);
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj !== this.scene && !keep.has(obj)) {
        toRemove.push(obj);
      }
    });
    for (const obj of toRemove) {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const material = obj.material;
        if (Array.isArray(material)) {
          for (const mat of material) {
            (mat as THREE.MeshBasicMaterial).map?.dispose();
            mat.dispose();
          }
        } else {
          (material as THREE.MeshBasicMaterial).map?.dispose();
          material.dispose();
        }
      }
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }
}

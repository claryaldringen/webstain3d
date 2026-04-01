import * as THREE from 'three';
import { TILE_SIZE, WALL_HEIGHT } from '../core/constants.js';
import type { LevelData, DoorData, PushwallData, EntityData, TilePosition, PlayerStartData } from '../types/index.js';

/** Minimal interface for the scene/renderer dependency. */
export interface SceneHost {
  scene: THREE.Scene;
  loadTexture(path: string): THREE.Texture;
}

/** Factory that provides wall materials (VSWAP or procedural). */
export interface TextureFactory {
  getWallTextures(): Promise<Map<number, HTMLCanvasElement>>;
}

interface FaceEntry {
  x: number;
  y: number;
  face: 'north' | 'south' | 'east' | 'west';
}

export class GameMap {
  width = 0;
  height = 0;
  walls: number[][] = [];
  doors: DoorData[] = [];
  pushwalls: PushwallData[] = [];
  entities: EntityData[] = [];
  playerStart!: PlayerStartData;
  exitTile: TilePosition | null = null;

  private renderer: SceneHost;
  private wallMeshes: THREE.Mesh[] | null = null;
  private proceduralTextures: Map<number, HTMLCanvasElement> | null = null;
  private hasTextures = false;

  constructor(renderer: SceneHost) {
    this.renderer = renderer;
  }

  async load(url: string): Promise<LevelData> {
    const resp = await fetch(url);
    const data: LevelData = await resp.json();
    return this._init(data);
  }

  async loadFromData(data: LevelData): Promise<LevelData> {
    return this._init(data);
  }

  private async _init(data: LevelData): Promise<LevelData> {
    // Load wall textures (VSWAP with procedural fallback)
    const { generateWallTextures } = await import('../assets/TextureFactory.js');
    this.proceduralTextures = await generateWallTextures();

    // Check if real texture files exist (verify content-type is actually an image,
    // not an SPA fallback HTML page from the dev server)
    this.hasTextures = await fetch('assets/textures/wall_001.png', { method: 'HEAD' })
      .then(r => r.ok && (r.headers.get('content-type') || '').startsWith('image/'))
      .catch(() => false);

    this.width = data.width;
    this.height = data.height;
    this.walls = data.walls;
    this.doors = data.doors || [];

    // Mark door tiles as solid (-1) and ensure walls on both sides
    for (const d of this.doors) {
      this.walls[d.y]![d.x] = -1;
      // Auto-detect orientation: check which axis has walls
      const n = (this.walls[d.y - 1]?.[d.x] ?? 0) > 0;
      const s = (this.walls[d.y + 1]?.[d.x] ?? 0) > 0;
      const w = (this.walls[d.y]?.[d.x - 1] ?? 0) > 0;
      const e = (this.walls[d.y]?.[d.x + 1] ?? 0) > 0;
      const isVertical = (n || s) && !w && !e;
      // Fill missing wall neighbors so doors are properly framed
      if (isVertical) {
        if (!n && d.y > 0) this.walls[d.y - 1]![d.x] = 3;
        if (!s && d.y < this.height - 1) this.walls[d.y + 1]![d.x] = 3;
      } else {
        if (!w && d.x > 0) this.walls[d.y]![d.x - 1] = 3;
        if (!e && d.x < this.width - 1) this.walls[d.y]![d.x + 1] = 3;
      }
    }

    this.pushwalls = data.pushwalls || [];
    this.entities = data.entities || [];
    this.playerStart = data.playerStart;
    this.exitTile = data.exitTile;
    this.buildGeometry();
    return data;
  }

  isWall(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return this.walls[y]![x]! > 0; // doors (-1) are not solid walls for rendering/collision when open
  }

  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return this.walls[y]![x]! !== 0; // includes doors (-1) — used for player collision
  }

  getWallId(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 1;
    return this.walls[y]![x]!;
  }

  getWallMaterial(wallId: number, overrideCanvas: HTMLCanvasElement | null = null): THREE.MeshBasicMaterial {
    if (this.hasTextures && !overrideCanvas) {
      const texPath = `assets/textures/wall_${String(wallId).padStart(3, '0')}.png`;
      const texture = this.renderer.loadTexture(texPath);
      return new THREE.MeshBasicMaterial({ map: texture });
    }

    // Use procedural/VSWAP canvas texture
    const canvas = overrideCanvas
      || this.proceduralTextures?.get(wallId)
      || this.proceduralTextures?.get(1);
    if (!canvas) {
      return new THREE.MeshBasicMaterial({ color: 0xff00ff });
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return new THREE.MeshBasicMaterial({ map: texture });
  }

  buildGeometry(): void {
    const facesByTexture = new Map<string, FaceEntry[]>();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const wallId = this.walls[y]![x]!;
        if (wallId <= 0) continue; // 0 = empty, -1 = door

        const neighbors: { dx: number; dz: number; face: FaceEntry['face'] }[] = [
          { dx: 0, dz: -1, face: 'south' },
          { dx: 0, dz: 1, face: 'north' },
          { dx: -1, dz: 0, face: 'west' },
          { dx: 1, dz: 0, face: 'east' },
        ];

        for (const n of neighbors) {
          const nx = x + n.dx;
          const ny = y + n.dz;
          if (!this.isWall(nx, ny)) {
            const isEW = (n.face === 'east' || n.face === 'west');
            const key = `${wallId}_${isEW ? 'ew' : 'ns'}`;
            if (!facesByTexture.has(key)) {
              facesByTexture.set(key, []);
            }
            facesByTexture.get(key)!.push({ x, y, face: n.face });
          }
        }
      }
    }

    for (const [key, faces] of facesByTexture) {
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (const { x, y, face } of faces) {
        const baseIndex = positions.length / 3;
        const wx = x * TILE_SIZE;
        const wy = y * TILE_SIZE;

        let verts: [number, number, number][];
        if (face === 'north') {
          const z = wy + TILE_SIZE;
          verts = [
            [wx, 0, z], [wx + TILE_SIZE, 0, z],
            [wx + TILE_SIZE, WALL_HEIGHT, z], [wx, WALL_HEIGHT, z],
          ];
        } else if (face === 'south') {
          const z = wy;
          verts = [
            [wx + TILE_SIZE, 0, z], [wx, 0, z],
            [wx, WALL_HEIGHT, z], [wx + TILE_SIZE, WALL_HEIGHT, z],
          ];
        } else if (face === 'east') {
          const xp = wx + TILE_SIZE;
          verts = [
            [xp, 0, wy + TILE_SIZE], [xp, 0, wy],
            [xp, WALL_HEIGHT, wy], [xp, WALL_HEIGHT, wy + TILE_SIZE],
          ];
        } else {
          // west
          verts = [
            [wx, 0, wy], [wx, 0, wy + TILE_SIZE],
            [wx, WALL_HEIGHT, wy + TILE_SIZE], [wx, WALL_HEIGHT, wy],
          ];
        }

        for (const v of verts) positions.push(...v);
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        indices.push(
          baseIndex, baseIndex + 1, baseIndex + 2,
          baseIndex, baseIndex + 2, baseIndex + 3,
        );
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const isEW = key.endsWith('_ew');
      const wallId = parseInt(key.split('_')[0]!, 10);
      // Use dark VSWAP texture for E/W walls if available, else fallback to multiplyScalar
      const darkTexture = isEW ? (this.proceduralTextures?.get(-wallId) ?? null) : null;
      const material = darkTexture
        ? this.getWallMaterial(wallId, darkTexture)
        : this.getWallMaterial(wallId);

      if (isEW && !darkTexture) {
        material.color.multiplyScalar(0.75);
      }

      const mesh = new THREE.Mesh(geometry, material);
      this.renderer.scene.add(mesh);
    }

    // Exit tile marker — elevator floor
    if (this.exitTile) {
      const ex = this.exitTile.x * TILE_SIZE;
      const ez = this.exitTile.y * TILE_SIZE;
      const exitCanvas = document.createElement('canvas');
      exitCanvas.width = 64;
      exitCanvas.height = 64;
      const ectx = exitCanvas.getContext('2d')!;
      // Dark gray base
      ectx.fillStyle = '#505050';
      ectx.fillRect(0, 0, 64, 64);
      // Red stripes (hazard pattern)
      ectx.fillStyle = '#AA2020';
      for (let i = 0; i < 8; i += 2) {
        ectx.fillRect(0, i * 8, 64, 8);
      }
      // Arrow pointing to center
      ectx.fillStyle = '#FFCC00';
      ectx.fillRect(24, 8, 16, 48);
      ectx.fillRect(16, 20, 32, 4);
      ectx.fillRect(20, 16, 24, 4);
      ectx.fillRect(24, 12, 16, 4);

      const exitTex = new THREE.CanvasTexture(exitCanvas);
      exitTex.magFilter = THREE.NearestFilter;
      exitTex.minFilter = THREE.NearestFilter;
      const exitGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
      const exitMat = new THREE.MeshBasicMaterial({ map: exitTex });
      const exitMesh = new THREE.Mesh(exitGeo, exitMat);
      exitMesh.rotation.x = -Math.PI / 2;
      exitMesh.position.set(ex + TILE_SIZE / 2, 0.01, ez + TILE_SIZE / 2);
      this.renderer.scene.add(exitMesh);
    }
  }
}

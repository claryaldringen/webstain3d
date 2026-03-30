import * as THREE from 'three';
import { TILE_SIZE, WALL_HEIGHT } from './constants.js';

export class GameMap {
    constructor(renderer) {
        this.renderer = renderer;
        this.width = 0;
        this.height = 0;
        this.walls = [];
        this.wallMeshes = null;
    }

    async load(url) {
        const resp = await fetch(url);
        const data = await resp.json();
        this.width = data.width;
        this.height = data.height;
        this.walls = data.walls;
        this.doors = data.doors || [];
        this.pushwalls = data.pushwalls || [];
        this.entities = data.entities || [];
        this.playerStart = data.playerStart;
        this.exitTile = data.exitTile;
        this.buildGeometry();
        return data;
    }

    isWall(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
        return this.walls[y][x] > 0;
    }

    getWallId(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 1;
        return this.walls[y][x];
    }

    buildGeometry() {
        const facesByTexture = new Map();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const wallId = this.walls[y][x];
                if (wallId === 0) continue;

                const neighbors = [
                    { dx: 0, dz: -1, face: 'south' },
                    { dx: 0, dz: 1, face: 'north' },
                    { dx: -1, dz: 0, face: 'west' },
                    { dx: 1, dz: 0, face: 'east' },
                ];

                for (const n of neighbors) {
                    const nx = x + n.dx;
                    const ny = y + n.dz;
                    if (!this.isWall(nx, ny)) {
                        if (!facesByTexture.has(wallId)) {
                            facesByTexture.set(wallId, []);
                        }
                        facesByTexture.get(wallId).push({ x, y, face: n.face });
                    }
                }
            }
        }

        for (const [wallId, faces] of facesByTexture) {
            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const uvs = [];
            const indices = [];

            for (const { x, y, face } of faces) {
                const baseIndex = positions.length / 3;
                const wx = x * TILE_SIZE;
                const wy = y * TILE_SIZE;

                let verts;
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
                    verts = [
                        [wx, 0, wy], [wx, 0, wy + TILE_SIZE],
                        [wx, WALL_HEIGHT, wy + TILE_SIZE], [wx, WALL_HEIGHT, wy],
                    ];
                }

                for (const v of verts) positions.push(...v);
                uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex, baseIndex + 2, baseIndex + 3
                );
            }

            geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setIndex(indices);
            geometry.computeVertexNormals();

            let material;
            const texPath = `assets/textures/wall_${String(wallId).padStart(3, '0')}.png`;
            try {
                const texture = this.renderer.loadTexture(texPath);
                material = new THREE.MeshBasicMaterial({ map: texture });
            } catch {
                const colors = [0x808080, 0x4040A0, 0xA04040, 0x40A040, 0xA0A040];
                material = new THREE.MeshBasicMaterial({ color: colors[wallId % colors.length] });
            }

            const mesh = new THREE.Mesh(geometry, material);
            this.renderer.scene.add(mesh);
        }
    }
}

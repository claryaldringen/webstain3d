import * as THREE from 'three';
import { WALL_HEIGHT, PLAYER_HEIGHT, FLOOR_COLOR, CEILING_COLOR, MAP_SIZE, TILE_SIZE } from './constants.js';

// Internal resolution scale — renders at half the viewport size for chunky pixels
const RENDER_SCALE = 0.75;

export class Renderer {
    constructor(canvas) {
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
        this.scene.fog = new THREE.Fog(0x000000, 4, 24);

        this.camera = new THREE.PerspectiveCamera(66, w / h, 0.1, 100);
        this.camera.position.y = PLAYER_HEIGHT;

        // No dynamic lighting — Wolf3D used distance shading only (fog handles this)

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
        this.textureCache = new Map();

        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        const rw = Math.floor(w * RENDER_SCALE);
        const rh = Math.floor(h * RENDER_SCALE);
        this.renderer.setSize(rw, rh, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    loadTexture(path) {
        if (this.textureCache.has(path)) {
            return this.textureCache.get(path);
        }
        const tex = this.textureLoader.load(
            path,
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

    clearLevel() {
        // Remove all objects except floor, ceiling
        const keep = new Set([this.floor, this.ceiling]);
        const toRemove = [];
        this.scene.traverse(obj => {
            if (obj !== this.scene && !keep.has(obj)) {
                toRemove.push(obj);
            }
        });
        for (const obj of toRemove) {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

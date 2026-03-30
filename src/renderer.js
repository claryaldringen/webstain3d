import * as THREE from 'three';
import { WALL_HEIGHT, PLAYER_HEIGHT, FLOOR_COLOR, CEILING_COLOR, MAP_SIZE, TILE_SIZE } from './constants.js';

export class Renderer {
    constructor(canvas) {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.y = PLAYER_HEIGHT;

        const ambient = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambient);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
        const floorMat = new THREE.MeshBasicMaterial({ color: FLOOR_COLOR });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.set(MAP_SIZE * TILE_SIZE / 2, 0, MAP_SIZE * TILE_SIZE / 2);
        this.scene.add(this.floor);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
        const ceilMat = new THREE.MeshBasicMaterial({ color: CEILING_COLOR });
        this.ceiling = new THREE.Mesh(ceilGeo, ceilMat);
        this.ceiling.rotation.x = Math.PI / 2;
        this.ceiling.position.set(MAP_SIZE * TILE_SIZE / 2, WALL_HEIGHT, MAP_SIZE * TILE_SIZE / 2);
        this.scene.add(this.ceiling);

        this.textureLoader = new THREE.TextureLoader();
        this.textureCache = new Map();

        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    loadTexture(path) {
        if (this.textureCache.has(path)) {
            return this.textureCache.get(path);
        }
        const tex = this.textureLoader.load(path);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        this.textureCache.set(path, tex);
        return tex;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

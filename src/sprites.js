import * as THREE from 'three';
import { WALL_HEIGHT } from './constants.js';

export class SpriteManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.sprites = [];
    }

    create(texturePath, x, z, options = {}) {
        const {
            width = 1,
            height = 1,
            offsetY = 0,
            frames = null,
            anchorBottom = true,
        } = options;

        const texture = this.renderer.loadTexture(texturePath);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
        });

        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, material);

        const yPos = anchorBottom ? height / 2 + offsetY : WALL_HEIGHT / 2 + offsetY;
        mesh.position.set(x, yPos, z);

        this.renderer.scene.add(mesh);

        const sprite = {
            mesh,
            material,
            texture,
            alive: true,
            frames,
            currentFrame: 0,
        };

        this.sprites.push(sprite);
        return sprite;
    }

    updateFrame(sprite, frameIndex) {
        if (!sprite.frames) return;
        const { cols, rows } = sprite.frames;
        const col = frameIndex % cols;
        const row = Math.floor(frameIndex / cols);

        sprite.texture.repeat.set(1 / cols, 1 / rows);
        sprite.texture.offset.set(col / cols, 1 - (row + 1) / rows);
        sprite.currentFrame = frameIndex;
    }

    update(camera) {
        for (const sprite of this.sprites) {
            if (!sprite.alive) continue;
            sprite.mesh.lookAt(camera.position.x, sprite.mesh.position.y, camera.position.z);
        }
    }

    remove(sprite) {
        sprite.alive = false;
        this.renderer.scene.remove(sprite.mesh);
        sprite.mesh.geometry.dispose();
        sprite.material.dispose();
    }
}

import * as THREE from 'three';
import { WALL_HEIGHT } from './constants.js';
import { generateSpritePlaceholder } from './textures.js';

// VSWAP sprite index mapping (Wolf3D shareware, visually verified)
const VSWAP_SPRITE_MAP = {
    // Collectible items
    food: 26,           // Plate of food
    first_aid: 27,      // First aid kit
    medkit: 27,         // First aid kit (same sprite)
    ammo_clip: 28,      // Ammo clip
    ammo_stack: 28,     // Ammo clip (same sprite)
    machine_gun: 29,    // Machine gun pickup
    chaingun: 30,       // Chaingun pickup
    cross: 31,          // Gold cross treasure
    chalice: 32,        // Gold chalice treasure
    chest: 33,          // Gold chest treasure
    crown: 34,          // Gold crown treasure
    extra_life: 35,     // Extra life (BJ 1UP)
    key_gold: 22,       // Gold key
    key_silver: 23,     // Silver key
    // Decorative
    lamp: 6,            // Chandelier
    barrel: 3,          // Green barrel
    pillar: 9,          // White column
    plant: 10,          // Green plant/tree
    table: 4,           // Table with chairs
    skeleton: 11,       // Skeleton flat
    sink: 12,           // Sink/basin
    // Enemies (front-facing idle frame)
    guard: 50,          // Guard standing front
    dog: 99,            // Dog walk frame 1 front
    ss: 138,            // SS standing front
};

// Enemy sprite base indices — verified from id Software Wolf3D source (WL_DEF.H)
// Order in VSWAP: stand(8d), walk1-4(8d each), pain1, die1-3, pain2, dead, shoot1-3
export const ENEMY_SPRITE_BASE = {
    // shoot1=raise, shoot2=fire(flash), shoot3=lower; dog jump1-3 for attack
    guard: { stand: 50, walk1: 58, walk2: 66, walk3: 74, walk4: 82, shoot1: 96, shoot2: 97, shoot3: 98, pain: 90, die1: 91, die2: 92, die3: 93, dead: 95 },
    dog:   { stand: 99, walk1: 99, walk2: 107, walk3: 115, walk4: 123, shoot1: 135, shoot2: 136, shoot3: 137, pain: null, die1: 131, die2: 132, die3: 133, dead: 134 },
    ss:    { stand: 138, walk1: 146, walk2: 154, walk3: 162, walk4: 170, shoot1: 184, shoot2: 185, shoot3: 186, pain: 178, die1: 179, die2: 180, die3: 181, dead: 183 },
};

export class SpriteManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.sprites = [];
        this.placeholderCache = new Map();
        this.vswapTextureCache = new Map();
    }

    getVswapTexture(spriteIndex) {
        if (this.vswapTextureCache.has(spriteIndex)) {
            return this.vswapTextureCache.get(spriteIndex);
        }
        const loader = window._vswapLoader;
        if (!loader) return null;

        const canvas = loader.getSpriteTexture(spriteIndex);
        if (!canvas) return null;

        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        this.vswapTextureCache.set(spriteIndex, tex);
        return tex;
    }

    getPlaceholderTexture(label, color, width, height) {
        const key = `${label}_${color}`;
        if (this.placeholderCache.has(key)) {
            return this.placeholderCache.get(key);
        }
        const isCharacter = label === 'guard' || label === 'ss' || label === 'dog';
        const res = isCharacter ? 128 : 64;
        const canvas = generateSpritePlaceholder(color, res, res, label);
        const tex = new THREE.CanvasTexture(canvas);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        this.placeholderCache.set(key, tex);
        return tex;
    }

    create(texturePath, x, z, options = {}) {
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

        let texture;
        let material;

        // Try VSWAP sprite first (by explicit index or label mapping)
        const spriteIdx = vswapIndex ?? VSWAP_SPRITE_MAP[label];
        if (spriteIdx !== undefined) {
            texture = this.getVswapTexture(spriteIdx);
        }

        // Fallback to placeholder if VSWAP not available
        if (!texture && label) {
            texture = this.getPlaceholderTexture(label, color, 64, 64);
        } else if (!texture) {
            texture = this.renderer.loadTexture(texturePath);
        }

        material = new THREE.MeshBasicMaterial({
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

    setVswapTexture(sprite, spriteIndex) {
        const tex = this.getVswapTexture(spriteIndex);
        if (tex && sprite.material.map !== tex) {
            sprite.material.map = tex;
            sprite.material.needsUpdate = true;
        }
    }

    remove(sprite) {
        sprite.alive = false;
        this.renderer.scene.remove(sprite.mesh);
        sprite.mesh.geometry.dispose();
        sprite.material.dispose();
    }
}

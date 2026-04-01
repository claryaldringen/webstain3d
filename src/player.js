import {
    PLAYER_MOVE_SPEED, PLAYER_SPRINT_MULTIPLIER, PLAYER_ROTATE_SPEED,
    PLAYER_RADIUS, PLAYER_HEIGHT, PLAYER_START_HEALTH, PLAYER_MAX_HEALTH,
    PLAYER_START_LIVES, PLAYER_START_AMMO,
    WEAPON_PISTOL, TILE_SIZE
} from './constants.js';

export class Player {
    constructor(camera, map) {
        this.camera = camera;
        this.map = map;
        this.x = 0;
        this.z = 0;
        this.angle = 0;
        this.health = PLAYER_START_HEALTH;
        this.lives = PLAYER_START_LIVES;
        this.ammo = PLAYER_START_AMMO;
        this.score = 0;
        this.currentWeapon = WEAPON_PISTOL;
        this.weapons = [true, true, false, false];
        this.keys = { gold: false, silver: false };
    }

    spawn(startData) {
        this.x = startData.x * TILE_SIZE + 0.5;
        this.z = startData.y * TILE_SIZE + 0.5;
        this.angle = (startData.angle || 0) * Math.PI / 180;
        this.syncCamera();
    }

    update(dt, input) {
        const movement = input.getMovement();
        const speed = PLAYER_MOVE_SPEED * (movement.sprint ? PLAYER_SPRINT_MULTIPLIER : 1);
        this.angle += movement.rotate * PLAYER_ROTATE_SPEED * dt;
        // Three.js camera.rotation.y = angle looks toward (-sin(angle), 0, -cos(angle))
        const dirX = -Math.sin(this.angle);
        const dirZ = -Math.cos(this.angle);
        // Right vector (strafe): perpendicular to forward
        const strafeX = Math.cos(this.angle);
        const strafeZ = -Math.sin(this.angle);
        let dx = (dirX * movement.forward + strafeX * movement.strafe) * speed * dt;
        let dz = (dirZ * movement.forward + strafeZ * movement.strafe) * speed * dt;
        if (dx !== 0) {
            const newX = this.x + dx;
            if (!this.collides(newX, this.z)) {
                this.x = newX;
            }
        }
        if (dz !== 0) {
            const newZ = this.z + dz;
            if (!this.collides(this.x, newZ)) {
                this.z = newZ;
            }
        }
        this.syncCamera();
    }

    collides(px, pz) {
        const r = PLAYER_RADIUS;
        const minTX = Math.floor((px - r) / TILE_SIZE);
        const maxTX = Math.floor((px + r) / TILE_SIZE);
        const minTZ = Math.floor((pz - r) / TILE_SIZE);
        const maxTZ = Math.floor((pz + r) / TILE_SIZE);
        for (let ty = minTZ; ty <= maxTZ; ty++) {
            for (let tx = minTX; tx <= maxTX; tx++) {
                if (this.map.isSolid(tx, ty)) {
                    const closestX = Math.max(tx * TILE_SIZE, Math.min(px, (tx + 1) * TILE_SIZE));
                    const closestZ = Math.max(ty * TILE_SIZE, Math.min(pz, (ty + 1) * TILE_SIZE));
                    const distX = px - closestX;
                    const distZ = pz - closestZ;
                    if (distX * distX + distZ * distZ < r * r) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    syncCamera() {
        this.camera.position.set(this.x, PLAYER_HEIGHT, this.z);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.angle;
        this.camera.rotation.x = 0;
        this.camera.rotation.z = 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
        }
        return true;
    }

    heal(amount) {
        if (this.health >= PLAYER_MAX_HEALTH) return false;
        this.health = Math.min(PLAYER_MAX_HEALTH, this.health + amount);
        return true;
    }

    addAmmo(amount) {
        this.ammo += amount;
        return true;
    }

    addScore(amount) {
        this.score += amount;
    }

    addKey(keyType) {
        this.keys[keyType] = true;
    }

    hasKey(keyType) {
        return this.keys[keyType];
    }

    addWeapon(weaponId) {
        this.weapons[weaponId] = true;
        this.currentWeapon = weaponId;
    }

    get isDead() {
        return this.health <= 0;
    }
}

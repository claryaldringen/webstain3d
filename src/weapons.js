import * as THREE from 'three';
import {
    WEAPON_KNIFE, WEAPON_PISTOL, WEAPON_MACHINE_GUN, WEAPON_CHAINGUN,
    WEAPON_DAMAGE_MIN, WEAPON_DAMAGE_MAX,
    WEAPON_FIRE_RATES, WEAPON_RANGE, TILE_SIZE
} from './constants.js';

const WEAPON_NAMES = ['knife', 'pistol', 'machinegun', 'chaingun'];

export class WeaponSystem {
    constructor(map, enemyManager) {
        this.map = map;
        this.enemyManager = enemyManager;
        this.cooldown = 0;
        this.firing = false;
        this.animFrame = 0;
        this.animTimer = 0;

        this.overlay = document.createElement('div');
        this.overlay.id = 'weapon-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 256px;
            height: 256px;
            image-rendering: pixelated;
            pointer-events: none;
            z-index: 10;
        `;
        document.body.appendChild(this.overlay);
    }

    update(dt, player, input) {
        this.cooldown = Math.max(0, this.cooldown - dt);

        const switchTo = input.weaponSwitch();
        if (switchTo >= 0 && player.weapons[switchTo]) {
            player.currentWeapon = switchTo;
        }

        const wantsFire = input.isFiring();
        if (wantsFire && this.cooldown <= 0) {
            this.fire(player);
        }

        if (this.animFrame > 0) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) {
                this.animFrame = 0;
            }
        }

        this.updateOverlay(player);
    }

    fire(player) {
        const weapon = player.currentWeapon;
        const fireRate = WEAPON_FIRE_RATES[weapon];

        if (weapon !== WEAPON_KNIFE && player.ammo <= 0) return;
        if (weapon !== WEAPON_KNIFE) player.ammo--;

        this.cooldown = fireRate;
        this.animFrame = 1;
        this.animTimer = fireRate * 0.6;

        this.enemyManager.alertNearby(player.x, player.z);

        const range = WEAPON_RANGE[weapon];
        const dirX = Math.cos(player.angle);
        const dirZ = -Math.sin(player.angle);

        let closestEnemy = null;
        let closestDist = range;

        for (const enemy of this.enemyManager.enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.x - player.x;
            const dz = enemy.z - player.z;

            const dot = dx * dirX + dz * dirZ;
            if (dot < 0 || dot > range) continue;

            const perpX = dx - dirX * dot;
            const perpZ = dz - dirZ * dot;
            const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);

            if (perpDist < 0.5 && dot < closestDist) {
                if (this.hasLineOfSight(player.x, player.z, enemy.x, enemy.z)) {
                    closestDist = dot;
                    closestEnemy = enemy;
                }
            }
        }

        if (closestEnemy) {
            const damage = WEAPON_DAMAGE_MIN + Math.random() * (WEAPON_DAMAGE_MAX - WEAPON_DAMAGE_MIN);
            this.enemyManager.hitEnemy(closestEnemy, Math.round(damage));
        }

        return { hit: !!closestEnemy, weapon };
    }

    hasLineOfSight(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const steps = Math.ceil(dist / 0.5);

        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const cx = x1 + dx * t;
            const cz = z1 + dz * t;
            if (this.map.isWall(Math.floor(cx / TILE_SIZE), Math.floor(cz / TILE_SIZE))) {
                return false;
            }
        }
        return true;
    }

    updateOverlay(player) {
        const name = WEAPON_NAMES[player.currentWeapon];
        const frame = this.animFrame === 1 ? 'fire' : 'idle';
        this.overlay.style.backgroundImage = `url(assets/sprites/weapon_${name}_${frame}.png)`;
        this.overlay.style.backgroundSize = 'contain';
        this.overlay.style.backgroundRepeat = 'no-repeat';
        this.overlay.style.backgroundPosition = 'bottom center';
    }
}

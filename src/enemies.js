import * as THREE from 'three';
import { ENEMY_TYPES, TILE_SIZE, GUNFIRE_ALERT_RADIUS } from './constants.js';

const STATE = { IDLE: 0, PATROL: 1, ALERT: 2, CHASE: 3, ATTACK: 4, PAIN: 5, DEATH: 6 };

export class EnemyManager {
    constructor(spriteManager, map) {
        this.spriteManager = spriteManager;
        this.map = map;
        this.enemies = [];
    }

    init(entityData) {
        for (const e of entityData) {
            if (e.type === 'item') continue;
            const config = ENEMY_TYPES[e.type];
            if (!config) continue;

            const x = e.x * TILE_SIZE;
            const z = e.y * TILE_SIZE;
            const texPath = `assets/sprites/enemy_${e.type}_front.png`;
            const sprite = this.spriteManager.create(texPath, x, z, {
                width: 0.8,
                height: 0.9,
                anchorBottom: true,
            });

            this.enemies.push({
                type: e.type,
                sprite,
                x,
                z,
                angle: (e.angle || 0) * Math.PI / 180,
                health: config.health,
                maxHealth: config.health,
                speed: config.speed,
                damage: config.damage,
                attackRange: config.attackRange,
                state: STATE.IDLE,
                stateTimer: 0,
                attackCooldown: 0,
                painTimer: 0,
                deathTimer: 0,
                alive: true,
            });
        }
    }

    update(dt, player) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            enemy.stateTimer += dt;
            enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);

            switch (enemy.state) {
                case STATE.IDLE:
                    this.updateIdle(enemy, player);
                    break;
                case STATE.ALERT:
                    this.updateAlert(enemy, dt, player);
                    break;
                case STATE.CHASE:
                    this.updateChase(enemy, dt, player);
                    break;
                case STATE.ATTACK:
                    this.updateAttack(enemy, dt, player);
                    break;
                case STATE.PAIN:
                    this.updatePain(enemy, dt);
                    break;
                case STATE.DEATH:
                    break;
            }

            enemy.sprite.mesh.position.x = enemy.x;
            enemy.sprite.mesh.position.z = enemy.z;
        }
    }

    canSeePlayer(enemy, player) {
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 30) return false;

        const steps = Math.ceil(dist / 0.5);
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const cx = enemy.x + dx * t;
            const cz = enemy.z + dz * t;
            const tx = Math.floor(cx / TILE_SIZE);
            const tz = Math.floor(cz / TILE_SIZE);
            if (this.map.isWall(tx, tz)) return false;
        }
        return true;
    }

    updateIdle(enemy, player) {
        if (this.canSeePlayer(enemy, player)) {
            enemy.state = STATE.ALERT;
            enemy.stateTimer = 0;
        }
    }

    updateAlert(enemy, dt, player) {
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        enemy.angle = Math.atan2(-dz, dx);

        if (enemy.stateTimer > 0.5) {
            enemy.state = STATE.CHASE;
            enemy.stateTimer = 0;
        }
    }

    updateChase(enemy, dt, player) {
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < enemy.attackRange && this.canSeePlayer(enemy, player)) {
            enemy.state = STATE.ATTACK;
            enemy.stateTimer = 0;
            return;
        }

        if (dist > 0.5) {
            const moveX = (dx / dist) * enemy.speed * dt;
            const moveZ = (dz / dist) * enemy.speed * dt;

            const newX = enemy.x + moveX;
            const newZ = enemy.z + moveZ;
            const tileX = Math.floor(newX / TILE_SIZE);
            const tileZ = Math.floor(newZ / TILE_SIZE);

            if (!this.map.isWall(tileX, Math.floor(enemy.z / TILE_SIZE))) {
                enemy.x = newX;
            }
            if (!this.map.isWall(Math.floor(enemy.x / TILE_SIZE), tileZ)) {
                enemy.z = newZ;
            }
        }

        enemy.angle = Math.atan2(-dz, dx);

        if (!this.canSeePlayer(enemy, player) && enemy.stateTimer > 5) {
            enemy.state = STATE.IDLE;
            enemy.stateTimer = 0;
        }
    }

    updateAttack(enemy, dt, player) {
        if (enemy.attackCooldown <= 0) {
            const dmg = enemy.damage[0] + Math.random() * (enemy.damage[1] - enemy.damage[0]);
            player.takeDamage(Math.round(dmg));
            enemy.attackCooldown = 1.0;

            enemy.state = STATE.CHASE;
            enemy.stateTimer = 0;
        }
    }

    updatePain(enemy, dt) {
        enemy.painTimer -= dt;
        if (enemy.painTimer <= 0) {
            enemy.state = STATE.CHASE;
            enemy.stateTimer = 0;
        }
    }

    hitEnemy(enemy, damage) {
        if (!enemy.alive) return;

        enemy.health -= damage;
        if (enemy.health <= 0) {
            enemy.alive = false;
            enemy.state = STATE.DEATH;
            enemy.sprite.mesh.position.y = 0.1;
            enemy.sprite.mesh.scale.set(1, 0.3, 1);
        } else {
            enemy.state = STATE.PAIN;
            enemy.painTimer = 0.3;
        }
    }

    alertNearby(x, z) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (enemy.state === STATE.IDLE || enemy.state === STATE.PATROL) {
                const dx = enemy.x - x;
                const dz = enemy.z - z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < GUNFIRE_ALERT_RADIUS) {
                    enemy.state = STATE.ALERT;
                    enemy.stateTimer = 0;
                }
            }
        }
    }

    get totalEnemies() {
        return this.enemies.length;
    }

    get killedEnemies() {
        return this.enemies.filter(e => !e.alive).length;
    }
}

import * as THREE from 'three';
import { ENEMY_TYPES, TILE_SIZE, GUNFIRE_ALERT_RADIUS } from './constants.js';
import { ENEMY_SPRITE_BASE } from './sprites.js';

const STATE = { IDLE: 0, PATROL: 1, ALERT: 2, CHASE: 3, ATTACK: 4, PAIN: 5, DEATH: 6 };

const ENEMY_DROPS = {
    guard: 'ammo_clip',
    ss: 'machine_gun',
    dog: null,
};

export class EnemyManager {
    constructor(spriteManager, map) {
        this.spriteManager = spriteManager;
        this.map = map;
        this.enemies = [];
        this.itemManager = null;
    }

    init(entityData) {
        for (const e of entityData) {
            if (e.type === 'item') continue;
            const config = ENEMY_TYPES[e.type];
            if (!config) continue;

            const x = (e.x + 0.5) * TILE_SIZE;
            const z = (e.y + 0.5) * TILE_SIZE;
            const texPath = `assets/sprites/enemy_${e.type}_front.png`;
            const enemyColors = { guard: '#4466AA', ss: '#666666', dog: '#8B6914' };
            const sprite = this.spriteManager.create(texPath, x, z, {
                width: 1.0,
                height: 1.0,
                anchorBottom: true,
                label: e.type,
                color: enemyColors[e.type] || '#AA4444',
            });

            const spriteBase = ENEMY_SPRITE_BASE[e.type] || null;

            this.enemies.push({
                type: e.type,
                sprite,
                spriteBase,
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
            // Dead enemies with finished death animation — skip entirely
            if (!enemy.alive && enemy.state !== STATE.DEATH) continue;

            enemy.stateTimer += dt;
            if (enemy.alive) {
                enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
            }

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
                    this.updateDeath(enemy, dt);
                    break;
            }

            enemy.sprite.mesh.position.x = enemy.x;
            enemy.sprite.mesh.position.z = enemy.z;

            this.updateSpriteFrame(enemy, player);
        }
    }

    updateSpriteFrame(enemy, player) {
        if (!enemy.spriteBase) return;
        const base = enemy.spriteBase;

        let spriteIdx;
        if (enemy.state === STATE.DEATH) {
            // Animate through die1→die2→die3→dead
            const deathFrames = [base.die1, base.die2, base.die3, base.dead];
            const frameIdx = Math.min(Math.floor(enemy.deathTimer / 0.15), 3);
            spriteIdx = deathFrames[frameIdx];
        } else if (enemy.state === STATE.PAIN) {
            spriteIdx = base.pain != null ? base.pain : base.die1;
        } else if (enemy.state === STATE.ATTACK) {
            // 3-frame shoot animation: raise, fire(flash), lower
            const shootFrames = [base.shoot1, base.shoot2, base.shoot3];
            const frameIdx = Math.min(Math.floor(enemy.attackTimer / 0.25), 2);
            spriteIdx = shootFrames[frameIdx];
        } else {
            // Standing/walking — pick direction based on camera angle
            const dir = this.getDirection(enemy, player);
            if (enemy.state === STATE.CHASE) {
                // Alternate walk frames (4 frames × 8 directions)
                const walkFrame = Math.floor(enemy.stateTimer * 4) % 4;
                const walkAnims = [base.walk1, base.walk2, base.walk3, base.walk4];
                spriteIdx = walkAnims[walkFrame] + dir;
            } else {
                spriteIdx = base.stand + dir;
            }
        }

        this.spriteManager.setVswapTexture(enemy.sprite, spriteIdx);
    }

    getDirection(enemy, player) {
        // Calculate which of 8 directions to show based on enemy facing vs camera angle
        // Direction 0 = facing camera, 4 = facing away
        const dx = player.x - enemy.x;
        const dz = player.z - enemy.z;
        // Use same sign convention as enemy.angle (atan2(-dz, dx))
        const angleToPlayer = Math.atan2(-dz, dx);
        let diff = enemy.angle - angleToPlayer;
        // Normalize to [0, 2PI]
        diff = ((diff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        // Map to 8 directions (each 45 degrees)
        const dir = Math.round(diff / (Math.PI / 4)) % 8;
        return dir;
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
            // isSolid blocks walls AND closed doors (-1)
            if (this.map.isSolid(tx, tz)) return false;
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

        if (dist < enemy.attackRange && enemy.attackCooldown <= 0 && this.canSeePlayer(enemy, player)) {
            enemy.state = STATE.ATTACK;
            enemy.stateTimer = 0;
            enemy.attackTimer = 0;
            enemy.attackHit = false;
            enemy.angle = Math.atan2(-dz, dx);
            return;
        }

        if (dist > 0.5) {
            const moveX = (dx / dist) * enemy.speed * dt;
            const moveZ = (dz / dist) * enemy.speed * dt;

            const newX = enemy.x + moveX;
            const newZ = enemy.z + moveZ;
            const tileX = Math.floor(newX / TILE_SIZE);
            const tileZ = Math.floor(newZ / TILE_SIZE);

            if (!this.map.isSolid(tileX, Math.floor(enemy.z / TILE_SIZE))) {
                enemy.x = newX;
            }
            if (!this.map.isSolid(Math.floor(enemy.x / TILE_SIZE), tileZ)) {
                enemy.z = newZ;
            }
        }

        enemy.angle = Math.atan2(-dz, dx);

        if (!this.canSeePlayer(enemy, player)) {
            enemy.state = STATE.IDLE;
            enemy.stateTimer = 0;
        }
    }

    updateAttack(enemy, dt, player) {
        enemy.attackTimer += dt;

        // Deal damage on frame 2 (fire flash, at 0.25s)
        if (!enemy.attackHit && enemy.attackTimer >= 0.25) {
            enemy.attackHit = true;
            if (this.canSeePlayer(enemy, player)) {
                const dmg = enemy.damage[0] + Math.random() * (enemy.damage[1] - enemy.damage[0]);
                player.takeDamage(Math.round(dmg));
            }
        }

        // Animation done after 3 frames × 0.25s = 0.75s
        if (enemy.attackTimer >= 0.75) {
            enemy.attackCooldown = 0.5;
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

    updateDeath(enemy, dt) {
        enemy.deathTimer += dt;
        // Death animation: 4 frames × 0.15s = 0.6s total
        if (enemy.deathTimer >= 0.6) {
            enemy.alive = false;
        }
    }

    hitEnemy(enemy, damage, player) {
        if (!enemy.alive || enemy.state === STATE.DEATH) return;

        enemy.health -= damage;
        if (enemy.health <= 0) {
            enemy.state = STATE.DEATH;
            enemy.deathTimer = 0;
            // Face the player when dying
            if (player) {
                const dx = player.x - enemy.x;
                const dz = player.z - enemy.z;
                enemy.angle = Math.atan2(-dz, dx);
            }
            // Drop item
            const drop = ENEMY_DROPS[enemy.type];
            if (drop && this.itemManager) {
                this.itemManager.spawnDrop(drop, enemy.x, enemy.z);
            }
        } else {
            enemy.state = STATE.PAIN;
            enemy.painTimer = 0.3;
            // Face the player when hit
            if (player) {
                const dx = player.x - enemy.x;
                const dz = player.z - enemy.z;
                enemy.angle = Math.atan2(-dz, dx);
            }
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
        return this.enemies.filter(e => !e.alive || e.state === STATE.DEATH).length;
    }
}

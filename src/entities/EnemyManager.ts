import { EnemyState } from '../core/GameState.js';
import {
  ENEMY_TYPES,
  ENEMY_DROPS,
  TILE_SIZE,
  GUNFIRE_ALERT_RADIUS,
} from '../core/constants.js';
import type { EnemyConfig, EntityData } from '../types/index.js';
import type { Enemy } from './Enemy.js';
import { canSeeTarget, hitEnemy } from './EnemyAI.js';
import { getDirection, getSpriteIndex } from './SpriteAnimator.js';
import type { SpriteHandle } from '../sprites/SpriteManager.js';
import type { SpriteManager } from '../sprites/SpriteManager.js';
import type { GameMap } from '../map/GameMap.js';
import type { EnemySpriteSet } from '../sprites/SpriteConfig.js';
import { ENEMY_SPRITE_BASE } from '../sprites/SpriteConfig.js';

/** Minimal player interface required by EnemyManager. */
export interface EnemyTarget {
  x: number;
  z: number;
  takeDamage(amount: number): void;
}

/** Minimal item manager interface for enemy drops. */
export interface ItemDropper {
  spawnDrop(subtype: string, x: number, z: number): void;
}

/** Internal enemy instance with sprite and animation data. */
interface EnemyInstance extends Enemy {
  type: string;
  sprite: SpriteHandle;
  spriteBase: EnemySpriteSet | null;
}

const ENEMY_COLORS: Record<string, string> = {
  guard: '#4466AA',
  ss: '#666666',
  dog: '#8B6914',
  mutant: '#44AA44',
  officer: '#EEEEEE',
  boss: '#AA2222',
};

export class EnemyManager {
  private spriteManager: SpriteManager;
  private map: GameMap;
  enemies: EnemyInstance[] = [];
  itemManager: ItemDropper | null = null;

  constructor(spriteManager: SpriteManager, map: GameMap, itemManager: ItemDropper | null = null) {
    this.spriteManager = spriteManager;
    this.map = map;
    this.itemManager = itemManager;
  }

  init(entityData: EntityData[]): void {
    for (const e of entityData) {
      if (e.type === 'item') continue;
      const config: EnemyConfig | undefined = ENEMY_TYPES[e.type];
      if (!config) continue;

      const x = (e.x + 0.5) * TILE_SIZE;
      const z = (e.y + 0.5) * TILE_SIZE;
      const texPath = `assets/sprites/enemy_${e.type}_front.png`;
      const isBoss = e.type === 'boss';
      const sprite = this.spriteManager.create(texPath, x, z, {
        width: isBoss ? 1.5 : 1.0,
        height: isBoss ? 1.5 : 1.0,
        anchorBottom: true,
        label: e.type,
        color: ENEMY_COLORS[e.type] || '#AA4444',
      });

      const spriteBase: EnemySpriteSet | null = ENEMY_SPRITE_BASE[e.type] ?? null;

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
        state: EnemyState.Idle,
        stateTimer: 0,
        attackCooldown: 0,
        attackTimer: 0,
        attackHit: false,
        painTimer: 0,
        deathTimer: 0,
        alive: true,
      });
    }
  }

  update(dt: number, player: EnemyTarget): void {
    for (const enemy of this.enemies) {
      // Dead enemies with finished death animation -- skip entirely
      if (!enemy.alive && enemy.state !== EnemyState.Death) continue;

      enemy.stateTimer += dt;
      if (enemy.alive) {
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      }

      switch (enemy.state) {
        case EnemyState.Idle:
          this.updateIdle(enemy, player);
          break;
        case EnemyState.Alert:
          this.updateAlert(enemy, dt, player);
          break;
        case EnemyState.Chase:
          this.updateChase(enemy, dt, player);
          break;
        case EnemyState.Attack:
          this.updateAttack(enemy, dt, player);
          break;
        case EnemyState.Pain:
          this.updatePain(enemy, dt);
          break;
        case EnemyState.Death:
          this.updateDeath(enemy, dt);
          break;
      }

      enemy.sprite.mesh.position.x = enemy.x;
      enemy.sprite.mesh.position.z = enemy.z;

      this.updateSpriteFrame(enemy, player);
    }
  }

  private updateSpriteFrame(enemy: EnemyInstance, player: EnemyTarget): void {
    if (!enemy.spriteBase) return;

    const dir = getDirection(enemy, player.x, player.z);
    const spriteIdx = getSpriteIndex(
      enemy.state,
      enemy.spriteBase,
      enemy.stateTimer,
      enemy.deathTimer,
      enemy.attackTimer,
      dir,
    );
    this.spriteManager.setVswapTexture(enemy.sprite, spriteIdx);
  }

  private canSeePlayer(enemy: EnemyInstance, player: EnemyTarget): boolean {
    return canSeeTarget(
      enemy.x, enemy.z,
      player.x, player.z,
      (tx, ty) => this.map.isSolid(tx, ty),
    );
  }

  private updateIdle(enemy: EnemyInstance, player: EnemyTarget): void {
    if (this.canSeePlayer(enemy, player)) {
      enemy.state = EnemyState.Alert;
      enemy.stateTimer = 0;
    }
  }

  private updateAlert(enemy: EnemyInstance, _dt: number, player: EnemyTarget): void {
    const dx = player.x - enemy.x;
    const dz = player.z - enemy.z;
    enemy.angle = Math.atan2(-dz, dx);

    if (enemy.stateTimer > 0.5) {
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
    }
  }

  private updateChase(enemy: EnemyInstance, dt: number, player: EnemyTarget): void {
    const dx = player.x - enemy.x;
    const dz = player.z - enemy.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < enemy.attackRange && enemy.attackCooldown <= 0 && this.canSeePlayer(enemy, player)) {
      enemy.state = EnemyState.Attack;
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
      enemy.state = EnemyState.Idle;
      enemy.stateTimer = 0;
    }
  }

  private updateAttack(enemy: EnemyInstance, dt: number, player: EnemyTarget): void {
    enemy.attackTimer += dt;

    // Deal damage on frame 2 (fire flash, at 0.25s)
    if (!enemy.attackHit && enemy.attackTimer >= 0.25) {
      enemy.attackHit = true;
      if (this.canSeePlayer(enemy, player)) {
        const dmg = enemy.damage[0] + Math.random() * (enemy.damage[1] - enemy.damage[0]);
        player.takeDamage(Math.round(dmg));
      }
    }

    // Animation done after 3 frames x 0.25s = 0.75s
    if (enemy.attackTimer >= 0.75) {
      enemy.attackCooldown = 0.5;
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
    }
  }

  private updatePain(enemy: EnemyInstance, dt: number): void {
    enemy.painTimer -= dt;
    if (enemy.painTimer <= 0) {
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
    }
  }

  private updateDeath(enemy: EnemyInstance, dt: number): void {
    enemy.deathTimer += dt;
    // Death animation: 4 frames x 0.15s = 0.6s total
    if (enemy.deathTimer >= 0.6) {
      enemy.alive = false;
    }
  }

  hitEnemy(enemy: EnemyInstance, damage: number, player: EnemyTarget): void {
    if (!enemy.alive || enemy.state === EnemyState.Death) return;

    hitEnemy(enemy, damage, player.x, player.z);

    // Drop item on death
    if (enemy.health <= 0) {
      const drop = ENEMY_DROPS[enemy.type];
      if (drop && this.itemManager) {
        this.itemManager.spawnDrop(drop, enemy.x, enemy.z);
      }
    }
  }

  alertNearby(x: number, z: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.state === EnemyState.Idle) {
        const dx = enemy.x - x;
        const dz = enemy.z - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < GUNFIRE_ALERT_RADIUS) {
          enemy.state = EnemyState.Alert;
          enemy.stateTimer = 0;
        }
      }
    }
  }

  get totalEnemies(): number {
    return this.enemies.length;
  }

  get killedEnemies(): number {
    return this.enemies.filter(e => !e.alive || e.state === EnemyState.Death).length;
  }

  getEnemies(): readonly EnemyInstance[] {
    return this.enemies;
  }
}

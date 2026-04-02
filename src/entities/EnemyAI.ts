import { EnemyState } from '../core/GameState.js';
import {
  ENEMY_SIGHT_RANGE,
  ENEMY_ALERT_DELAY,
  ENEMY_PAIN_DURATION,
  ENEMY_FLEE_THRESHOLD,
  TILE_SIZE,
} from '../core/constants.js';
import type { Enemy } from './Enemy.js';

export function canSeeTarget(
  ex: number, ez: number,
  tx: number, tz: number,
  isSolid: (tileX: number, tileY: number) => boolean,
): boolean {
  const dx = tx - ex;
  const dz = tz - ez;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > ENEMY_SIGHT_RANGE) return false;

  const steps = Math.ceil(dist / 0.5);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = ex + dx * t;
    const cz = ez + dz * t;
    const tileX = Math.floor(cx / TILE_SIZE);
    const tileZ = Math.floor(cz / TILE_SIZE);
    if (isSolid(tileX, tileZ)) return false;
  }
  return true;
}

export function transitionState(
  enemy: Enemy,
  canSeePlayer: boolean,
  distToPlayer: number,
): EnemyState {
  switch (enemy.state) {
    case EnemyState.Idle:
      return canSeePlayer ? EnemyState.Alert : EnemyState.Idle;

    case EnemyState.Alert:
      return enemy.stateTimer > ENEMY_ALERT_DELAY ? EnemyState.Chase : EnemyState.Alert;

    case EnemyState.Chase: {
      // Low health flee (not boss or dog)
      if (enemy.type !== 'boss' && enemy.type !== 'dog' &&
          enemy.health < enemy.maxHealth * ENEMY_FLEE_THRESHOLD && enemy.health > 0) {
        return EnemyState.Flee;
      }
      if (distToPlayer < enemy.attackRange && enemy.attackCooldown <= 0 && canSeePlayer) {
        return EnemyState.Attack;
      }
      // Lost sight → investigate last known position
      return canSeePlayer ? EnemyState.Chase : EnemyState.Investigate;
    }

    case EnemyState.Investigate: {
      // If we see the player again while investigating, chase
      if (canSeePlayer) return EnemyState.Chase;
      // Reached last known position (handled in EnemyManager) → stay until timer expires
      return EnemyState.Investigate;
    }

    case EnemyState.Flee:
      if (enemy.fleeTimer <= 0) return EnemyState.Chase;
      return EnemyState.Flee;

    case EnemyState.Pain:
      return enemy.painTimer <= 0 ? EnemyState.Chase : EnemyState.Pain;

    case EnemyState.Attack:
    case EnemyState.Death:
      return enemy.state;

    default:
      return enemy.state;
  }
}

export function hitEnemy(enemy: Enemy, damage: number, playerX: number, playerZ: number): void {
  if (!enemy.alive || enemy.state === EnemyState.Death) return;

  enemy.health -= damage;
  const dx = playerX - enemy.x;
  const dz = playerZ - enemy.z;
  enemy.angle = Math.atan2(-dz, dx);

  if (enemy.health <= 0) {
    enemy.state = EnemyState.Death;
    enemy.deathTimer = 0;
  } else {
    enemy.state = EnemyState.Pain;
    enemy.painTimer = ENEMY_PAIN_DURATION;
  }
}

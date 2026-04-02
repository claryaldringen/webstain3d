import { EnemyState } from '../core/GameState.js';
import type { EnemySpriteSet } from '../sprites/SpriteConfig.js';

/** Minimal position/angle interface for direction calculations. */
export interface Positioned {
  x: number;
  z: number;
  angle: number;
}

/**
 * Calculate which of 8 sprite directions to display based on
 * the enemy's facing angle vs. the camera/player position.
 *
 * Direction 0 = facing camera, 4 = facing away.
 */
export function getDirection(enemy: Positioned, playerX: number, playerZ: number): number {
  const dx = playerX - enemy.x;
  const dz = playerZ - enemy.z;
  const angleToPlayer = Math.atan2(-dz, dx);
  let diff = enemy.angle - angleToPlayer;
  // Normalize to [0, 2PI]
  diff = ((diff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // Map to 8 directions (each 45 degrees)
  const dir = Math.round(diff / (Math.PI / 4)) % 8;
  return dir;
}

/**
 * Determine the correct VSWAP sprite index for an enemy based on
 * its current state, animation timers, and direction to the player.
 */
export function getSpriteIndex(
  state: EnemyState,
  spriteBase: EnemySpriteSet,
  stateTimer: number,
  deathTimer: number,
  attackTimer: number,
  direction: number,
): number {
  switch (state) {
    case EnemyState.Death: {
      // Animate through die1 -> die2 -> die3 -> dead
      const deathFrames = [spriteBase.die1, spriteBase.die2, spriteBase.die3, spriteBase.dead];
      const frameIdx = Math.min(Math.floor(deathTimer / 0.15), 3);
      return deathFrames[frameIdx]!;
    }

    case EnemyState.Pain:
      return spriteBase.pain != null ? spriteBase.pain : spriteBase.die1;

    case EnemyState.Attack: {
      // 3-frame shoot animation: raise, fire(flash), lower
      const shootFrames = [spriteBase.shoot1, spriteBase.shoot2, spriteBase.shoot3];
      const frameIdx = Math.min(Math.floor(attackTimer / 0.25), 2);
      return shootFrames[frameIdx]!;
    }

    case EnemyState.Chase:
    case EnemyState.Investigate:
    case EnemyState.Flee: {
      // Walking — alternate walk frames (4 frames x 8 directions)
      const walkFrame = Math.floor(stateTimer * 4) % 4;
      const walkAnims = [spriteBase.walk1, spriteBase.walk2, spriteBase.walk3, spriteBase.walk4];
      return walkAnims[walkFrame]! + (spriteBase.directional !== false ? direction : 0);
    }

    default:
      // Idle / Alert — standing, pick direction
      return spriteBase.stand + (spriteBase.directional !== false ? direction : 0);
  }
}

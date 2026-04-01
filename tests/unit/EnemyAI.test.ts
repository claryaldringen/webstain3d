import { describe, it, expect } from 'vitest';
import { EnemyState } from '../../src/core/GameState.js';
import { transitionState, canSeeTarget } from '../../src/entities/EnemyAI.js';
import type { Enemy } from '../../src/entities/Enemy.js';
import { ENEMY_ALERT_DELAY, ENEMY_PAIN_DURATION } from '../../src/core/constants.js';

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    type: 'guard', x: 5, z: 5, angle: 0,
    health: 25, maxHealth: 25, speed: 1.5,
    damage: [5, 15] as [number, number], attackRange: 2,
    state: EnemyState.Idle, stateTimer: 0,
    attackCooldown: 0, attackTimer: 0, attackHit: false,
    painTimer: 0, deathTimer: 0, alive: true,
    ...overrides,
  };
}

describe('EnemyAI', () => {
  describe('canSeeTarget', () => {
    it('returns true with clear line of sight', () => {
      const isWall = () => false;
      expect(canSeeTarget(5, 5, 8, 5, isWall)).toBe(true);
    });

    it('returns false when wall blocks line of sight', () => {
      const isWall = (tx: number, ty: number) => tx === 6 && ty === 5;
      expect(canSeeTarget(5, 5, 8, 5, isWall)).toBe(false);
    });

    it('returns false beyond sight range', () => {
      const isWall = () => false;
      expect(canSeeTarget(0, 0, 50, 0, isWall)).toBe(false);
    });
  });

  describe('transitionState', () => {
    it('idle → alert when player visible', () => {
      const enemy = makeEnemy({ state: EnemyState.Idle });
      const result = transitionState(enemy, true, 3.0);
      expect(result).toBe(EnemyState.Alert);
    });

    it('idle stays idle when player not visible', () => {
      const enemy = makeEnemy({ state: EnemyState.Idle });
      const result = transitionState(enemy, false, 3.0);
      expect(result).toBe(EnemyState.Idle);
    });

    it('alert → chase after delay', () => {
      const enemy = makeEnemy({ state: EnemyState.Alert, stateTimer: ENEMY_ALERT_DELAY + 0.1 });
      const result = transitionState(enemy, true, 3.0);
      expect(result).toBe(EnemyState.Chase);
    });

    it('chase → attack when in range', () => {
      const enemy = makeEnemy({ state: EnemyState.Chase, attackCooldown: 0, attackRange: 2 });
      const result = transitionState(enemy, true, 1.5);
      expect(result).toBe(EnemyState.Attack);
    });

    it('chase → idle when player not visible', () => {
      const enemy = makeEnemy({ state: EnemyState.Chase });
      const result = transitionState(enemy, false, 10);
      expect(result).toBe(EnemyState.Idle);
    });

    it('pain → chase after timer', () => {
      const enemy = makeEnemy({ state: EnemyState.Pain, painTimer: -0.1 });
      const result = transitionState(enemy, true, 5);
      expect(result).toBe(EnemyState.Chase);
    });
  });
});

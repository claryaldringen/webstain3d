import { describe, it, expect } from 'vitest';
import { hitscanCheck, updateWeaponCooldown } from '../../src/systems/WeaponSystem.js';
import type { Enemy } from '../../src/entities/Enemy.js';
import { EnemyState } from '../../src/core/GameState.js';

function makeTarget(x: number, z: number): Enemy {
  return {
    type: 'guard', x, z, angle: 0, health: 25, maxHealth: 25,
    speed: 1.5, damage: [5, 15], attackRange: 2,
    state: EnemyState.Idle, stateTimer: 0, attackCooldown: 0,
    attackTimer: 0, attackHit: false, painTimer: 0, deathTimer: 0, alive: true,
  };
}

describe('WeaponSystem', () => {
  describe('hitscanCheck', () => {
    it('hits enemy directly in front', () => {
      const enemies = [makeTarget(5, 3)];
      const hit = hitscanCheck(5, 5, 0, -1, 64, enemies);
      expect(hit).toBe(enemies[0]);
    });

    it('misses enemy behind player', () => {
      const enemies = [makeTarget(5, 8)];
      const hit = hitscanCheck(5, 5, 0, -1, 64, enemies);
      expect(hit).toBeNull();
    });

    it('misses enemy too far to the side', () => {
      const enemies = [makeTarget(8, 3)];
      const hit = hitscanCheck(5, 5, 0, -1, 64, enemies);
      expect(hit).toBeNull();
    });

    it('picks closest enemy when multiple in line', () => {
      const near = makeTarget(5, 4);
      const far = makeTarget(5, 2);
      const enemies = [far, near];
      const hit = hitscanCheck(5, 5, 0, -1, 64, enemies);
      expect(hit).toBe(near);
    });

    it('ignores dead enemies', () => {
      const dead = makeTarget(5, 3);
      dead.alive = false;
      const hit = hitscanCheck(5, 5, 0, -1, 64, [dead]);
      expect(hit).toBeNull();
    });
  });

  describe('updateWeaponCooldown', () => {
    it('reduces cooldown by dt', () => {
      expect(updateWeaponCooldown(0.5, 0.2)).toBeCloseTo(0.3);
    });

    it('clamps to zero', () => {
      expect(updateWeaponCooldown(0.1, 0.5)).toBe(0);
    });
  });
});

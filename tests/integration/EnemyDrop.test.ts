import { describe, it, expect } from 'vitest';
import { Player } from '../../src/entities/Player.js';
import type { Enemy } from '../../src/entities/Enemy.js';
import { EnemyState } from '../../src/core/GameState.js';
import { hitEnemy } from '../../src/entities/EnemyAI.js';
import { applyItemEffect, type ItemInstance, checkPickup } from '../../src/systems/ItemManager.js';
import { ENEMY_DROPS } from '../../src/core/constants.js';

describe('Enemy Drop → Item Pickup flow', () => {
  it('killing a guard drops ammo clip that player can pick up', () => {
    const player = new Player();
    player.spawn({ x: 5, y: 5, angle: 0 });
    const initialAmmo = player.ammo;

    const enemy: Enemy = {
      type: 'guard', x: player.x + 0.2, z: player.z + 0.1, angle: 0,
      health: 5, maxHealth: 25, speed: 1.5,
      damage: [5, 15], attackRange: 2,
      state: EnemyState.Chase, stateTimer: 0, attackCooldown: 0,
      attackTimer: 0, attackHit: false, painTimer: 0, deathTimer: 0, alive: true,
    };

    hitEnemy(enemy, 100, player.x, player.z);
    expect(enemy.state).toBe(EnemyState.Death);

    const dropType = ENEMY_DROPS[enemy.type];
    expect(dropType).toBe('ammo_clip');

    const droppedItem: ItemInstance = {
      subtype: dropType!,
      x: enemy.x,
      z: enemy.z,
      collected: false,
    };

    expect(checkPickup(droppedItem, player.x, player.z)).toBe(true);

    const collected = applyItemEffect(droppedItem.subtype, player);
    expect(collected).toBe(true);
    expect(player.ammo).toBe(initialAmmo + 8);
  });

  it('killing a dog drops nothing', () => {
    expect(ENEMY_DROPS['dog']).toBeNull();
  });
});

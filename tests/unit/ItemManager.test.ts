import { describe, it, expect } from 'vitest';
import { applyItemEffect } from '../../src/systems/ItemManager.js';
import { Player } from '../../src/entities/Player.js';
import { WeaponId } from '../../src/core/constants.js';

describe('applyItemEffect', () => {
  it('applies health pickup', () => {
    const player = new Player();
    player.takeDamage(50);
    const result = applyItemEffect('food', player);
    expect(result).toBe(true);
    expect(player.health).toBe(54);
  });

  it('rejects health pickup at max health', () => {
    const player = new Player();
    const result = applyItemEffect('food', player);
    expect(result).toBe(false);
  });

  it('applies ammo pickup', () => {
    const player = new Player();
    const result = applyItemEffect('ammo_clip', player);
    expect(result).toBe(true);
    expect(player.ammo).toBe(16);
  });

  it('applies score pickup', () => {
    const player = new Player();
    const result = applyItemEffect('cross', player);
    expect(result).toBe(true);
    expect(player.score).toBe(100);
  });

  it('applies key pickup', () => {
    const player = new Player();
    const result = applyItemEffect('key_gold', player);
    expect(result).toBe(true);
    expect(player.hasKey('gold')).toBe(true);
  });

  it('applies weapon pickup', () => {
    const player = new Player();
    const result = applyItemEffect('machine_gun', player);
    expect(result).toBe(true);
    expect(player.weapons[WeaponId.MachineGun]).toBe(true);
  });

  it('returns false for unknown item', () => {
    const player = new Player();
    const result = applyItemEffect('unknown_item', player);
    expect(result).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/entities/Player.js';
import { PLAYER_START_HEALTH, PLAYER_MAX_HEALTH, PLAYER_START_AMMO, WeaponId } from '../../src/core/constants.js';

describe('Player', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player();
  });

  it('initializes with default values', () => {
    expect(player.health).toBe(PLAYER_START_HEALTH);
    expect(player.ammo).toBe(PLAYER_START_AMMO);
    expect(player.currentWeapon).toBe(WeaponId.Pistol);
    expect(player.isDead).toBe(false);
  });

  it('spawns at correct position', () => {
    player.spawn({ x: 8, y: 8, angle: 90 });
    expect(player.x).toBeCloseTo(8.5);
    expect(player.z).toBeCloseTo(8.5);
    expect(player.angle).toBeCloseTo(Math.PI / 2);
  });

  it('takes damage and reduces health', () => {
    player.takeDamage(30);
    expect(player.health).toBe(70);
  });

  it('clamps health to 0 on lethal damage', () => {
    player.takeDamage(150);
    expect(player.health).toBe(0);
    expect(player.isDead).toBe(true);
  });

  it('heals up to max health', () => {
    player.takeDamage(50);
    const healed = player.heal(30);
    expect(healed).toBe(true);
    expect(player.health).toBe(80);
  });

  it('refuses to heal at max health', () => {
    const healed = player.heal(10);
    expect(healed).toBe(false);
    expect(player.health).toBe(PLAYER_MAX_HEALTH);
  });

  it('adds ammo', () => {
    player.addAmmo(10);
    expect(player.ammo).toBe(PLAYER_START_AMMO + 10);
  });

  it('manages keys', () => {
    expect(player.hasKey('gold')).toBe(false);
    player.addKey('gold');
    expect(player.hasKey('gold')).toBe(true);
  });

  it('adds weapon and switches to it', () => {
    expect(player.weapons[WeaponId.MachineGun]).toBe(false);
    player.addWeapon(WeaponId.MachineGun);
    expect(player.weapons[WeaponId.MachineGun]).toBe(true);
    expect(player.currentWeapon).toBe(WeaponId.MachineGun);
  });

  it('tracks score', () => {
    player.addScore(500);
    player.addScore(100);
    expect(player.score).toBe(600);
  });
});

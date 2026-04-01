import { WeaponId, WEAPON_FIRE_RATES, WEAPON_RANGE, WEAPON_DAMAGE_MIN, WEAPON_DAMAGE_MAX } from '../core/constants.js';
import type { Enemy } from '../entities/Enemy.js';
import { hitEnemy } from '../entities/EnemyAI.js';
import type { Player } from '../entities/Player.js';

export function hitscanCheck(
  px: number, pz: number,
  dirX: number, dirZ: number,
  range: number,
  enemies: readonly Enemy[],
): Enemy | null {
  let closestEnemy: Enemy | null = null;
  let closestDist = range;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const dx = enemy.x - px;
    const dz = enemy.z - pz;
    const dot = dx * dirX + dz * dirZ;
    if (dot < 0 || dot > range) continue;

    const perpX = dx - dirX * dot;
    const perpZ = dz - dirZ * dot;
    const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
    if (perpDist > 0.5) continue;

    if (dot < closestDist) {
      closestDist = dot;
      closestEnemy = enemy;
    }
  }

  return closestEnemy;
}

export function updateWeaponCooldown(current: number, dt: number): number {
  return Math.max(0, current - dt);
}

export function fireWeapon(
  player: Player,
  enemies: readonly Enemy[],
  alertCallback: (x: number, z: number) => void,
): { hit: boolean; weapon: WeaponId } {
  const weapon = player.currentWeapon;

  if (weapon !== WeaponId.Knife && player.ammo <= 0) {
    return { hit: false, weapon };
  }
  if (weapon !== WeaponId.Knife) {
    player.ammo--;
  }

  alertCallback(player.x, player.z);

  const range = WEAPON_RANGE[weapon];
  const dirX = -Math.sin(player.angle);
  const dirZ = -Math.cos(player.angle);

  const target = hitscanCheck(player.x, player.z, dirX, dirZ, range, enemies);

  if (target) {
    const damage = WEAPON_DAMAGE_MIN + Math.random() * (WEAPON_DAMAGE_MAX - WEAPON_DAMAGE_MIN);
    hitEnemy(target, Math.round(damage), player.x, player.z);
  }

  return { hit: !!target, weapon };
}

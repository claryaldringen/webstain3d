import { ITEM_EFFECTS, ITEM_PICKUP_RADIUS, WeaponId } from '../core/constants.js';
import type { Player } from '../entities/Player.js';

export interface ItemInstance {
  subtype: string;
  x: number;
  z: number;
  collected: boolean;
  sprite?: any; // SpriteHandle reference for removal on pickup
}

export function applyItemEffect(subtype: string, player: Player): boolean {
  const effect = ITEM_EFFECTS[subtype];
  if (!effect) return false;

  switch (effect.type) {
    case 'health':
      return player.heal(effect.value as number);
    case 'ammo':
      return player.addAmmo(effect.value as number);
    case 'score':
      player.addScore(effect.value as number);
      return true;
    case 'key':
      player.addKey(effect.value as string);
      return true;
    case 'life':
      player.lives += effect.value as number;
      return true;
    case 'weapon':
      player.addWeapon(effect.value as WeaponId);
      return true;
    default:
      return false;
  }
}

export function checkPickup(item: ItemInstance, playerX: number, playerZ: number): boolean {
  if (item.collected) return false;
  const dx = playerX - item.x;
  const dz = playerZ - item.z;
  return Math.sqrt(dx * dx + dz * dz) < ITEM_PICKUP_RADIUS;
}

import {
  PLAYER_START_HEALTH, PLAYER_MAX_HEALTH, PLAYER_START_LIVES,
  PLAYER_START_AMMO, PLAYER_MOVE_SPEED, PLAYER_SPRINT_MULTIPLIER,
  PLAYER_ROTATE_SPEED, PLAYER_RADIUS, TILE_SIZE, WeaponId,
} from '../core/constants.js';
import { checkCollision } from '../systems/CollisionSystem.js';
import type { PlayerStartData, MovementInput } from '../types/index.js';

export class Player {
  x = 0;
  z = 0;
  angle = 0;
  health = PLAYER_START_HEALTH;
  lives = PLAYER_START_LIVES;
  ammo = PLAYER_START_AMMO;
  score = 0;
  currentWeapon: WeaponId = WeaponId.Pistol;
  weapons: boolean[] = [true, true, false, false];
  keys: Record<string, boolean> = { gold: false, silver: false };

  private isSolid: ((tx: number, ty: number) => boolean) | null = null;

  setCollisionCallback(isSolid: (tx: number, ty: number) => boolean): void {
    this.isSolid = isSolid;
  }

  spawn(start: PlayerStartData): void {
    this.x = start.x * TILE_SIZE + 0.5;
    this.z = start.y * TILE_SIZE + 0.5;
    this.angle = (start.angle || 0) * Math.PI / 180;
  }

  update(dt: number, movement: MovementInput): void {
    const speed = PLAYER_MOVE_SPEED * (movement.sprint ? PLAYER_SPRINT_MULTIPLIER : 1);
    this.angle += movement.rotate * PLAYER_ROTATE_SPEED * dt;

    const dirX = -Math.sin(this.angle);
    const dirZ = -Math.cos(this.angle);
    const strafeX = Math.cos(this.angle);
    const strafeZ = -Math.sin(this.angle);

    const dx = (dirX * movement.forward + strafeX * movement.strafe) * speed * dt;
    const dz = (dirZ * movement.forward + strafeZ * movement.strafe) * speed * dt;

    if (dx !== 0) {
      const newX = this.x + dx;
      if (!this.collides(newX, this.z)) {
        this.x = newX;
      }
    }
    if (dz !== 0) {
      const newZ = this.z + dz;
      if (!this.collides(this.x, newZ)) {
        this.z = newZ;
      }
    }
  }

  private collides(px: number, pz: number): boolean {
    if (!this.isSolid) return false;
    return checkCollision(px, pz, PLAYER_RADIUS, this.isSolid, TILE_SIZE);
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
    }
    return true;
  }

  heal(amount: number): boolean {
    if (this.health >= PLAYER_MAX_HEALTH) return false;
    this.health = Math.min(PLAYER_MAX_HEALTH, this.health + amount);
    return true;
  }

  addAmmo(amount: number): boolean {
    this.ammo += amount;
    return true;
  }

  addScore(amount: number): void {
    this.score += amount;
  }

  addKey(keyType: string): void {
    this.keys[keyType] = true;
  }

  hasKey(keyType: string): boolean {
    return !!this.keys[keyType];
  }

  addWeapon(weaponId: WeaponId): void {
    this.weapons[weaponId] = true;
    this.currentWeapon = weaponId;
  }

  get isDead(): boolean {
    return this.health <= 0;
  }
}

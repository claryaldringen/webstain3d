import { EnemyState } from '../core/GameState.js';
import {
  ENEMY_TYPES,
  ENEMY_DROPS,
  TILE_SIZE,
  GUNFIRE_ALERT_RADIUS,
  ENEMY_PATROL_SPEED_FACTOR,
  ENEMY_STRAFE_SPEED_FACTOR,
  ENEMY_STRAFE_INTERVAL_MIN,
  ENEMY_STRAFE_INTERVAL_MAX,
  ENEMY_FLEE_DURATION,
  ENEMY_PUSH_RADIUS,
  ENEMY_CHAIN_ALERT_RADIUS,
  ENEMY_CHAIN_ALERT_MAX_DEPTH,
  ENEMY_PATROL_RADIUS,
  BOSS_ENRAGE_THRESHOLD,
  BOSS_ENRAGE_SPEED_MULT,
  BOSS_ENRAGE_COOLDOWN_MULT,
} from '../core/constants.js';
import type { EnemyConfig, EntityData } from '../types/index.js';
import type { Enemy } from './Enemy.js';
import { canSeeTarget, hitEnemy } from './EnemyAI.js';
import { getDirection, getSpriteIndex } from './SpriteAnimator.js';
import type { SpriteHandle } from '../sprites/SpriteManager.js';
import type { SpriteManager } from '../sprites/SpriteManager.js';
import type { GameMap } from '../map/GameMap.js';
import type { EnemySpriteSet } from '../sprites/SpriteConfig.js';
import { ENEMY_SPRITE_BASE } from '../sprites/SpriteConfig.js';

/** Minimal player interface required by EnemyManager. */
export interface EnemyTarget {
  x: number;
  z: number;
  takeDamage(amount: number): void;
}

/** Minimal item manager interface for enemy drops. */
export interface ItemDropper {
  spawnDrop(subtype: string, x: number, z: number): void;
}

/** Interface for opening doors from enemy AI. */
export interface DoorOpener {
  tryOpenAt(tileX: number, tileY: number): boolean;
}

/** Internal enemy instance with sprite and animation data. */
interface EnemyInstance extends Enemy {
  type: string;
  sprite: SpriteHandle;
  spriteBase: EnemySpriteSet | null;
}

const ENEMY_COLORS: Record<string, string> = {
  guard: '#4466AA',
  ss: '#666666',
  dog: '#8B6914',
  mutant: '#44AA44',
  officer: '#EEEEEE',
  boss: '#AA2222',
};

/** Enemy types that can strafe during combat. */
const STRAFE_TYPES = new Set(['ss', 'officer', 'boss']);

/** Enemy types that cannot open doors. */
const NO_DOOR_TYPES = new Set(['dog']);

/** Enemy types that don't flee at low health. */
const NO_FLEE_TYPES = new Set(['boss', 'dog']);

export class EnemyManager {
  private spriteManager: SpriteManager;
  private map: GameMap;
  enemies: EnemyInstance[] = [];
  itemManager: ItemDropper | null = null;
  doorOpener: DoorOpener | null = null;

  constructor(spriteManager: SpriteManager, map: GameMap, itemManager: ItemDropper | null = null) {
    this.spriteManager = spriteManager;
    this.map = map;
    this.itemManager = itemManager;
  }

  init(entityData: EntityData[]): void {
    for (const e of entityData) {
      if (e.type === 'item') continue;
      const config: EnemyConfig | undefined = ENEMY_TYPES[e.type];
      if (!config) continue;

      const x = (e.x + 0.5) * TILE_SIZE;
      const z = (e.y + 0.5) * TILE_SIZE;
      const texPath = `assets/sprites/enemy_${e.type}_front.png`;
      const isBoss = e.type === 'boss';
      const sprite = this.spriteManager.create(texPath, x, z, {
        width: isBoss ? 1.5 : 1.0,
        height: isBoss ? 1.5 : 1.0,
        anchorBottom: true,
        label: e.type,
        color: ENEMY_COLORS[e.type] || '#AA4444',
      });

      const spriteBase: EnemySpriteSet | null = ENEMY_SPRITE_BASE[e.type] ?? null;

      this.enemies.push({
        type: e.type,
        sprite,
        spriteBase,
        x,
        z,
        angle: (e.angle || 0) * Math.PI / 180,
        health: config.health,
        maxHealth: config.health,
        speed: config.speed,
        damage: config.damage,
        attackRange: config.attackRange,
        state: EnemyState.Idle,
        stateTimer: 0,
        attackCooldown: 0,
        attackTimer: 0,
        attackHit: false,
        painTimer: 0,
        deathTimer: 0,
        alive: true,
        lastKnownX: x,
        lastKnownZ: z,
        spawnX: x,
        spawnZ: z,
        patrolPath: [],
        patrolIndex: 0,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: ENEMY_STRAFE_INTERVAL_MIN + Math.random() * (ENEMY_STRAFE_INTERVAL_MAX - ENEMY_STRAFE_INTERVAL_MIN),
        fleeTimer: 0,
        alertDepth: 0,
        enraged: false,
      });
    }

    // Generate patrol paths for all enemies
    for (const enemy of this.enemies) {
      enemy.patrolPath = this.generatePatrolPath(enemy.spawnX, enemy.spawnZ);
    }
  }

  update(dt: number, player: EnemyTarget): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive && enemy.state !== EnemyState.Death) continue;

      enemy.stateTimer += dt;
      if (enemy.alive) {
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      }

      const canSee = enemy.alive ? this.canSeePlayer(enemy, player) : false;

      // Store last known player position when visible
      if (canSee) {
        enemy.lastKnownX = player.x;
        enemy.lastKnownZ = player.z;
      }

      switch (enemy.state) {
        case EnemyState.Idle:
          this.updateIdle(enemy, player, canSee);
          break;
        case EnemyState.Alert:
          this.updateAlert(enemy, player, canSee);
          break;
        case EnemyState.Chase:
          this.updateChase(enemy, dt, player, canSee);
          break;
        case EnemyState.Attack:
          this.updateAttack(enemy, dt, player);
          break;
        case EnemyState.Pain:
          this.updatePain(enemy, dt);
          break;
        case EnemyState.Death:
          this.updateDeath(enemy, dt);
          break;
        case EnemyState.Investigate:
          this.updateInvestigate(enemy, dt, player, canSee);
          break;
        case EnemyState.Flee:
          this.updateFlee(enemy, dt, player, canSee);
          break;
      }

      enemy.sprite.mesh.position.x = enemy.x;
      enemy.sprite.mesh.position.z = enemy.z;

      this.updateSpriteFrame(enemy, player);
    }

    // Entity collision push-apart
    this.resolveEntityCollisions();
  }

  // --- State handlers ---

  private updateIdle(enemy: EnemyInstance, player: EnemyTarget, canSee: boolean): void {
    if (canSee) {
      enemy.state = EnemyState.Alert;
      enemy.stateTimer = 0;
      return;
    }

    // Patrol movement
    if (enemy.patrolPath.length > 0) {
      const target = enemy.patrolPath[enemy.patrolIndex]!;
      const dx = target.x - enemy.x;
      const dz = target.z - enemy.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.3) {
        // Reached waypoint, go to next
        enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
      } else {
        const speed = enemy.speed * ENEMY_PATROL_SPEED_FACTOR;
        const dt = 1 / 60; // approximate dt for idle
        const moveX = (dx / dist) * speed * dt;
        const moveZ = (dz / dist) * speed * dt;
        this.tryMove(enemy, moveX, moveZ);
        enemy.angle = Math.atan2(-dz, dx);
      }
    }
  }

  private updateAlert(enemy: EnemyInstance, player: EnemyTarget, _canSee: boolean): void {
    const dx = player.x - enemy.x;
    const dz = player.z - enemy.z;
    enemy.angle = Math.atan2(-dz, dx);

    if (enemy.stateTimer > 0.5) {
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
      // Chain alert: notify nearby enemies
      this.chainAlert(enemy.x, enemy.z, 1);
    }
  }

  private updateChase(enemy: EnemyInstance, dt: number, player: EnemyTarget, canSee: boolean): void {
    const dx = player.x - enemy.x;
    const dz = player.z - enemy.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Check flee condition
    if (!NO_FLEE_TYPES.has(enemy.type) &&
        enemy.health < enemy.maxHealth * 0.3 && enemy.health > 0) {
      enemy.state = EnemyState.Flee;
      enemy.stateTimer = 0;
      enemy.fleeTimer = ENEMY_FLEE_DURATION;
      return;
    }

    // Boss enrage check
    if (enemy.type === 'boss' && !enemy.enraged &&
        enemy.health < enemy.maxHealth * BOSS_ENRAGE_THRESHOLD) {
      enemy.enraged = true;
      enemy.speed *= BOSS_ENRAGE_SPEED_MULT;
    }

    // Attack check
    const effectiveCooldown = enemy.enraged ? enemy.attackCooldown * BOSS_ENRAGE_COOLDOWN_MULT : enemy.attackCooldown;
    if (dist < enemy.attackRange && effectiveCooldown <= 0 && canSee) {
      enemy.state = EnemyState.Attack;
      enemy.stateTimer = 0;
      enemy.attackTimer = 0;
      enemy.attackHit = false;
      enemy.angle = Math.atan2(-dz, dx);
      return;
    }

    // Movement toward player
    if (dist > 0.5) {
      const effectiveSpeed = this.getChaseSpeed(enemy) * dt;
      let moveX = (dx / dist) * effectiveSpeed;
      let moveZ = (dz / dist) * effectiveSpeed;

      // Strafing for eligible types when close enough
      if (STRAFE_TYPES.has(enemy.type) && dist < enemy.attackRange * 2.5 && canSee) {
        enemy.strafeTimer -= dt;
        if (enemy.strafeTimer <= 0) {
          enemy.strafeDir *= -1;
          enemy.strafeTimer = ENEMY_STRAFE_INTERVAL_MIN + Math.random() * (ENEMY_STRAFE_INTERVAL_MAX - ENEMY_STRAFE_INTERVAL_MIN);
        }
        // Add perpendicular strafe component
        const strafeSpeed = enemy.speed * ENEMY_STRAFE_SPEED_FACTOR * dt;
        const perpX = -dz / dist;
        const perpZ = dx / dist;
        moveX += perpX * enemy.strafeDir * strafeSpeed;
        moveZ += perpZ * enemy.strafeDir * strafeSpeed;
      }

      this.tryMoveWithSlide(enemy, moveX, moveZ);
    }

    enemy.angle = Math.atan2(-dz, dx);

    // Lost sight → investigate
    if (!canSee) {
      enemy.state = EnemyState.Investigate;
      enemy.stateTimer = 0;
    }
  }

  private updateInvestigate(enemy: EnemyInstance, dt: number, player: EnemyTarget, canSee: boolean): void {
    // Regained sight → chase
    if (canSee) {
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
      return;
    }

    // Move toward last known position
    const dx = enemy.lastKnownX - enemy.x;
    const dz = enemy.lastKnownZ - enemy.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
      // Reached last known position, give up
      enemy.state = EnemyState.Idle;
      enemy.stateTimer = 0;
      return;
    }

    const moveSpeed = enemy.speed * dt;
    const moveX = (dx / dist) * moveSpeed;
    const moveZ = (dz / dist) * moveSpeed;
    this.tryMoveWithSlide(enemy, moveX, moveZ);
    enemy.angle = Math.atan2(-dz, dx);

    // Timeout after 5 seconds of investigation
    if (enemy.stateTimer > 5) {
      enemy.state = EnemyState.Idle;
      enemy.stateTimer = 0;
    }
  }

  private updateFlee(enemy: EnemyInstance, dt: number, player: EnemyTarget, canSee: boolean): void {
    enemy.fleeTimer -= dt;

    if (enemy.fleeTimer <= 0) {
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
      return;
    }

    // Move away from player
    const dx = enemy.x - player.x;
    const dz = enemy.z - player.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 0.1) {
      const moveSpeed = enemy.speed * dt;
      const moveX = (dx / dist) * moveSpeed;
      const moveZ = (dz / dist) * moveSpeed;
      const moved = this.tryMoveWithSlide(enemy, moveX, moveZ);
      // If can't move (wall), stop fleeing early
      if (!moved) {
        enemy.state = EnemyState.Chase;
        enemy.stateTimer = 0;
        return;
      }
    }

    enemy.angle = Math.atan2(-dz, dx);
  }

  private updateAttack(enemy: EnemyInstance, dt: number, player: EnemyTarget): void {
    enemy.attackTimer += dt;

    if (!enemy.attackHit && enemy.attackTimer >= 0.25) {
      enemy.attackHit = true;
      if (this.canSeePlayer(enemy, player)) {
        const dmg = enemy.damage[0] + Math.random() * (enemy.damage[1] - enemy.damage[0]);
        player.takeDamage(Math.round(dmg));
      }
    }

    if (enemy.attackTimer >= 0.75) {
      enemy.attackCooldown = enemy.enraged ? 0.3 : 0.5;
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
    }
  }

  private updatePain(enemy: EnemyInstance, dt: number): void {
    enemy.painTimer -= dt;
    if (enemy.painTimer <= 0) {
      enemy.state = EnemyState.Chase;
      enemy.stateTimer = 0;
    }
  }

  private updateDeath(enemy: EnemyInstance, dt: number): void {
    enemy.deathTimer += dt;
    if (enemy.deathTimer >= 0.6) {
      enemy.alive = false;
    }
  }

  // --- Movement helpers ---

  private getChaseSpeed(enemy: EnemyInstance): number {
    let speed = enemy.speed;
    // Dogs get a charge boost
    if (enemy.type === 'dog') {
      speed *= 1.5;
    }
    return speed;
  }

  /** Try to move on each axis independently. Returns true if any movement happened. */
  private tryMove(enemy: EnemyInstance, moveX: number, moveZ: number): boolean {
    let moved = false;
    const newX = enemy.x + moveX;
    const newZ = enemy.z + moveZ;
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileZ = Math.floor(newZ / TILE_SIZE);
    const curTileX = Math.floor(enemy.x / TILE_SIZE);
    const curTileZ = Math.floor(enemy.z / TILE_SIZE);

    if (!this.map.isSolid(tileX, curTileZ)) {
      enemy.x = newX;
      moved = true;
    } else {
      this.tryOpenDoorAt(enemy, tileX, curTileZ);
    }
    if (!this.map.isSolid(curTileX, tileZ)) {
      enemy.z = newZ;
      moved = true;
    } else {
      this.tryOpenDoorAt(enemy, curTileX, tileZ);
    }
    return moved;
  }

  /** Try to move with wall-sliding: if blocked, try perpendicular directions. */
  private tryMoveWithSlide(enemy: EnemyInstance, moveX: number, moveZ: number): boolean {
    // First try direct movement
    const newX = enemy.x + moveX;
    const newZ = enemy.z + moveZ;
    const curTileX = Math.floor(enemy.x / TILE_SIZE);
    const curTileZ = Math.floor(enemy.z / TILE_SIZE);
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileZ = Math.floor(newZ / TILE_SIZE);

    let movedX = false;
    let movedZ = false;

    if (!this.map.isSolid(tileX, curTileZ)) {
      enemy.x = newX;
      movedX = true;
    } else {
      this.tryOpenDoorAt(enemy, tileX, curTileZ);
    }

    const afterMoveTileX = Math.floor(enemy.x / TILE_SIZE);
    if (!this.map.isSolid(afterMoveTileX, tileZ)) {
      enemy.z = newZ;
      movedZ = true;
    } else {
      this.tryOpenDoorAt(enemy, afterMoveTileX, tileZ);
    }

    if (movedX || movedZ) return true;

    // Wall-slide: try perpendicular directions
    const speed = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (speed < 0.0001) return false;

    // Try slide along X
    const slideX1 = enemy.x + speed;
    const slideX2 = enemy.x - speed;
    if (!this.map.isSolid(Math.floor(slideX1 / TILE_SIZE), curTileZ)) {
      enemy.x = slideX1;
      return true;
    }
    if (!this.map.isSolid(Math.floor(slideX2 / TILE_SIZE), curTileZ)) {
      enemy.x = slideX2;
      return true;
    }

    // Try slide along Z
    const slideZ1 = enemy.z + speed;
    const slideZ2 = enemy.z - speed;
    if (!this.map.isSolid(curTileX, Math.floor(slideZ1 / TILE_SIZE))) {
      enemy.z = slideZ1;
      return true;
    }
    if (!this.map.isSolid(curTileX, Math.floor(slideZ2 / TILE_SIZE))) {
      enemy.z = slideZ2;
      return true;
    }

    return false;
  }

  /** Try to open a door at a tile position (non-dog enemies only). */
  private tryOpenDoorAt(enemy: EnemyInstance, tileX: number, tileZ: number): void {
    if (NO_DOOR_TYPES.has(enemy.type)) return;
    if (!this.doorOpener) return;
    // Check if the tile is a door (walls value -1)
    const wallVal = this.map.getWallId(tileX, tileZ);
    if (wallVal === -1) {
      this.doorOpener.tryOpenAt(tileX, tileZ);
    }
  }

  // --- Entity collision ---

  private resolveEntityCollisions(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i]!;
      if (!a.alive) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j]!;
        if (!b.alive) continue;

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < ENEMY_PUSH_RADIUS && dist > 0.01) {
          const overlap = (ENEMY_PUSH_RADIUS - dist) * 0.5;
          const pushX = (dx / dist) * overlap;
          const pushZ = (dz / dist) * overlap;

          // Only push if target tile is walkable
          if (!this.map.isSolid(Math.floor((a.x - pushX) / TILE_SIZE), Math.floor((a.z - pushZ) / TILE_SIZE))) {
            a.x -= pushX;
            a.z -= pushZ;
          }
          if (!this.map.isSolid(Math.floor((b.x + pushX) / TILE_SIZE), Math.floor((b.z + pushZ) / TILE_SIZE))) {
            b.x += pushX;
            b.z += pushZ;
          }
        }
      }
    }
  }

  // --- Patrol generation ---

  private generatePatrolPath(spawnX: number, spawnZ: number): { x: number; z: number }[] {
    const path: { x: number; z: number }[] = [];
    const spawnTileX = Math.floor(spawnX / TILE_SIZE);
    const spawnTileZ = Math.floor(spawnZ / TILE_SIZE);
    const numPoints = 2 + Math.floor(Math.random() * 3); // 2-4 points

    // Gather walkable tiles near spawn
    const candidates: { x: number; z: number }[] = [];
    for (let dy = -ENEMY_PATROL_RADIUS; dy <= ENEMY_PATROL_RADIUS; dy++) {
      for (let dx = -ENEMY_PATROL_RADIUS; dx <= ENEMY_PATROL_RADIUS; dx++) {
        const tx = spawnTileX + dx;
        const tz = spawnTileZ + dy;
        if (!this.map.isSolid(tx, tz) && (dx !== 0 || dy !== 0)) {
          candidates.push({ x: (tx + 0.5) * TILE_SIZE, z: (tz + 0.5) * TILE_SIZE });
        }
      }
    }

    // Pick random waypoints from candidates
    for (let i = 0; i < numPoints && candidates.length > 0; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      path.push(candidates.splice(idx, 1)[0]!);
    }

    return path;
  }

  // --- Alert systems ---

  /** Chain alert: propagates from enemy to enemy up to max depth. */
  private chainAlert(x: number, z: number, depth: number): void {
    if (depth > ENEMY_CHAIN_ALERT_MAX_DEPTH) return;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.state !== EnemyState.Idle) continue;

      const dx = enemy.x - x;
      const dz = enemy.z - z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < ENEMY_CHAIN_ALERT_RADIUS) {
        enemy.state = EnemyState.Alert;
        enemy.stateTimer = 0;
        enemy.alertDepth = depth;
      }
    }
  }

  alertNearby(x: number, z: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (enemy.state === EnemyState.Idle) {
        const dx = enemy.x - x;
        const dz = enemy.z - z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < GUNFIRE_ALERT_RADIUS) {
          enemy.state = EnemyState.Alert;
          enemy.stateTimer = 0;
        }
      }
    }
  }

  // --- Sprite rendering ---

  private updateSpriteFrame(enemy: EnemyInstance, player: EnemyTarget): void {
    if (!enemy.spriteBase) return;

    const dir = getDirection(enemy, player.x, player.z);
    const spriteIdx = getSpriteIndex(
      enemy.state,
      enemy.spriteBase,
      enemy.stateTimer,
      enemy.deathTimer,
      enemy.attackTimer,
      dir,
    );
    this.spriteManager.setVswapTexture(enemy.sprite, spriteIdx);
  }

  private canSeePlayer(enemy: EnemyInstance, player: EnemyTarget): boolean {
    return canSeeTarget(
      enemy.x, enemy.z,
      player.x, player.z,
      (tx, ty) => this.map.isSolid(tx, ty),
    );
  }

  // --- Public API ---

  hitEnemy(enemy: EnemyInstance, damage: number, player: EnemyTarget): void {
    if (!enemy.alive || enemy.state === EnemyState.Death) return;

    hitEnemy(enemy, damage, player.x, player.z);

    // Drop item on death
    if (enemy.health <= 0) {
      const drop = ENEMY_DROPS[enemy.type];
      if (drop && this.itemManager) {
        this.itemManager.spawnDrop(drop, enemy.x, enemy.z);
      }
    }
  }

  get totalEnemies(): number {
    return this.enemies.length;
  }

  get killedEnemies(): number {
    return this.enemies.filter(e => !e.alive || e.state === EnemyState.Death).length;
  }

  getEnemies(): readonly EnemyInstance[] {
    return this.enemies;
  }
}

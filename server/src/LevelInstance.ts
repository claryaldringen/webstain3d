import {
  ENEMY_CONFIGS,
  TILE_SIZE,
  SeededRandom,
} from './physics.js';
import type { EnemySnapshot, ItemSnapshot } from '../../shared/protocol.js';

export interface ServerEnemy {
  id: number;
  type: string;
  x: number;
  z: number;
  angle: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: [number, number];
  attackRange: number;
  state: number; // 0=idle,1=alert,2=chase,3=attack,4=pain,5=death
  stateTimer: number;
  attackCooldown: number;
  attackTimer: number;
  attackHit: boolean;
  painTimer: number;
  deathTimer: number;
  alive: boolean;
  targetId: string | null;
}

interface PlayerPos {
  id: string;
  x: number;
  z: number;
  alive: boolean;
}

const SIGHT_RANGE = 30;
const ALERT_DELAY = 0.5;
const ATTACK_COOLDOWN = 0.5;

interface ServerItem {
  id: number;
  subtype: string;
  x: number;
  z: number;
}

const PICKUP_RADIUS = 0.5;

const ENEMY_DROPS: Record<string, string | null> = {
  guard: 'ammo_clip',
  ss: 'machine_gun',
  dog: null,
  mutant: 'ammo_clip',
  officer: 'ammo_clip',
  boss: 'chaingun',
};

const ITEM_EFFECTS: Record<string, { type: string; value: number | string }> = {
  food: { type: 'health', value: 4 },
  first_aid: { type: 'health', value: 10 },
  medkit: { type: 'health', value: 25 },
  ammo_clip: { type: 'ammo', value: 8 },
  ammo_stack: { type: 'ammo', value: 25 },
  cross: { type: 'score', value: 100 },
  chalice: { type: 'score', value: 500 },
  chest: { type: 'score', value: 1000 },
  crown: { type: 'score', value: 5000 },
  machine_gun: { type: 'weapon', value: 2 },
  chaingun: { type: 'weapon', value: 3 },
};

export class LevelInstance {
  readonly level: number;
  readonly walls: number[][];
  readonly width: number;
  readonly height: number;
  enemies: ServerEnemy[] = [];
  private items: ServerItem[] = [];
  private nextEnemyId = 0;
  private nextItemId = 0;
  private spawnPoints: { x: number; z: number }[] = [];

  constructor(level: number, walls: number[][], width: number, height: number) {
    this.level = level;
    this.walls = walls;
    this.width = width;
    this.height = height;

    // Collect floor tiles as spawn points
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (walls[y]![x] === 0) {
          this.spawnPoints.push({ x: (x + 0.5) * TILE_SIZE, z: (y + 0.5) * TILE_SIZE });
        }
      }
    }
  }

  addEnemy(type: string, tileX: number, tileY: number, angle: number): ServerEnemy {
    const cfg = ENEMY_CONFIGS[type];
    if (!cfg) throw new Error(`Unknown enemy type: ${type}`);

    const enemy: ServerEnemy = {
      id: this.nextEnemyId++,
      type,
      x: (tileX + 0.5) * TILE_SIZE,
      z: (tileY + 0.5) * TILE_SIZE,
      angle,
      health: cfg.health,
      maxHealth: cfg.health,
      speed: cfg.speed,
      damage: cfg.damage,
      attackRange: cfg.attackRange,
      state: 0,
      stateTimer: 0,
      attackCooldown: 0,
      attackTimer: 0,
      attackHit: false,
      painTimer: 0,
      deathTimer: 0,
      alive: true,
      targetId: null,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  isSolid(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
    return this.walls[ty]![tx]! !== 0;
  }

  getRandomSpawn(rng: SeededRandom): { x: number; z: number } {
    if (this.spawnPoints.length === 0) return { x: 1.5, z: 1.5 };
    const idx = rng.int(0, this.spawnPoints.length - 1);
    return this.spawnPoints[idx]!;
  }

  canSee(x1: number, z1: number, x2: number, z2: number): boolean {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > SIGHT_RANGE) return false;

    const steps = Math.ceil(dist / 0.5);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const tx = Math.floor((x1 + dx * t) / TILE_SIZE);
      const tz = Math.floor((z1 + dz * t) / TILE_SIZE);
      if (this.isSolid(tx, tz)) return false;
    }
    return true;
  }

  update(dt: number, players: PlayerPos[]): { damages: { targetId: string; amount: number; enemyId: number }[] } {
    const damages: { targetId: string; amount: number; enemyId: number }[] = [];
    const alivePlayers = players.filter(p => p.alive);

    for (const enemy of this.enemies) {
      if (!enemy.alive && enemy.state !== 5) continue;

      enemy.stateTimer += dt;
      if (enemy.alive) {
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      }

      // Find closest visible player
      let closest: PlayerPos | null = null;
      let closestDist = Infinity;
      for (const p of alivePlayers) {
        const d = Math.sqrt((p.x - enemy.x) ** 2 + (p.z - enemy.z) ** 2);
        if (d < closestDist && this.canSee(enemy.x, enemy.z, p.x, p.z)) {
          closest = p;
          closestDist = d;
        }
      }

      switch (enemy.state) {
        case 0: // Idle
          if (closest) {
            enemy.state = 1;
            enemy.stateTimer = 0;
            enemy.targetId = closest.id;
          }
          break;

        case 1: // Alert
          if (closest) {
            enemy.angle = Math.atan2(-(closest.z - enemy.z), closest.x - enemy.x);
          }
          if (enemy.stateTimer > ALERT_DELAY) {
            enemy.state = 2;
            enemy.stateTimer = 0;
          }
          break;

        case 2: { // Chase
          if (!closest) {
            enemy.state = 0;
            enemy.stateTimer = 0;
            break;
          }
          enemy.targetId = closest.id;
          const dx = closest.x - enemy.x;
          const dz = closest.z - enemy.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < enemy.attackRange && enemy.attackCooldown <= 0) {
            enemy.state = 3;
            enemy.stateTimer = 0;
            enemy.attackTimer = 0;
            enemy.attackHit = false;
            enemy.angle = Math.atan2(-dz, dx);
            break;
          }

          if (dist > 0.5) {
            const moveX = (dx / dist) * enemy.speed * dt;
            const moveZ = (dz / dist) * enemy.speed * dt;
            const newX = enemy.x + moveX;
            const newZ = enemy.z + moveZ;
            if (!this.isSolid(Math.floor(newX / TILE_SIZE), Math.floor(enemy.z / TILE_SIZE))) {
              enemy.x = newX;
            }
            if (!this.isSolid(Math.floor(enemy.x / TILE_SIZE), Math.floor(newZ / TILE_SIZE))) {
              enemy.z = newZ;
            }
          }
          enemy.angle = Math.atan2(-dz, dx);
          break;
        }

        case 3: // Attack
          enemy.attackTimer += dt;
          if (!enemy.attackHit && enemy.attackTimer >= 0.25) {
            enemy.attackHit = true;
            if (enemy.targetId) {
              const target = alivePlayers.find(p => p.id === enemy.targetId);
              if (target && this.canSee(enemy.x, enemy.z, target.x, target.z)) {
                const dmg = enemy.damage[0] + Math.random() * (enemy.damage[1] - enemy.damage[0]);
                damages.push({ targetId: target.id, amount: Math.round(dmg), enemyId: enemy.id });
              }
            }
          }
          if (enemy.attackTimer >= 0.75) {
            enemy.attackCooldown = ATTACK_COOLDOWN;
            enemy.state = 2;
            enemy.stateTimer = 0;
          }
          break;

        case 4: // Pain
          enemy.painTimer -= dt;
          if (enemy.painTimer <= 0) {
            enemy.state = 2;
            enemy.stateTimer = 0;
          }
          break;

        case 5: // Death
          enemy.deathTimer += dt;
          if (enemy.deathTimer >= 0.6) {
            enemy.alive = false;
          }
          break;
      }
    }

    return { damages };
  }

  spawnItem(subtype: string, x: number, z: number): void {
    this.items.push({ id: this.nextItemId++, subtype, x, z });
  }

  spawnEnemyDrop(enemyType: string, x: number, z: number): void {
    const drop = ENEMY_DROPS[enemyType];
    if (drop) this.spawnItem(drop, x, z);
  }

  /** Check pickups for a player, returns applied effects and removes items */
  checkPickups(px: number, pz: number): { type: string; value: number | string }[] {
    const effects: { type: string; value: number | string }[] = [];
    this.items = this.items.filter(item => {
      const dx = item.x - px;
      const dz = item.z - pz;
      if (Math.sqrt(dx * dx + dz * dz) < PICKUP_RADIUS) {
        const effect = ITEM_EFFECTS[item.subtype];
        if (effect) effects.push(effect);
        return false; // remove
      }
      return true;
    });
    return effects;
  }

  getItemSnapshots(): ItemSnapshot[] {
    return this.items.map(i => ({ id: i.id, subtype: i.subtype, x: i.x, z: i.z }));
  }

  getSnapshots(): EnemySnapshot[] {
    return this.enemies
      .filter(e => e.alive || e.state === 5)
      .map(e => ({
        id: e.id,
        x: e.x,
        z: e.z,
        angle: e.angle,
        state: e.state,
        health: e.health,
        type: e.type,
      }));
  }

  damageEnemy(enemyId: number, damage: number): ServerEnemy | null {
    const enemy = this.enemies.find(e => e.id === enemyId && e.alive);
    if (!enemy) return null;

    enemy.health -= damage;
    if (enemy.health <= 0) {
      enemy.health = 0;
      enemy.state = 5;
      enemy.deathTimer = 0;
      return enemy;
    }
    enemy.state = 4;
    enemy.painTimer = 0.3;
    return enemy;
  }
}

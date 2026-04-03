import { PlayerSession } from './PlayerSession.js';
import { LevelInstance } from './LevelInstance.js';
import {
  SeededRandom,
  SCORE_ENEMY_KILL,
  SCORE_PLAYER_KILL,
  TILE_SIZE,
  WEAPON_DAMAGE,
  WEAPON_RANGE,
} from './physics.js';
import type {
  ServerMessage,
  InputMessage,
  LevelConfigData,
} from '../../shared/protocol.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const TICK_RATE = 20;
const TICK_DT = 1 / TICK_RATE;
const MAX_PLAYERS = 8;
const TOTAL_LEVELS = 10;

// Load pre-generated level data from JSON files (built by tools/prebuild-levels.ts)
const __dirname = dirname(fileURLToPath(import.meta.url));
const levelDataDir = join(__dirname, '..', 'data');

interface PrebuiltLevel {
  level: number;
  seed: number;
  width: number;
  height: number;
  walls: number[][];
  enemies: { type: string; x: number; y: number; angle: number }[];
  items: { subtype: string; x: number; y: number }[];
  playerStart: { x: number; y: number };
  exitTile: { x: number; y: number } | null;
}

function loadLevelData(level: number): PrebuiltLevel {
  const path = join(levelDataDir, `level${level}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export class GameRoom {
  readonly id: string;
  readonly seed: number;
  private players = new Map<string, PlayerSession>();
  private levels = new Map<number, LevelInstance>();
  private levelConfigs: LevelConfigData[] = [];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private gameOver = false;
  private rng: SeededRandom;
  private pendingInputs = new Map<string, InputMessage[]>();

  constructor(id: string) {
    this.id = id;
    this.seed = Date.now();
    this.rng = new SeededRandom(this.seed);

    // Load pre-built levels from JSON
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const data = loadLevelData(i);
      this.levelConfigs.push({
        level: i,
        seed: data.seed,
        width: data.width,
        height: data.height,
        walls: data.walls,
        enemies: data.enemies,
        playerStart: data.playerStart,
        exitTile: data.exitTile,
      });
    }
  }

  get playerCount(): number {
    return this.players.size;
  }

  get isFull(): boolean {
    return this.players.size >= MAX_PLAYERS;
  }

  get isEmpty(): boolean {
    return this.players.size === 0;
  }

  addPlayer(session: PlayerSession): void {
    this.players.set(session.id, session);

    // Spawn at playerStart from level data (safe area, away from enemies)
    const levelInst = this.getOrCreateLevel(1);
    const levelData = loadLevelData(1);
    session.x = (levelData.playerStart.x + 0.5) * TILE_SIZE;
    session.z = (levelData.playerStart.y + 0.5) * TILE_SIZE;
    session.angle = 0;
    session.level = 1;

    // Send welcome
    session.send({
      type: 'welcome',
      id: session.id,
      seed: this.seed,
      roomId: this.id,
      levelConfigs: this.levelConfigs,
    });

    // Notify others
    this.broadcast({
      type: 'player_joined',
      id: session.id,
      name: session.name,
    }, session.id);

    // Start tick loop if first player
    if (this.players.size === 1) {
      this.startTicking();
    }
  }

  removePlayer(id: string): void {
    const player = this.players.get(id);
    if (!player) return;
    this.players.delete(id);
    this.pendingInputs.delete(id);

    this.broadcast({
      type: 'player_left',
      id,
      name: player.name,
    });

    if (this.isEmpty) {
      this.stopTicking();
      // Reset level instances so reconnecting players get fresh enemies
      this.levels.clear();
    }
  }

  handleInput(playerId: string, input: InputMessage): void {
    if (!this.pendingInputs.has(playerId)) {
      this.pendingInputs.set(playerId, []);
    }
    this.pendingInputs.get(playerId)!.push(input);
  }

  private getOrCreateLevel(level: number): LevelInstance {
    let inst = this.levels.get(level);
    if (inst) return inst;

    const data = loadLevelData(level);
    inst = new LevelInstance(level, data.walls, data.width, data.height);

    // Add enemies
    for (const e of data.enemies) {
      inst.addEnemy(e.type, e.x, e.y, e.angle);
    }

    // Add items from level generator
    for (const item of data.items) {
      inst.spawnItem(item.subtype, (item.x + 0.5) * TILE_SIZE, (item.y + 0.5) * TILE_SIZE);
    }

    this.levels.set(level, inst);
    return inst;
  }

  private startTicking(): void {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => this.gameTick(), 1000 / TICK_RATE);
  }

  private stopTicking(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private gameTick(): void {
    if (this.gameOver) return;
    this.tick++;

    // Process pending inputs — use only the latest input per player per tick
    for (const [playerId, inputs] of this.pendingInputs) {
      const player = this.players.get(playerId);
      if (!player) continue;
      const levelInst = this.levels.get(player.level);
      if (!levelInst) continue;

      const lastInput = inputs[inputs.length - 1]!;

      // Check if any input in this batch had shoot/interact
      const anyShoot = inputs.some(i => i.shoot);
      const anyInteract = inputs.some(i => i.interact);

      // Client-authoritative movement: accept client position
      if (lastInput.x != null && lastInput.z != null) {
        const tx = Math.floor(lastInput.x / TILE_SIZE);
        const tz = Math.floor(lastInput.z / TILE_SIZE);
        if (!levelInst.isSolid(tx, tz)) {
          player.x = lastInput.x;
          player.z = lastInput.z;
        }
      }
      if (lastInput.angle != null) {
        player.angle = lastInput.angle;
      }
      player.lastSeq = lastInput.seq;
      player.shooting = lastInput.shoot;
      if (lastInput.weapon != null) {
        player.weapon = lastInput.weapon;
      }

      // Handle shooting using client position/angle
      if (anyShoot && player.alive) {
        this.handleShoot(player, levelInst);
      }

      // Handle interact (exit tile / level advance)
      if (anyInteract && player.alive && player.level < TOTAL_LEVELS) {
        const levelData = loadLevelData(player.level);
        if (levelData.exitTile) {
          const px = Math.floor(player.x / TILE_SIZE);
          const pz = Math.floor(player.z / TILE_SIZE);
          if (px === levelData.exitTile.x && pz === levelData.exitTile.y) {
            player.level++;
            const newLevel = this.getOrCreateLevel(player.level);
            const spawn = newLevel.getRandomSpawn(this.rng);
            player.x = spawn.x;
            player.z = spawn.z;
            this.broadcast({
              type: 'level_change',
              playerId: player.id,
              level: player.level,
            });
          }
        }
      }
    }
    this.pendingInputs.clear();

    // Check item pickups
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const levelInst = this.levels.get(player.level);
      if (!levelInst) continue;
      const effects = levelInst.checkPickups(player.x, player.z);
      for (const eff of effects) {
        switch (eff.type) {
          case 'health':
            player.health = Math.min(100, player.health + (eff.value as number));
            break;
          case 'ammo':
            player.ammo += eff.value as number;
            break;
          case 'score':
            player.score += eff.value as number;
            break;
          case 'weapon':
            player.weapon = Math.max(player.weapon, eff.value as number);
            player.ammo += 6;
            break;
        }
      }
    }

    // Update enemies per level & handle respawns
    const levelPlayers = new Map<number, PlayerSession[]>();
    for (const player of this.players.values()) {
      if (!levelPlayers.has(player.level)) levelPlayers.set(player.level, []);
      levelPlayers.get(player.level)!.push(player);

      // Respawn check
      if (player.updateRespawn(TICK_DT)) {
        const levelInst = this.getOrCreateLevel(player.level);
        const spawn = levelInst.getRandomSpawn(this.rng);
        player.x = spawn.x;
        player.z = spawn.z;
        this.broadcast({
          type: 'player_respawned',
          id: player.id,
          x: player.x,
          z: player.z,
        });
      }
    }

    for (const [level, players] of levelPlayers) {
      const inst = this.levels.get(level);
      if (!inst) continue;

      const playerPos = players.map(p => ({ id: p.id, x: p.x, z: p.z, alive: p.alive }));
      const { damages } = inst.update(TICK_DT, playerPos);

      for (const dmg of damages) {
        const target = this.players.get(dmg.targetId);
        if (target) {
          target.takeDamage(dmg.amount);
          target.send({ type: 'damage', targetId: dmg.targetId, amount: dmg.amount });
          if (!target.alive) {
            this.broadcast({
              type: 'player_killed',
              killerId: `enemy_${dmg.enemyId}`,
              killerName: 'Enemy',
              victimId: target.id,
              victimName: target.name,
            });
          }
        }
      }
    }

    // Send snapshots
    for (const player of this.players.values()) {
      const levelInst = this.levels.get(player.level);
      const sameLevelPlayers = levelPlayers.get(player.level) || [];

      player.send({
        type: 'snapshot',
        tick: this.tick,
        seq: player.lastSeq,
        you: player.id,
        players: sameLevelPlayers.map(p => p.toSnapshot()),
        enemies: levelInst ? levelInst.getSnapshots() : [],
        items: levelInst ? levelInst.getItemSnapshots() : [],
      });
    }
  }

  private handleShoot(player: PlayerSession, levelInst: LevelInstance): void {
    if (player.weapon > 0 && player.ammo <= 0) return;
    if (player.weapon > 0) player.ammo--;

    const range = WEAPON_RANGE[player.weapon] ?? 64;
    const [minDmg, maxDmg] = WEAPON_DAMAGE[player.weapon] ?? [15, 25];
    const damage = Math.round(minDmg + Math.random() * (maxDmg - minDmg));

    // Forward direction matches Player.ts: dirX = -sin(angle), dirZ = -cos(angle)
    const cos = -Math.sin(player.angle);
    const sin = -Math.cos(player.angle);

    // Raycast to find target
    let closestDist = range;
    let hitEnemy: { enemy: ReturnType<LevelInstance['damageEnemy']>; id: number } | null = null;
    let hitPlayer: PlayerSession | null = null;

    // Check enemies
    for (const enemy of levelInst.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - player.x;
      const dz = enemy.z - player.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > closestDist) continue;

      // Check if enemy is in front (within ~5 degree cone)
      const dot = (dx * cos + dz * sin) / dist;
      if (dot < 0.95) continue;

      // Check LOS
      if (!levelInst.canSee(player.x, player.z, enemy.x, enemy.z)) continue;

      closestDist = dist;
      hitEnemy = { enemy: null, id: enemy.id };
    }

    // Check other players on same level
    for (const other of this.players.values()) {
      if (other.id === player.id || !other.alive || other.level !== player.level) continue;
      const dx = other.x - player.x;
      const dz = other.z - player.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > closestDist) continue;

      const dot = (dx * cos + dz * sin) / dist;
      if (dot < 0.95) continue;

      if (!levelInst.canSee(player.x, player.z, other.x, other.z)) continue;

      closestDist = dist;
      hitPlayer = other;
      hitEnemy = null;
    }

    if (hitEnemy) {
      const result = levelInst.damageEnemy(hitEnemy.id, damage);
      if (result && result.health <= 0) {
        const score = SCORE_ENEMY_KILL[result.type] ?? 100;
        player.score += score;
        // Drop item from killed enemy
        levelInst.spawnEnemyDrop(result.type, result.x, result.z);
        this.broadcast({
          type: 'enemy_killed',
          playerId: player.id,
          playerName: player.name,
          enemyType: result.type,
          enemyId: hitEnemy.id,
          score,
        });

        if (result.type === 'boss') {
          this.broadcast({
            type: 'boss_dead',
            killerId: player.id,
            killerName: player.name,
          });
          this.endGame();
        }
      }
    }

    if (hitPlayer) {
      hitPlayer.takeDamage(damage);
      hitPlayer.send({ type: 'damage', targetId: hitPlayer.id, amount: damage, fromPlayer: player.id });
      if (!hitPlayer.alive) {
        player.score += SCORE_PLAYER_KILL;
        this.broadcast({
          type: 'player_killed',
          killerId: player.id,
          killerName: player.name,
          victimId: hitPlayer.id,
          victimName: hitPlayer.name,
        });
      }
    }
  }

  private endGame(): void {
    this.gameOver = true;
    const scores = Array.from(this.players.values())
      .map(p => ({ id: p.id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);

    this.broadcast({ type: 'game_over', scores });

    // Stop ticking after a delay
    setTimeout(() => this.stopTicking(), 5000);
  }

  private broadcast(msg: ServerMessage, excludeId?: string): void {
    for (const player of this.players.values()) {
      if (player.id !== excludeId) {
        player.send(msg);
      }
    }
  }
}

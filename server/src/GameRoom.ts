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

const TICK_RATE = 20;
const TICK_DT = 1 / TICK_RATE;
const MAX_PLAYERS = 8;
const TOTAL_LEVELS = 10;

// Minimal level generator for server side
// Generates a simple rooms layout with enemies
function generateServerLevel(seed: number, level: number): {
  walls: number[][];
  width: number;
  height: number;
  enemies: { type: string; x: number; y: number; angle: number }[];
  spawnPoints: { x: number; y: number }[];
  exitTile: { x: number; y: number } | null;
} {
  const rng = new SeededRandom(seed);
  const width = 32;
  const height = 32;

  // Build walls grid
  const walls: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(y === 0 || y === height - 1 || x === 0 || x === width - 1 ? 1 : 0);
    }
    walls.push(row);
  }

  // Create rooms with walls between them
  const roomSize = 8;
  const numRoomsX = Math.floor((width - 2) / roomSize);
  const numRoomsZ = Math.floor((height - 2) / roomSize);

  // Add internal walls with doorways
  for (let ry = 0; ry < numRoomsZ; ry++) {
    for (let rx = 0; rx < numRoomsX; rx++) {
      const bx = 1 + rx * roomSize;
      const by = 1 + ry * roomSize;
      // East wall
      if (rx < numRoomsX - 1) {
        const wallX = bx + roomSize;
        if (wallX < width - 1) {
          for (let y = by; y < by + roomSize && y < height - 1; y++) {
            walls[y]![wallX] = 1;
          }
          // Doorway
          const doorY = by + rng.int(1, roomSize - 2);
          if (doorY < height - 1) walls[doorY]![wallX] = 0;
          if (doorY + 1 < height - 1) walls[doorY + 1]![wallX] = 0;
        }
      }
      // South wall
      if (ry < numRoomsZ - 1) {
        const wallY = by + roomSize;
        if (wallY < height - 1) {
          for (let x = bx; x < bx + roomSize && x < width - 1; x++) {
            walls[wallY]![x] = 1;
          }
          // Doorway
          const doorX = bx + rng.int(1, roomSize - 2);
          if (doorX < width - 1) walls[wallY]![doorX] = 0;
          if (doorX + 1 < width - 1) walls[wallY]![doorX + 1] = 0;
        }
      }
    }
  }

  // Scatter some pillars for cover
  const pillarCount = rng.int(5, 15);
  for (let i = 0; i < pillarCount; i++) {
    const px = rng.int(2, width - 3);
    const py = rng.int(2, height - 3);
    if (walls[py]![px] === 0) {
      walls[py]![px] = 1;
    }
  }

  // Collect floor tiles and shuffle them
  const floorTiles: { x: number; y: number }[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (walls[y]![x] === 0) floorTiles.push({ x, y });
    }
  }
  // Fisher-Yates shuffle
  for (let i = floorTiles.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [floorTiles[i], floorTiles[j]] = [floorTiles[j]!, floorTiles[i]!];
  }

  // Spawn points spread across the map (take first N from shuffled)
  const spawnCount = Math.min(8, floorTiles.length);
  const spawnPoints = floorTiles.slice(0, spawnCount);

  // Place enemies on remaining tiles, away from spawn points (min 5 tiles)
  const spawnSet = new Set(spawnPoints.map(s => `${s.x},${s.y}`));
  const enemyTiles = floorTiles.slice(spawnCount).filter(t => {
    for (const sp of spawnPoints) {
      const dx = t.x - sp.x;
      const dy = t.y - sp.y;
      if (dx * dx + dy * dy < 25) return false; // min 5 tiles distance
    }
    return !spawnSet.has(`${t.x},${t.y}`);
  });

  const enemyTypes: string[] = ['guard', 'dog'];
  if (level >= 2) enemyTypes.push('ss');
  if (level >= 3) enemyTypes.push('mutant');
  if (level >= 5) enemyTypes.push('officer');

  const enemyCount = 5 + level * 2;
  const enemies: { type: string; x: number; y: number; angle: number }[] = [];
  for (let i = 0; i < enemyCount && i < enemyTiles.length; i++) {
    const tile = enemyTiles[i]!;
    const type = enemyTypes[rng.int(0, enemyTypes.length - 1)]!;
    enemies.push({ type, x: tile.x, y: tile.y, angle: rng.next() * Math.PI * 2 });
  }

  // Boss on level 10
  if (level === TOTAL_LEVELS) {
    const centerTile = floorTiles[Math.floor(floorTiles.length / 2)]!;
    enemies.push({ type: 'boss', x: centerTile.x, y: centerTile.y, angle: 0 });
  }

  // Exit tile (far corner)
  const exitTile = level < TOTAL_LEVELS ? { x: width - 2, y: height - 2 } : null;

  return { walls, width, height, enemies, spawnPoints, exitTile };
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

    // Pre-generate all levels and store layout data
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const levelSeed = this.seed + i * 1000;
      const data = generateServerLevel(levelSeed, i);
      this.levelConfigs.push({
        level: i,
        seed: levelSeed,
        width: data.width,
        height: data.height,
        walls: data.walls,
        enemies: data.enemies,
        playerStart: data.spawnPoints[0] || { x: 2, y: 2 },
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

    // Get or create level instance
    const levelInst = this.getOrCreateLevel(1);
    const spawn = levelInst.getRandomSpawn(this.rng);
    session.x = spawn.x;
    session.z = spawn.z;
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

    const config = this.levelConfigs.find(c => c.level === level)!;
    const data = generateServerLevel(config.seed, level);
    inst = new LevelInstance(level, data.walls, data.width, data.height);

    // Add enemies
    for (const e of data.enemies) {
      inst.addEnemy(e.type, e.x, e.y, e.angle);
    }

    // Scatter items on the map
    const rng = new SeededRandom(config.seed + 999);
    const floorTiles: { x: number; y: number }[] = [];
    for (let y = 1; y < data.height - 1; y++) {
      for (let x = 1; x < data.width - 1; x++) {
        if (data.walls[y]![x] === 0) floorTiles.push({ x, y });
      }
    }
    const itemTypes = ['food', 'first_aid', 'ammo_clip', 'ammo_clip', 'cross', 'chalice'];
    const itemCount = 8 + level * 2;
    for (let i = 0; i < itemCount && floorTiles.length > 0; i++) {
      const idx = rng.int(0, floorTiles.length - 1);
      const tile = floorTiles.splice(idx, 1)[0]!;
      const subtype = itemTypes[rng.int(0, itemTypes.length - 1)]!;
      inst.spawnItem(subtype, (tile.x + 0.5) * TILE_SIZE, (tile.y + 0.5) * TILE_SIZE);
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

      // Handle shooting using client position/angle
      if (anyShoot && player.alive) {
        this.handleShoot(player, levelInst);
      }

      // Handle interact (exit tile / level advance)
      if (anyInteract && player.alive && player.level < TOTAL_LEVELS) {
        const levelData = generateServerLevel(
          this.levelConfigs[player.level - 1]!.seed,
          player.level,
        );
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

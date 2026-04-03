// Pre-generate multiplayer levels as JSON for the server
import { generateLevel } from '../src/map/LevelGenerator.js';
import type { LevelConfig } from '../src/map/types.js';
import { writeFileSync, mkdirSync } from 'fs';

const TOTAL_LEVELS = 10;
const BASE_SEED = 42000; // fixed seed for reproducibility

function buildConfig(seed: number, level: number): LevelConfig {
  const enemyTypes: Record<string, number> = { guard: 3, dog: 1 };
  if (level >= 2) enemyTypes.ss = 1;
  if (level >= 3) enemyTypes.mutant = 1;
  if (level >= 5) enemyTypes.officer = 1;
  if (level >= 7) { enemyTypes.officer = 2; enemyTypes.ss = 2; }

  return {
    style: 'rooms_corridors',
    seed,
    enemyCount: [5 + level * 2, 10 + level * 3],
    enemyTypes,
    itemDensity: 0.5,
    doorCount: [2, 4 + level],
    wallVariety: Math.min(7, 2 + level),
  };
}

const ENEMY_TYPES = new Set(['guard', 'dog', 'ss', 'mutant', 'officer', 'boss']);

mkdirSync('server/data', { recursive: true });

for (let level = 1; level <= TOTAL_LEVELS; level++) {
  const seed = BASE_SEED + level * 1000;
  const config = buildConfig(seed, level);
  const data = generateLevel(config);

  if (level === TOTAL_LEVELS && data.exitTile) {
    data.entities.push({ type: 'boss', x: data.exitTile.x, y: data.exitTile.y - 1, angle: 180 });
  }

  const output = {
    level,
    seed,
    width: data.width,
    height: data.height,
    // Replace door tiles (-1) with open floor (0) — MP has no door system
    walls: data.walls.map(row => row.map(v => v === -1 ? 0 : v)),
    enemies: data.entities
      .filter(e => ENEMY_TYPES.has(e.type))
      .map(e => ({ type: e.type, x: e.x, y: e.y, angle: (e.angle || 0) * Math.PI / 180 })),
    items: data.entities
      .filter(e => !ENEMY_TYPES.has(e.type) && e.subtype)
      .map(e => ({ subtype: e.subtype!, x: e.x, y: e.y })),
    playerStart: data.playerStart,
    exitTile: data.exitTile,
  };

  writeFileSync(`server/data/level${level}.json`, JSON.stringify(output));
  console.log(`Level ${level}: ${output.enemies.length} enemies, ${output.items.length} items, ${data.width}x${data.height}`);
}

console.log('Done! Files in server/data/');

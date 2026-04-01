import { describe, it, expect } from 'vitest';
import { generateLevel } from '../../src/map/LevelGenerator.js';
import { validateReachability, validateAmmoSufficiency, validateKeyAccessibility } from '../../src/map/LevelValidator.js';
import type { LevelConfig } from '../../src/map/types.js';

const BASE_CONFIG: LevelConfig = {
  style: 'rooms_corridors',
  seed: 42,
  enemyCount: [5, 10],
  enemyTypes: { guard: 3, dog: 1 },
  itemDensity: 0.5,
};

describe('generateLevel', () => {
  it('returns valid LevelData with correct dimensions', () => {
    const level = generateLevel(BASE_CONFIG);
    expect(level.width).toBe(32);
    expect(level.height).toBe(32);
    expect(level.walls.length).toBe(32);
    expect(level.walls[0].length).toBe(32);
  });

  it('has playerStart on a floor tile', () => {
    const level = generateLevel(BASE_CONFIG);
    expect(level.walls[level.playerStart.y][level.playerStart.x]).toBe(0);
  });

  it('has exitTile on a floor tile', () => {
    const level = generateLevel(BASE_CONFIG);
    expect(level.exitTile).not.toBeNull();
    expect(level.walls[level.exitTile!.y][level.exitTile!.x]).toBe(0);
  });

  it('exit is reachable from playerStart', () => {
    const level = generateLevel(BASE_CONFIG);
    const spawns = [{ x: level.playerStart.x, y: level.playerStart.y }];
    expect(validateReachability(level, spawns)).toBe(true);
  });

  it('has sufficient ammo', () => {
    const level = generateLevel(BASE_CONFIG);
    expect(validateAmmoSufficiency(level)).toBe(true);
  });

  it('enemies are placed on floor tiles', () => {
    const level = generateLevel(BASE_CONFIG);
    const enemies = level.entities.filter(e => e.type !== 'item');
    for (const e of enemies) {
      expect(level.walls[e.y][e.x]).toBe(0);
    }
  });

  it('enemy count is within config range', () => {
    const level = generateLevel(BASE_CONFIG);
    const enemies = level.entities.filter(e => e.type !== 'item');
    expect(enemies.length).toBeGreaterThanOrEqual(5);
    expect(enemies.length).toBeLessThanOrEqual(10);
  });

  it('enemies are at least 8 tiles from spawns', () => {
    const level = generateLevel(BASE_CONFIG);
    const enemies = level.entities.filter(e => e.type !== 'item');
    const sx = level.playerStart.x;
    const sy = level.playerStart.y;
    for (const e of enemies) {
      const dist = Math.sqrt((e.x - sx) ** 2 + (e.y - sy) ** 2);
      expect(dist).toBeGreaterThanOrEqual(8);
    }
  });

  it('is deterministic', () => {
    const a = generateLevel({ ...BASE_CONFIG, seed: 123 });
    const b = generateLevel({ ...BASE_CONFIG, seed: 123 });
    expect(a.walls).toEqual(b.walls);
    expect(a.entities).toEqual(b.entities);
    expect(a.playerStart).toEqual(b.playerStart);
    expect(a.exitTile).toEqual(b.exitTile);
  });

  it('works with hub_spoke style', () => {
    const level = generateLevel({ ...BASE_CONFIG, style: 'hub_spoke', seed: 55 });
    expect(level.exitTile).not.toBeNull();
    const spawns = [{ x: level.playerStart.x, y: level.playerStart.y }];
    expect(validateReachability(level, spawns)).toBe(true);
  });

  it('works with maze style', () => {
    const level = generateLevel({ ...BASE_CONFIG, style: 'maze', seed: 77 });
    expect(level.exitTile).not.toBeNull();
    const spawns = [{ x: level.playerStart.x, y: level.playerStart.y }];
    expect(validateReachability(level, spawns)).toBe(true);
  });

  it('generates locked doors with accessible keys', () => {
    const config: LevelConfig = {
      ...BASE_CONFIG,
      seed: 42,
      lockedDoors: true,
      doorCount: [4, 8],
    };
    const level = generateLevel(config);
    expect(validateKeyAccessibility(level)).toBe(true);
  });

  it('generates multiplayer spawns', () => {
    const config: LevelConfig = {
      ...BASE_CONFIG,
      seed: 42,
      spawnCount: 4,
    };
    const level = generateLevel(config);
    expect((level as any).playerSpawns).toBeDefined();
    expect((level as any).playerSpawns.length).toBe(4);
  });
});

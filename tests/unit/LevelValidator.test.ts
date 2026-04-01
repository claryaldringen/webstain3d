import { describe, it, expect } from 'vitest';
import { floodFill, validateReachability, validateAmmoSufficiency, validateKeyAccessibility } from '../../src/map/LevelValidator.js';
import type { LevelData } from '../../src/types/index.js';

describe('floodFill', () => {
  it('fills connected empty tiles', () => {
    const walls = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];
    const reachable = floodFill(walls, 1, 1, 5, 5);
    expect(reachable.has('1,1')).toBe(true);
    expect(reachable.has('2,1')).toBe(true);
    expect(reachable.has('3,1')).toBe(true);
    expect(reachable.has('3,3')).toBe(true);
    expect(reachable.has('2,2')).toBe(false);
    expect(reachable.size).toBe(8);
  });

  it('respects blocked tiles set', () => {
    const walls = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];
    const blocked = new Set(['2,1']);
    const reachable = floodFill(walls, 1, 1, 5, 5, blocked);
    expect(reachable.has('2,1')).toBe(false);
    expect(reachable.has('1,2')).toBe(true);
  });
});

describe('validateReachability', () => {
  it('returns true when exit is reachable from all spawns', () => {
    const level: LevelData = {
      width: 5, height: 5,
      walls: [
        [1,1,1,1,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1],
      ],
      doors: [], pushwalls: [], entities: [],
      playerStart: { x: 1, y: 1, angle: 0 },
      exitTile: { x: 3, y: 3 },
    };
    expect(validateReachability(level, [{ x: 1, y: 1 }, { x: 3, y: 1 }])).toBe(true);
  });

  it('returns false when exit is unreachable', () => {
    const level: LevelData = {
      width: 5, height: 5,
      walls: [
        [1,1,1,1,1],
        [1,0,0,1,1],
        [1,0,0,1,1],
        [1,1,1,0,1],
        [1,1,1,1,1],
      ],
      doors: [], pushwalls: [], entities: [],
      playerStart: { x: 1, y: 1, angle: 0 },
      exitTile: { x: 3, y: 3 },
    };
    expect(validateReachability(level, [{ x: 1, y: 1 }])).toBe(false);
  });
});

describe('validateAmmoSufficiency', () => {
  it('returns true when enough ammo for all enemies', () => {
    const level: LevelData = {
      width: 5, height: 5,
      walls: [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
      doors: [], pushwalls: [],
      entities: [
        { type: 'guard', x: 2, y: 2, angle: 0 },
        { type: 'item', subtype: 'ammo_clip', x: 1, y: 1 },
        { type: 'item', subtype: 'ammo_clip', x: 1, y: 2 },
      ],
      playerStart: { x: 1, y: 1, angle: 0 },
      exitTile: { x: 3, y: 3 },
    };
    expect(validateAmmoSufficiency(level)).toBe(true);
  });

  it('returns false when not enough ammo', () => {
    const level: LevelData = {
      width: 5, height: 5,
      walls: [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
      doors: [], pushwalls: [],
      entities: [
        { type: 'guard', x: 2, y: 2, angle: 0 },
        { type: 'guard', x: 2, y: 3, angle: 0 },
        { type: 'guard', x: 3, y: 2, angle: 0 },
        { type: 'guard', x: 3, y: 3, angle: 0 },
        { type: 'ss', x: 1, y: 3, angle: 0 },
        { type: 'ss', x: 3, y: 1, angle: 0 },
      ],
      playerStart: { x: 1, y: 1, angle: 0 },
      exitTile: { x: 3, y: 3 },
    };
    expect(validateAmmoSufficiency(level)).toBe(false);
  });
});

describe('validateKeyAccessibility', () => {
  it('returns true when key is reachable without locked door', () => {
    const level: LevelData = {
      width: 7, height: 5,
      walls: [
        [1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1],
        [1,0,1,0,1,0,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1],
      ],
      doors: [{ x: 4, y: 2, type: 'gold' }],
      pushwalls: [],
      entities: [{ type: 'item', subtype: 'key_gold', x: 1, y: 1 }],
      playerStart: { x: 1, y: 3, angle: 0 },
      exitTile: { x: 5, y: 3 },
    };
    expect(validateKeyAccessibility(level)).toBe(true);
  });

  it('returns false when key is behind its own locked door', () => {
    const level: LevelData = {
      width: 7, height: 3,
      walls: [
        [1,1,1,1,1,1,1],
        [1,0,0,0,0,0,1],
        [1,1,1,1,1,1,1],
      ],
      doors: [{ x: 3, y: 1, type: 'gold' }],
      pushwalls: [],
      entities: [{ type: 'item', subtype: 'key_gold', x: 5, y: 1 }],
      playerStart: { x: 1, y: 1, angle: 0 },
      exitTile: { x: 5, y: 1 },
    };
    expect(validateKeyAccessibility(level)).toBe(false);
  });
});

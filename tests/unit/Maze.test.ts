import { describe, it, expect } from 'vitest';
import { generateMaze } from '../../src/map/generators/Maze.js';
import { SeededRandom } from '../../src/map/SeededRandom.js';
import { floodFill } from '../../src/map/LevelValidator.js';

describe('generateMaze', () => {
  it('produces a grid of correct dimensions', () => {
    const rng = new SeededRandom(42);
    const result = generateMaze(rng, 32, 32, 3);
    expect(result.walls.length).toBe(32);
    expect(result.walls[0].length).toBe(32);
  });

  it('has walls around the border', () => {
    const rng = new SeededRandom(42);
    const result = generateMaze(rng, 32, 32, 3);
    for (let x = 0; x < 32; x++) {
      expect(result.walls[0][x]).toBeGreaterThan(0);
      expect(result.walls[31][x]).toBeGreaterThan(0);
    }
  });

  it('all floor tiles are connected', () => {
    const rng = new SeededRandom(42);
    const result = generateMaze(rng, 32, 32, 3);
    let startX = -1, startY = -1;
    outer: for (let y = 1; y < 31; y++) {
      for (let x = 1; x < 31; x++) {
        if (result.walls[y][x] === 0) { startX = x; startY = y; break outer; }
      }
    }
    expect(startX).toBeGreaterThan(0);
    const reachable = floodFill(result.walls, startX, startY, 32, 32);
    let floorCount = 0;
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++)
        if (result.walls[y][x] === 0) floorCount++;
    expect(reachable.size).toBe(floorCount);
  });

  it('generates rooms from dead-end expansion', () => {
    const rng = new SeededRandom(42);
    const result = generateMaze(rng, 32, 32, 3);
    expect(result.rooms.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const a = generateMaze(new SeededRandom(99), 32, 32, 3);
    const b = generateMaze(new SeededRandom(99), 32, 32, 3);
    expect(a.walls).toEqual(b.walls);
  });
});

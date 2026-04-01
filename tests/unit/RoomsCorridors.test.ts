import { describe, it, expect } from 'vitest';
import { generateRoomsCorridors } from '../../src/map/generators/RoomsCorridors.js';
import { SeededRandom } from '../../src/map/SeededRandom.js';
import { floodFill } from '../../src/map/LevelValidator.js';

describe('generateRoomsCorridors', () => {
  it('produces a grid of correct dimensions', () => {
    const rng = new SeededRandom(42);
    const result = generateRoomsCorridors(rng, 32, 32, 3);
    expect(result.walls.length).toBe(32);
    expect(result.walls[0].length).toBe(32);
  });

  it('has walls around the border', () => {
    const rng = new SeededRandom(42);
    const result = generateRoomsCorridors(rng, 32, 32, 3);
    for (let x = 0; x < 32; x++) {
      expect(result.walls[0][x]).toBeGreaterThan(0);
      expect(result.walls[31][x]).toBeGreaterThan(0);
    }
    for (let y = 0; y < 32; y++) {
      expect(result.walls[y][0]).toBeGreaterThan(0);
      expect(result.walls[y][31]).toBeGreaterThan(0);
    }
  });

  it('generates at least 3 rooms', () => {
    const rng = new SeededRandom(42);
    const result = generateRoomsCorridors(rng, 32, 32, 3);
    expect(result.rooms.length).toBeGreaterThanOrEqual(3);
  });

  it('all rooms are connected (single flood fill reaches all room tiles)', () => {
    const rng = new SeededRandom(42);
    const result = generateRoomsCorridors(rng, 32, 32, 3);
    const firstRoom = result.rooms[0];
    const cx = firstRoom.x + Math.floor(firstRoom.w / 2);
    const cy = firstRoom.y + Math.floor(firstRoom.h / 2);
    const reachable = floodFill(result.walls, cx, cy, 32, 32);
    for (const room of result.rooms) {
      const rx = room.x + Math.floor(room.w / 2);
      const ry = room.y + Math.floor(room.h / 2);
      expect(reachable.has(`${rx},${ry}`)).toBe(true);
    }
  });

  it('is deterministic with same seed', () => {
    const a = generateRoomsCorridors(new SeededRandom(99), 32, 32, 3);
    const b = generateRoomsCorridors(new SeededRandom(99), 32, 32, 3);
    expect(a.walls).toEqual(b.walls);
    expect(a.rooms).toEqual(b.rooms);
  });
});

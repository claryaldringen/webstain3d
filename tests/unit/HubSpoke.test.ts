import { describe, it, expect } from 'vitest';
import { generateHubSpoke } from '../../src/map/generators/HubSpoke.js';
import { SeededRandom } from '../../src/map/SeededRandom.js';
import { floodFill } from '../../src/map/LevelValidator.js';

describe('generateHubSpoke', () => {
  it('produces a grid of correct dimensions', () => {
    const rng = new SeededRandom(42);
    const result = generateHubSpoke(rng, 32, 32, 3, 4);
    expect(result.walls.length).toBe(32);
    expect(result.walls[0].length).toBe(32);
  });

  it('has a central room', () => {
    const rng = new SeededRandom(42);
    const result = generateHubSpoke(rng, 32, 32, 3, 4);
    const cx = 15, cy = 15;
    expect(result.walls[cy][cx]).toBe(0);
  });

  it('all rooms are connected', () => {
    const rng = new SeededRandom(42);
    const result = generateHubSpoke(rng, 32, 32, 3, 8);
    const reachable = floodFill(result.walls, 15, 15, 32, 32);
    for (const room of result.rooms) {
      const rx = room.x + Math.floor(room.w / 2);
      const ry = room.y + Math.floor(room.h / 2);
      expect(reachable.has(`${rx},${ry}`)).toBe(true);
    }
  });

  it('generates spoke count + 1 rooms (hub + spokes)', () => {
    const rng = new SeededRandom(42);
    const result = generateHubSpoke(rng, 32, 32, 3, 6);
    expect(result.rooms.length).toBeGreaterThanOrEqual(7);
  });

  it('is deterministic', () => {
    const a = generateHubSpoke(new SeededRandom(99), 32, 32, 3, 4);
    const b = generateHubSpoke(new SeededRandom(99), 32, 32, 3, 4);
    expect(a.walls).toEqual(b.walls);
  });
});

import { describe, it, expect } from 'vitest';
import { SeededRandom } from '../../src/map/SeededRandom.js';

describe('SeededRandom', () => {
  it('produces deterministic sequence from same seed', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences from different seeds', () => {
    const a = new SeededRandom(1);
    const b = new SeededRandom(2);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() returns values in [0, 1)', () => {
    const rng = new SeededRandom(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min, max) returns integers in [min, max]', () => {
    const rng = new SeededRandom(999);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('pick() returns element from array', () => {
    const rng = new SeededRandom(55);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('shuffle() returns all elements', () => {
    const rng = new SeededRandom(77);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle([...arr]);
    expect(shuffled.sort()).toEqual(arr);
  });

  it('weightedPick() respects weights', () => {
    const rng = new SeededRandom(42);
    const counts: Record<string, number> = { a: 0, b: 0 };
    const weights = { a: 100, b: 1 };
    for (let i = 0; i < 1000; i++) {
      counts[rng.weightedPick(weights)]++;
    }
    expect(counts.a).toBeGreaterThan(counts.b * 5);
  });
});

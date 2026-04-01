import { describe, it, expect } from 'vitest';
import { checkCollision } from '../../src/systems/CollisionSystem.js';

function solidAt(solidTiles: Set<string>) {
  return (tx: number, ty: number) => solidTiles.has(`${tx},${ty}`);
}

describe('CollisionSystem', () => {
  it('returns false when no solid tiles nearby', () => {
    const isSolid = solidAt(new Set());
    expect(checkCollision(5.5, 5.5, 0.4, isSolid, 1)).toBe(false);
  });

  it('returns true when player overlaps a solid tile', () => {
    const isSolid = solidAt(new Set(['5,5']));
    expect(checkCollision(5.3, 5.3, 0.4, isSolid, 1)).toBe(true);
  });

  it('returns false when player is just outside radius', () => {
    const isSolid = solidAt(new Set(['3,3']));
    expect(checkCollision(4.5, 4.5, 0.4, isSolid, 1)).toBe(false);
  });

  it('returns true when player touches wall edge', () => {
    const isSolid = solidAt(new Set(['3,3']));
    expect(checkCollision(4.2, 4.2, 0.4, isSolid, 1)).toBe(true);
  });

  it('treats out-of-bounds as solid', () => {
    const isSolid = (_tx: number, _ty: number) => true;
    expect(checkCollision(0.5, 0.5, 0.4, isSolid, 1)).toBe(true);
  });
});

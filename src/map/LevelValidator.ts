import type { LevelData, TilePosition } from '../types/index.js';

const AMMO_PER_ITEM: Record<string, number> = { ammo_clip: 8, ammo_stack: 25 };
const SHOTS_TO_KILL: Record<string, number> = { guard: 3, ss: 5, dog: 1 };
const STARTING_AMMO = 8;
const AMMO_RESERVE_FACTOR = 1.2;

export function floodFill(
  walls: number[][],
  startX: number, startY: number,
  width: number, height: number,
  blocked?: Set<string>,
): Set<string> {
  const reachable = new Set<string>();
  const queue: [number, number][] = [[startX, startY]];
  const key = (x: number, y: number) => `${x},${y}`;
  reachable.add(key(startX, startY));

  while (queue.length > 0) {
    const [cx, cy] = queue.pop()!;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + dx, ny = cy + dy;
      const k = key(nx, ny);
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (reachable.has(k)) continue;
      if (walls[ny][nx] > 0) continue;
      if (blocked?.has(k)) continue;
      reachable.add(k);
      queue.push([nx, ny]);
    }
  }
  return reachable;
}

export function validateReachability(level: LevelData, spawns: TilePosition[]): boolean {
  if (!level.exitTile) return false;
  const exitKey = `${level.exitTile.x},${level.exitTile.y}`;
  const passableWalls = level.walls.map(row => row.map(v => (v < 0 ? 0 : v)));
  for (const spawn of spawns) {
    const reachable = floodFill(passableWalls, spawn.x, spawn.y, level.width, level.height);
    if (!reachable.has(exitKey)) return false;
  }
  return true;
}

export function validateAmmoSufficiency(level: LevelData): boolean {
  let ammoNeeded = 0;
  let ammoAvailable = STARTING_AMMO;
  for (const e of level.entities) {
    if (e.type === 'guard' || e.type === 'ss' || e.type === 'dog') {
      ammoNeeded += SHOTS_TO_KILL[e.type] ?? 3;
    }
    if (e.type === 'item' && e.subtype && AMMO_PER_ITEM[e.subtype]) {
      ammoAvailable += AMMO_PER_ITEM[e.subtype];
    }
  }
  return ammoAvailable >= ammoNeeded * AMMO_RESERVE_FACTOR;
}

export function validateKeyAccessibility(level: LevelData): boolean {
  const lockedDoors = level.doors.filter(d => d.type === 'gold' || d.type === 'silver');
  if (lockedDoors.length === 0) return true;
  const passableWalls = level.walls.map(row => row.map(v => (v < 0 ? 0 : v)));
  for (const door of lockedDoors) {
    const keySubtype = door.type === 'gold' ? 'key_gold' : 'key_silver';
    const keyEntity = level.entities.find(e => e.type === 'item' && e.subtype === keySubtype);
    if (!keyEntity) return false;
    const blocked = new Set([`${door.x},${door.y}`]);
    const reachable = floodFill(passableWalls, level.playerStart.x, level.playerStart.y, level.width, level.height, blocked);
    if (!reachable.has(`${keyEntity.x},${keyEntity.y}`)) return false;
  }
  return true;
}

export function validateLevel(level: LevelData): string[] {
  const errors: string[] = [];
  const spawns = [{ x: level.playerStart.x, y: level.playerStart.y }];
  if (!validateReachability(level, spawns)) errors.push('Exit is not reachable from all spawn points');
  if (!validateAmmoSufficiency(level)) errors.push('Insufficient ammo to kill all enemies');
  if (!validateKeyAccessibility(level)) errors.push('Locked door key is not accessible without that door');
  return errors;
}

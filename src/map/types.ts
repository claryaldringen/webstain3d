// src/map/types.ts
export interface LevelConfig {
  width?: number;
  height?: number;
  style: 'rooms_corridors' | 'hub_spoke' | 'maze';
  seed?: number;
  enemyCount: [number, number];
  enemyTypes: Record<string, number>;
  itemDensity: number;
  doorCount?: [number, number];
  lockedDoors?: boolean;
  wallVariety?: number;
  spawnCount?: number;
  spawnBalance?: boolean;
}

export interface ResolvedConfig {
  width: number;
  height: number;
  style: 'rooms_corridors' | 'hub_spoke' | 'maze';
  seed: number;
  enemyCount: [number, number];
  enemyTypes: Record<string, number>;
  itemDensity: number;
  doorCount: [number, number];
  lockedDoors: boolean;
  wallVariety: number;
  spawnCount: number;
  spawnBalance: boolean;
}

export type Grid = number[][];

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutResult {
  walls: Grid;
  rooms: Room[];
}

export function resolveConfig(config: LevelConfig): ResolvedConfig {
  return {
    width: config.width ?? 32,
    height: config.height ?? 32,
    style: config.style,
    seed: config.seed ?? Date.now(),
    enemyCount: config.enemyCount,
    enemyTypes: config.enemyTypes,
    itemDensity: config.itemDensity,
    doorCount: config.doorCount ?? [2, 6],
    lockedDoors: config.lockedDoors ?? false,
    wallVariety: config.wallVariety ?? 3,
    spawnCount: config.spawnCount ?? 0,
    spawnBalance: config.spawnBalance ?? false,
  };
}

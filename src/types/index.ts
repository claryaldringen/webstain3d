import type * as THREE from 'three';

export interface Position {
  x: number;
  z: number;
}

export interface TilePosition {
  x: number;
  y: number;
}

export interface LevelData {
  width: number;
  height: number;
  walls: number[][];
  doors: DoorData[];
  pushwalls: PushwallData[];
  entities: EntityData[];
  playerStart: PlayerStartData;
  exitTile: TilePosition | null;
}

export interface DoorData {
  x: number;
  y: number;
  type: 'normal' | 'gold' | 'silver';
}

export interface PushwallData {
  x: number;
  y: number;
  textureId: number;
}

export interface EntityData {
  type: 'item' | 'guard' | 'ss' | 'dog';
  subtype?: string;
  x: number;
  y: number;
  angle?: number;
}

export interface PlayerStartData {
  x: number;
  y: number;
  angle: number;
}

export interface EnemyConfig {
  health: number;
  speed: number;
  damage: [number, number];
  attackRange: number;
  alertSound: string;
}

export interface WeaponConfig {
  fireRate: number;
  range: number;
  damageMin: number;
  damageMax: number;
  usesAmmo: boolean;
}

export interface MovementInput {
  forward: number;
  strafe: number;
  rotate: number;
  sprint: boolean;
}

export interface SpriteHandle {
  mesh: THREE.Mesh;
  label: string;
}

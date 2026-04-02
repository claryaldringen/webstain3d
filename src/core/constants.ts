import type { EnemyConfig } from '../types/index.js';

// Map and rendering
export const TILE_SIZE = 1;
export const WALL_HEIGHT = 1;
export const MAP_SIZE = 64;
export const CAMERA_FOV = 66;
export const RENDER_SCALE = 0.75;
export const FOG_NEAR = 4;
export const FOG_FAR = 24;
export const TEXTURE_SIZE = 64;

// Wall texture IDs: structural for room fill, decorative for accents only
export const STRUCTURAL_WALL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const DECORATIVE_WALL_IDS = [51, 52, 53, 54, 55, 56, 57, 58, 59, 60];

// Player
export const PLAYER_MOVE_SPEED = 3.5;
export const PLAYER_SPRINT_MULTIPLIER = 2;
export const PLAYER_ROTATE_SPEED = 2.6;
export const PLAYER_RADIUS = 0.4;
export const PLAYER_HEIGHT = 0.5;
export const PLAYER_START_HEALTH = 100;
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_START_LIVES = 3;
export const PLAYER_START_AMMO = 8;

// Weapons
export enum WeaponId { Knife = 0, Pistol = 1, MachineGun = 2, Chaingun = 3 }

export const WEAPON_DAMAGE_MIN = 15;
export const WEAPON_DAMAGE_MAX = 25;

export const WEAPON_FIRE_RATES: Record<WeaponId, number> = {
  [WeaponId.Knife]: 0.5,
  [WeaponId.Pistol]: 0.5,
  [WeaponId.MachineGun]: 0.15,
  [WeaponId.Chaingun]: 0.1,
};

export const WEAPON_RANGE: Record<WeaponId, number> = {
  [WeaponId.Knife]: 1.5,
  [WeaponId.Pistol]: 64,
  [WeaponId.MachineGun]: 64,
  [WeaponId.Chaingun]: 64,
};

export const WEAPON_NAMES: readonly string[] = ['knife', 'pistol', 'machinegun', 'chaingun'] as const;

// Enemies
export const ENEMY_TYPES: Record<string, EnemyConfig> = {
  guard: { health: 25, speed: 1.5, damage: [5, 15], attackRange: 2, alertSound: 'guard_alert' },
  ss: { health: 50, speed: 1.5, damage: [10, 20], attackRange: 2, alertSound: 'ss_alert' },
  dog: { health: 1, speed: 3.0, damage: [5, 10], attackRange: 1.2, alertSound: 'dog_alert' },
  mutant: { health: 45, speed: 1.8, damage: [8, 18], attackRange: 2, alertSound: 'guard_alert' },
  officer: { health: 50, speed: 2.2, damage: [12, 24], attackRange: 2.5, alertSound: 'ss_alert' },
  boss: { health: 500, speed: 1.0, damage: [25, 40], attackRange: 3, alertSound: 'ss_alert' },
};

export const ENEMY_DROPS: Record<string, string | null> = {
  guard: 'ammo_clip',
  ss: 'machine_gun',
  dog: null,
  mutant: 'ammo_clip',
  officer: 'ammo_clip',
  boss: 'chaingun',
};

export const ENEMY_SIGHT_RANGE = 30;
export const ENEMY_DEATH_FRAME_DURATION = 0.15;
export const ENEMY_ATTACK_FRAME_DURATION = 0.25;
export const ENEMY_ALERT_DELAY = 0.5;
export const ENEMY_PAIN_DURATION = 0.3;
export const ENEMY_ATTACK_COOLDOWN = 0.5;

// Items
export interface ItemEffect {
  type: 'health' | 'ammo' | 'score' | 'key' | 'life' | 'weapon';
  value: number | string;
}

export const ITEM_EFFECTS: Record<string, ItemEffect> = {
  food: { type: 'health', value: 4 },
  first_aid: { type: 'health', value: 10 },
  medkit: { type: 'health', value: 25 },
  ammo_clip: { type: 'ammo', value: 8 },
  ammo_stack: { type: 'ammo', value: 25 },
  cross: { type: 'score', value: 100 },
  chalice: { type: 'score', value: 500 },
  chest: { type: 'score', value: 1000 },
  crown: { type: 'score', value: 5000 },
  key_gold: { type: 'key', value: 'gold' },
  key_silver: { type: 'key', value: 'silver' },
  extra_life: { type: 'life', value: 1 },
  machine_gun: { type: 'weapon', value: WeaponId.MachineGun },
  chaingun: { type: 'weapon', value: WeaponId.Chaingun },
};

export const ITEM_PICKUP_RADIUS = 0.5;

// Doors
export const DOOR_OPEN_TIME = 1.0;
export const DOOR_STAY_TIME = 5.0;
export const DOOR_CLOSE_TIME = 1.0;
export const INTERACTION_RANGE = 1.0;
export const WALL_PLACEHOLDER_ID = 3;

// Sound
export const GUNFIRE_ALERT_RADIUS = 20;

// Enemy AI
export const ENEMY_PATROL_SPEED_FACTOR = 0.4;
export const ENEMY_STRAFE_SPEED_FACTOR = 0.5;
export const ENEMY_STRAFE_INTERVAL_MIN = 1.0;
export const ENEMY_STRAFE_INTERVAL_MAX = 2.0;
export const ENEMY_FLEE_THRESHOLD = 0.3;
export const ENEMY_FLEE_DURATION = 3.0;
export const ENEMY_PUSH_RADIUS = 0.6;
export const ENEMY_CHAIN_ALERT_RADIUS = 8;
export const ENEMY_CHAIN_ALERT_MAX_DEPTH = 2;
export const ENEMY_PATROL_RADIUS = 4;
export const BOSS_ENRAGE_THRESHOLD = 0.5;
export const BOSS_ENRAGE_SPEED_MULT = 1.5;
export const BOSS_ENRAGE_COOLDOWN_MULT = 0.6;

// Colors
export const FLOOR_COLOR = 0x7c7c7c;
export const CEILING_COLOR = 0x388088;

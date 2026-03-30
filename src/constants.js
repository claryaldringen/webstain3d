// Map and rendering
export const TILE_SIZE = 1;
export const WALL_HEIGHT = 1;
export const MAP_SIZE = 64;

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
export const WEAPON_KNIFE = 0;
export const WEAPON_PISTOL = 1;
export const WEAPON_MACHINE_GUN = 2;
export const WEAPON_CHAINGUN = 3;

export const WEAPON_DAMAGE_MIN = 15;
export const WEAPON_DAMAGE_MAX = 25;

export const WEAPON_FIRE_RATES = {
    [WEAPON_KNIFE]: 0.5,
    [WEAPON_PISTOL]: 0.5,
    [WEAPON_MACHINE_GUN]: 0.15,
    [WEAPON_CHAINGUN]: 0.1,
};

export const WEAPON_RANGE = {
    [WEAPON_KNIFE]: 1.5,
    [WEAPON_PISTOL]: 64,
    [WEAPON_MACHINE_GUN]: 64,
    [WEAPON_CHAINGUN]: 64,
};

// Enemies
export const ENEMY_TYPES = {
    guard: { health: 25, speed: 1.5, damage: [5, 15], attackRange: 10, alertSound: 'guard_alert' },
    ss: { health: 50, speed: 1.5, damage: [10, 20], attackRange: 10, alertSound: 'ss_alert' },
    dog: { health: 1, speed: 3.0, damage: [5, 10], attackRange: 1.2, alertSound: 'dog_alert' },
};

// Items
export const ITEM_EFFECTS = {
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
    machine_gun: { type: 'weapon', value: WEAPON_MACHINE_GUN },
    chaingun: { type: 'weapon', value: WEAPON_CHAINGUN },
};

// Doors
export const DOOR_OPEN_TIME = 1.0;
export const DOOR_STAY_TIME = 5.0;
export const DOOR_CLOSE_TIME = 1.0;

// Sound alert radius (in tiles)
export const GUNFIRE_ALERT_RADIUS = 20;

// Colors
export const FLOOR_COLOR = 0x707070;
export const CEILING_COLOR = 0x393939;

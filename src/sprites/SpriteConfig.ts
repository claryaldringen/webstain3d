/**
 * Sprite configuration constants — VSWAP sprite index mappings
 * for Wolf3D shareware assets.
 */

/** VSWAP sprite index for each game object label. */
export const VSWAP_SPRITE_MAP: Record<string, number> = {
  // Collectible items
  food: 26,           // Plate of food
  first_aid: 27,      // First aid kit
  medkit: 27,         // First aid kit (same sprite)
  ammo_clip: 28,      // Ammo clip
  ammo_stack: 28,     // Ammo clip (same sprite)
  machine_gun: 29,    // Machine gun pickup
  chaingun: 30,       // Chaingun pickup
  cross: 31,          // Gold cross treasure
  chalice: 32,        // Gold chalice treasure
  chest: 33,          // Gold chest treasure
  crown: 34,          // Gold crown treasure
  extra_life: 35,     // Extra life (BJ 1UP)
  key_gold: 22,       // Gold key
  key_silver: 23,     // Silver key
  // Decorative
  lamp: 6,            // Chandelier
  barrel: 3,          // Green barrel
  pillar: 9,          // White column
  plant: 10,          // Green plant/tree
  table: 4,           // Table with chairs
  skeleton: 11,       // Skeleton flat
  sink: 12,           // Sink/basin
  // Enemies (front-facing idle frame)
  guard: 50,          // Guard standing front
  dog: 99,            // Dog walk frame 1 front
  ss: 138,            // SS standing front
};

/**
 * Enemy sprite base indices — verified from id Software Wolf3D source (WL_DEF.H).
 * Order in VSWAP: stand(8d), walk1-4(8d each), pain1, die1-3, pain2, dead, shoot1-3.
 * shoot1=raise, shoot2=fire(flash), shoot3=lower; dog jump1-3 for attack.
 */
export interface EnemySpriteSet {
  stand: number;
  walk1: number;
  walk2: number;
  walk3: number;
  walk4: number;
  shoot1: number;
  shoot2: number;
  shoot3: number;
  pain: number | null;
  die1: number;
  die2: number;
  die3: number;
  dead: number;
}

export const ENEMY_SPRITE_BASE: Record<string, EnemySpriteSet> = {
  guard: {
    stand: 50, walk1: 58, walk2: 66, walk3: 74, walk4: 82,
    shoot1: 96, shoot2: 97, shoot3: 98,
    pain: 90, die1: 91, die2: 92, die3: 93, dead: 95,
  },
  dog: {
    stand: 99, walk1: 99, walk2: 107, walk3: 115, walk4: 123,
    shoot1: 135, shoot2: 136, shoot3: 137,
    pain: null, die1: 131, die2: 132, die3: 133, dead: 134,
  },
  ss: {
    stand: 138, walk1: 146, walk2: 154, walk3: 162, walk4: 170,
    shoot1: 184, shoot2: 185, shoot3: 186,
    pain: 178, die1: 179, die2: 180, die3: 181, dead: 183,
  },
};

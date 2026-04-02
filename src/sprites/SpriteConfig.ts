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
  // Decorative — static props (VSWAP indices 0–21)
  puddle: 0,          // Water puddle
  barrel_green: 1,    // Oil drum / green barrel
  table_chairs: 2,    // Table with chairs
  lamp_floor: 3,      // Floor lamp
  chandelier: 4,      // Chandelier (hanging)
  hanged_man: 5,      // Hanged man
  lamp: 6,            // Ceiling light (bright)
  bones_blood: 7,     // Bones and blood pile
  pillar: 8,          // Brick column
  plant: 9,           // Potted plant / tree
  skeleton: 10,       // Skeleton hanging
  sink: 11,           // Sink / basin
  plant_pot: 12,      // Potted plant 2
  vase: 13,           // Urn / vase
  table_plain: 14,    // Small table
  lamp_ceil: 15,      // Ceiling lamp (dim)
  suits_of_armor: 16, // Armor on stand
  cage_hanging: 17,   // Hanging cage
  skeleton_cage: 18,  // Skeleton in cage
  bones: 19,          // Pile of bones
  key_gold_col: 20,   // Gold key column marker
  key_silver_col: 21, // Silver key column marker
  barrel: 3,          // Alias for barrel_green
  table: 2,           // Alias for table_chairs
  // Enemies (front-facing idle frame)
  guard: 50,          // Guard standing front
  dog: 99,            // Dog walk frame 1 front
  ss: 138,            // SS standing front
  mutant: 187,        // Mutant standing front
  officer: 236,       // Officer standing front
  boss: 296,          // Hans Grosse walk frame 1 front
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
  /** If false, sprites are front-facing only (no +direction offset). Default: true. */
  directional?: boolean;
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
  // Mutant & Officer: shareware VSWAP has no sprites for these.
  // Re-use guard/SS sprites; distinct gameplay via different stats + placeholder colors.
  mutant: {
    stand: 50, walk1: 58, walk2: 66, walk3: 74, walk4: 82,
    shoot1: 96, shoot2: 97, shoot3: 98,
    pain: 90, die1: 91, die2: 92, die3: 93, dead: 95,
  },
  officer: {
    stand: 138, walk1: 146, walk2: 154, walk3: 162, walk4: 170,
    shoot1: 184, shoot2: 185, shoot3: 186,
    pain: 178, die1: 179, die2: 180, die3: 181, dead: 183,
  },
  boss: {
    stand: 296, walk1: 296, walk2: 297, walk3: 298, walk4: 299,
    shoot1: 300, shoot2: 301, shoot3: 302,
    pain: 304, die1: 304, die2: 305, die3: 306, dead: 303,
    directional: false,
  },
};

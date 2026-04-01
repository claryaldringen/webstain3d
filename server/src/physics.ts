// Shared physics constants (mirrors client constants)
export const TILE_SIZE = 1;
export const PLAYER_MOVE_SPEED = 3.5;
export const PLAYER_SPRINT_MULTIPLIER = 2;
export const PLAYER_ROTATE_SPEED = 2.6;
export const PLAYER_RADIUS = 0.4;
export const PLAYER_START_HEALTH = 100;
export const PLAYER_START_AMMO = 8;
export const RESPAWN_DELAY = 3;

export const WEAPON_DAMAGE: Record<number, [number, number]> = {
  0: [10, 20],  // knife
  1: [15, 25],  // pistol
  2: [15, 25],  // machine gun
  3: [15, 25],  // chaingun
};

export const WEAPON_RANGE: Record<number, number> = {
  0: 1.5,
  1: 64,
  2: 64,
  3: 64,
};

export const ENEMY_CONFIGS: Record<string, { health: number; speed: number; damage: [number, number]; attackRange: number }> = {
  guard:   { health: 25,  speed: 1.5, damage: [5, 15],  attackRange: 2 },
  ss:      { health: 50,  speed: 1.5, damage: [10, 20], attackRange: 2 },
  dog:     { health: 1,   speed: 3.0, damage: [5, 10],  attackRange: 1.2 },
  mutant:  { health: 45,  speed: 1.8, damage: [8, 18],  attackRange: 2 },
  officer: { health: 50,  speed: 2.2, damage: [12, 24], attackRange: 2.5 },
  boss:    { health: 500, speed: 1.0, damage: [25, 40], attackRange: 3 },
};

export const SCORE_ENEMY_KILL: Record<string, number> = {
  guard: 100,
  dog: 100,
  ss: 200,
  mutant: 200,
  officer: 200,
  boss: 1000,
};

export const SCORE_PLAYER_KILL = 200;
export const SCORE_DEATH_PENALTY = 50;

/** Simple seeded RNG matching client's SeededRandom */
export class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0x100000000;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

export function applyMovement(
  x: number,
  z: number,
  angle: number,
  forward: number,
  strafe: number,
  rotate: number,
  sprint: boolean,
  dt: number,
  isSolid: (tx: number, ty: number) => boolean,
): { x: number; z: number; angle: number } {
  const newAngle = angle + rotate * PLAYER_ROTATE_SPEED * dt;

  const speed = PLAYER_MOVE_SPEED * (sprint ? PLAYER_SPRINT_MULTIPLIER : 1) * dt;
  const dx = Math.cos(newAngle) * forward + Math.cos(newAngle + Math.PI / 2) * strafe;
  const dz = -Math.sin(newAngle) * forward - Math.sin(newAngle + Math.PI / 2) * strafe;

  const len = Math.sqrt(dx * dx + dz * dz);
  let newX = x;
  let newZ = z;

  if (len > 0) {
    const mx = (dx / len) * speed;
    const mz = (dz / len) * speed;

    // Sliding collision
    const tryX = x + mx;
    const tryZ = z + mz;
    const tileXNew = Math.floor(tryX / TILE_SIZE);
    const tileZOld = Math.floor(z / TILE_SIZE);
    const tileXOld = Math.floor(x / TILE_SIZE);
    const tileZNew = Math.floor(tryZ / TILE_SIZE);

    if (!isSolid(tileXNew, tileZOld)) newX = tryX;
    if (!isSolid(tileXOld, tileZNew)) newZ = tryZ;
  }

  return { x: newX, z: newZ, angle: newAngle };
}

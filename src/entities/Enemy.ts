import { EnemyState } from '../core/GameState.js';

export interface Enemy {
  type: string;
  x: number;
  z: number;
  angle: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: [number, number];
  attackRange: number;
  state: EnemyState;
  stateTimer: number;
  attackCooldown: number;
  attackTimer: number;
  attackHit: boolean;
  painTimer: number;
  deathTimer: number;
  alive: boolean;
}

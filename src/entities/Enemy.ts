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
  // AI: last known player position
  lastKnownX: number;
  lastKnownZ: number;
  // AI: patrol
  spawnX: number;
  spawnZ: number;
  patrolPath: { x: number; z: number }[];
  patrolIndex: number;
  // AI: strafing
  strafeDir: number;
  strafeTimer: number;
  // AI: flee
  fleeTimer: number;
  // AI: chain alert depth
  alertDepth: number;
  // AI: boss enrage
  enraged: boolean;
}

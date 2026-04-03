// Shared protocol types for client-server communication

export interface JoinMessage {
  type: 'join';
  name: string;
}

export interface InputMessage {
  type: 'input';
  seq: number;
  forward: number;   // -1, 0, 1
  strafe: number;    // -1, 0, 1
  rotate: number;    // -1 to 1 (analog)
  sprint: boolean;
  shoot: boolean;
  interact: boolean;
  x?: number;        // client position for shoot verification
  z?: number;
  angle?: number;
}

export type ClientMessage = JoinMessage | InputMessage;

// Server → Client

export interface PlayerSnapshot {
  id: string;
  name: string;
  x: number;
  z: number;
  angle: number;
  health: number;
  ammo: number;
  alive: boolean;
  weapon: number;
  level: number;
  shooting: boolean;
  score: number;
}

export interface EnemySnapshot {
  id: number;
  x: number;
  z: number;
  angle: number;
  state: number; // EnemyState enum value
  health: number;
  type: string;
}

export interface ItemSnapshot {
  id: number;
  subtype: string;
  x: number;
  z: number;
}

export interface StateSnapshot {
  type: 'snapshot';
  tick: number;
  seq: number; // last processed input seq for this player
  you: string; // this player's ID
  players: PlayerSnapshot[];
  enemies: EnemySnapshot[];
  items: ItemSnapshot[];
}

export interface WelcomeMessage {
  type: 'welcome';
  id: string;
  seed: number;
  roomId: string;
  levelConfigs: LevelConfigData[];
}

export interface LevelConfigData {
  level: number;
  seed: number;
  width: number;
  height: number;
  walls: number[][];
  enemies: { type: string; x: number; y: number; angle: number }[];
  playerStart: { x: number; y: number };
  exitTile: { x: number; y: number } | null;
}

export interface PlayerKilledEvent {
  type: 'player_killed';
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
}

export interface EnemyKilledEvent {
  type: 'enemy_killed';
  playerId: string;
  playerName: string;
  enemyType: string;
  enemyId: number;
  score: number;
}

export interface BossDeadEvent {
  type: 'boss_dead';
  killerId: string;
  killerName: string;
}

export interface GameOverEvent {
  type: 'game_over';
  scores: { id: string; name: string; score: number }[];
}

export interface PlayerJoinedEvent {
  type: 'player_joined';
  id: string;
  name: string;
}

export interface PlayerLeftEvent {
  type: 'player_left';
  id: string;
  name: string;
}

export interface PlayerRespawnedEvent {
  type: 'player_respawned';
  id: string;
  x: number;
  z: number;
}

export interface LevelChangeEvent {
  type: 'level_change';
  playerId: string;
  level: number;
}

export interface DamageEvent {
  type: 'damage';
  targetId: string;
  amount: number;
  fromPlayer?: string;
}

export type ServerMessage =
  | StateSnapshot
  | WelcomeMessage
  | PlayerKilledEvent
  | EnemyKilledEvent
  | BossDeadEvent
  | GameOverEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | PlayerRespawnedEvent
  | LevelChangeEvent
  | DamageEvent;

import type { WebSocket } from 'ws';
import type { ServerMessage, InputMessage, PlayerSnapshot } from '../../shared/protocol.js';
import {
  PLAYER_START_HEALTH,
  PLAYER_START_AMMO,
  RESPAWN_DELAY,
  SCORE_DEATH_PENALTY,
  applyMovement,
} from './physics.js';
import type { LevelInstance } from './LevelInstance.js';

export class PlayerSession {
  readonly id: string;
  readonly ws: WebSocket;
  name = 'Player';
  x = 0;
  z = 0;
  angle = 0;
  health = PLAYER_START_HEALTH;
  ammo = PLAYER_START_AMMO;
  score = 0;
  weapon = 1; // pistol
  level = 1;
  alive = true;
  shooting = false;

  lastSeq = 0;
  private respawnTimer = 0;
  private lastInput: InputMessage | null = null;

  constructor(id: string, ws: WebSocket) {
    this.id = id;
    this.ws = ws;
  }

  send(msg: ServerMessage): void {
    if (this.ws.readyState === 1) { // OPEN
      this.ws.send(JSON.stringify(msg));
    }
  }

  applyInput(input: InputMessage, levelInstance: LevelInstance, dt: number): void {
    this.lastInput = input;
    this.shooting = input.shoot;

    if (!this.alive) return;

    const result = applyMovement(
      this.x, this.z, this.angle,
      input.forward, input.strafe, input.rotate,
      input.sprint, dt,
      (tx, ty) => levelInstance.isSolid(tx, ty),
    );
    this.x = result.x;
    this.z = result.z;
    this.angle = result.angle;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
      this.respawnTimer = RESPAWN_DELAY;
      this.score = Math.max(0, this.score - SCORE_DEATH_PENALTY);
    }
  }

  updateRespawn(dt: number): boolean {
    if (this.alive) return false;
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.alive = true;
      this.health = PLAYER_START_HEALTH;
      this.ammo = PLAYER_START_AMMO;
      this.weapon = 1;
      return true; // needs respawn position
    }
    return false;
  }

  toSnapshot(): PlayerSnapshot {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      z: this.z,
      angle: this.angle,
      health: this.health,
      alive: this.alive,
      weapon: this.weapon,
      level: this.level,
      shooting: this.shooting,
      score: this.score,
    };
  }
}

import { DoorState } from '../core/GameState.js';
import { DOOR_OPEN_TIME, DOOR_STAY_TIME, DOOR_CLOSE_TIME } from '../core/constants.js';
import type { Player } from '../entities/Player.js';

export interface DoorInstance {
  x: number;
  y: number;
  type: 'normal' | 'gold' | 'silver';
  orientation: 'horizontal' | 'vertical';
  state: DoorState;
  progress: number;
  stayTimer: number;
}

export function tryOpenDoor(door: DoorInstance, player: Player | null): string | null {
  if (door.state !== DoorState.Closed) return null;

  if (player) {
    if (door.type === 'gold' && !player.hasKey('gold')) return 'locked_gold';
    if (door.type === 'silver' && !player.hasKey('silver')) return 'locked_silver';
  } else {
    // AI enemies can only open normal doors
    if (door.type !== 'normal') return null;
  }

  door.state = DoorState.Opening;
  return 'opening';
}

export function updateDoorState(door: DoorInstance, dt: number): void {
  if (door.state === DoorState.Opening) {
    door.progress += dt / DOOR_OPEN_TIME;
    if (door.progress >= 1) {
      door.progress = 1;
      door.state = DoorState.Open;
      door.stayTimer = DOOR_STAY_TIME;
    }
  } else if (door.state === DoorState.Open) {
    door.stayTimer -= dt;
    if (door.stayTimer <= 0) {
      door.state = DoorState.Closing;
    }
  } else if (door.state === DoorState.Closing) {
    door.progress -= dt / DOOR_CLOSE_TIME;
    if (door.progress <= 0) {
      door.progress = 0;
      door.state = DoorState.Closed;
    }
  }
}

export function detectDoorOrientation(
  x: number, y: number,
  getWallId: (tx: number, ty: number) => number,
): 'horizontal' | 'vertical' {
  const n = getWallId(x, y - 1) > 0 ? 1 : 0;
  const s = getWallId(x, y + 1) > 0 ? 1 : 0;
  const w = getWallId(x - 1, y) > 0 ? 1 : 0;
  const e = getWallId(x + 1, y) > 0 ? 1 : 0;

  const nsScore = n + s;
  const ewScore = w + e;

  if (nsScore > ewScore) return 'vertical';
  if (ewScore > nsScore) return 'horizontal';

  const n2 = getWallId(x, y - 2) > 0 ? 1 : 0;
  const s2 = getWallId(x, y + 2) > 0 ? 1 : 0;
  const w2 = getWallId(x - 2, y) > 0 ? 1 : 0;
  const e2 = getWallId(x + 2, y) > 0 ? 1 : 0;

  return (n + s + n2 + s2) > (w + e + w2 + e2) ? 'vertical' : 'horizontal';
}

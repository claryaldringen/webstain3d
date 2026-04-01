import { describe, it, expect } from 'vitest';
import { DoorState } from '../../src/core/GameState.js';
import {
  tryOpenDoor, updateDoorState, detectDoorOrientation,
  type DoorInstance,
} from '../../src/systems/DoorManager.js';
import { Player } from '../../src/entities/Player.js';
import { DOOR_OPEN_TIME, DOOR_STAY_TIME } from '../../src/core/constants.js';

function makeDoor(overrides: Partial<DoorInstance> = {}): DoorInstance {
  return {
    x: 5, y: 5, type: 'normal', orientation: 'horizontal',
    state: DoorState.Closed, progress: 0, stayTimer: 0,
    ...overrides,
  };
}

describe('DoorManager', () => {
  describe('tryOpenDoor', () => {
    it('opens a normal closed door', () => {
      const door = makeDoor();
      const player = new Player();
      const result = tryOpenDoor(door, player);
      expect(result).toBe('opening');
      expect(door.state).toBe(DoorState.Opening);
    });

    it('rejects gold door without key', () => {
      const door = makeDoor({ type: 'gold' });
      const player = new Player();
      const result = tryOpenDoor(door, player);
      expect(result).toBe('locked_gold');
      expect(door.state).toBe(DoorState.Closed);
    });

    it('opens gold door with key', () => {
      const door = makeDoor({ type: 'gold' });
      const player = new Player();
      player.addKey('gold');
      const result = tryOpenDoor(door, player);
      expect(result).toBe('opening');
    });
  });

  describe('updateDoorState', () => {
    it('progresses opening door', () => {
      const door = makeDoor({ state: DoorState.Opening, progress: 0 });
      updateDoorState(door, 0.5);
      expect(door.progress).toBeCloseTo(0.5 / DOOR_OPEN_TIME);
      expect(door.state).toBe(DoorState.Opening);
    });

    it('transitions opening → open when progress reaches 1', () => {
      const door = makeDoor({ state: DoorState.Opening, progress: 0.9 });
      updateDoorState(door, DOOR_OPEN_TIME);
      expect(door.state).toBe(DoorState.Open);
      expect(door.progress).toBe(1);
    });

    it('transitions open → closing after stay timer', () => {
      const door = makeDoor({ state: DoorState.Open, progress: 1, stayTimer: 0.1 });
      updateDoorState(door, 0.2);
      expect(door.state).toBe(DoorState.Closing);
    });
  });

  describe('detectDoorOrientation', () => {
    it('detects horizontal when E/W walls present', () => {
      const getWallId = (x: number, y: number) => {
        if (x === 4 && y === 5) return 3;
        if (x === 6 && y === 5) return 3;
        return 0;
      };
      expect(detectDoorOrientation(5, 5, getWallId)).toBe('horizontal');
    });

    it('detects vertical when N/S walls present', () => {
      const getWallId = (x: number, y: number) => {
        if (x === 5 && y === 4) return 3;
        if (x === 5 && y === 6) return 3;
        return 0;
      };
      expect(detectDoorOrientation(5, 5, getWallId)).toBe('vertical');
    });
  });
});

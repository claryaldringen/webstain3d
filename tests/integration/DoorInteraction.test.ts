import { describe, it, expect } from 'vitest';
import { DoorState } from '../../src/core/GameState.js';
import { tryOpenDoor, updateDoorState, type DoorInstance } from '../../src/systems/DoorManager.js';
import { Player } from '../../src/entities/Player.js';
import { DOOR_OPEN_TIME, DOOR_STAY_TIME, DOOR_CLOSE_TIME } from '../../src/core/constants.js';

describe('Door Interaction flow', () => {
  it('full door lifecycle: closed → opening → open → closing → closed', () => {
    const door: DoorInstance = {
      x: 5, y: 5, type: 'normal', orientation: 'horizontal',
      state: DoorState.Closed, progress: 0, stayTimer: 0,
    };
    const player = new Player();

    const result = tryOpenDoor(door, player);
    expect(result).toBe('opening');
    expect(door.state).toBe(DoorState.Opening);

    updateDoorState(door, DOOR_OPEN_TIME + 0.01);
    expect(door.state).toBe(DoorState.Open);
    expect(door.progress).toBe(1);

    updateDoorState(door, DOOR_STAY_TIME + 0.01);
    expect(door.state).toBe(DoorState.Closing);

    updateDoorState(door, DOOR_CLOSE_TIME + 0.01);
    expect(door.state).toBe(DoorState.Closed);
    expect(door.progress).toBe(0);
  });

  it('locked gold door requires key', () => {
    const door: DoorInstance = {
      x: 5, y: 5, type: 'gold', orientation: 'horizontal',
      state: DoorState.Closed, progress: 0, stayTimer: 0,
    };
    const player = new Player();

    expect(tryOpenDoor(door, player)).toBe('locked_gold');
    expect(door.state).toBe(DoorState.Closed);

    player.addKey('gold');
    expect(tryOpenDoor(door, player)).toBe('opening');
    expect(door.state).toBe(DoorState.Opening);
  });
});

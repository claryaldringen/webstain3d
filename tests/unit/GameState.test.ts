import { describe, it, expect } from 'vitest';
import { GameState, EnemyState, DoorState } from '../../src/core/GameState.js';

describe('GameState', () => {
  it('has Title state', () => {
    expect(GameState.Title).toBe('title');
  });

  it('has Playing state', () => {
    expect(GameState.Playing).toBe('playing');
  });

  it('has Death state', () => {
    expect(GameState.Death).toBe('death');
  });

  it('has Complete state', () => {
    expect(GameState.Complete).toBe('complete');
  });

  it('has Pause state', () => {
    expect(GameState.Pause).toBe('pause');
  });
});

describe('EnemyState', () => {
  it('has Idle = 0', () => {
    expect(EnemyState.Idle).toBe(0);
  });

  it('has Alert = 1', () => {
    expect(EnemyState.Alert).toBe(1);
  });

  it('has Chase = 2', () => {
    expect(EnemyState.Chase).toBe(2);
  });

  it('has Attack = 3', () => {
    expect(EnemyState.Attack).toBe(3);
  });

  it('has Pain = 4', () => {
    expect(EnemyState.Pain).toBe(4);
  });

  it('has Death = 5', () => {
    expect(EnemyState.Death).toBe(5);
  });
});

describe('DoorState', () => {
  it('has Closed = 0', () => {
    expect(DoorState.Closed).toBe(0);
  });

  it('has Opening = 1', () => {
    expect(DoorState.Opening).toBe(1);
  });

  it('has Open = 2', () => {
    expect(DoorState.Open).toBe(2);
  });

  it('has Closing = 3', () => {
    expect(DoorState.Closing).toBe(3);
  });
});

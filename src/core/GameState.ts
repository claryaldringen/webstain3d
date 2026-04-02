export enum GameState {
  Title = 'title',
  Loading = 'loading',
  Playing = 'playing',
  Death = 'death',
  Complete = 'complete',
  Pause = 'pause',
}

export enum EnemyState {
  Idle = 0,
  Alert = 1,
  Chase = 2,
  Attack = 3,
  Pain = 4,
  Death = 5,
  Investigate = 6,
  Flee = 7,
}

export enum DoorState {
  Closed = 0,
  Opening = 1,
  Open = 2,
  Closing = 3,
}

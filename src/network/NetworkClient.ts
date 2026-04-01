import type {
  ClientMessage,
  ServerMessage,
  StateSnapshot,
  WelcomeMessage,
  PlayerKilledEvent,
  EnemyKilledEvent,
  BossDeadEvent,
  GameOverEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  PlayerRespawnedEvent,
  LevelChangeEvent,
  DamageEvent,
} from '../../shared/protocol.js';

export type MessageHandler = {
  onSnapshot?: (msg: StateSnapshot) => void;
  onWelcome?: (msg: WelcomeMessage) => void;
  onPlayerKilled?: (msg: PlayerKilledEvent) => void;
  onEnemyKilled?: (msg: EnemyKilledEvent) => void;
  onBossDead?: (msg: BossDeadEvent) => void;
  onGameOver?: (msg: GameOverEvent) => void;
  onPlayerJoined?: (msg: PlayerJoinedEvent) => void;
  onPlayerLeft?: (msg: PlayerLeftEvent) => void;
  onPlayerRespawned?: (msg: PlayerRespawnedEvent) => void;
  onLevelChange?: (msg: LevelChangeEvent) => void;
  onDamage?: (msg: DamageEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export class NetworkClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler;
  private inputSeq = 0;
  private url: string;
  connected = false;

  constructor(url: string, handlers: MessageHandler) {
    this.url = url;
    this.handlers = handlers;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.connected = true;
      this.handlers.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data as string);
        this.dispatch(msg);
      } catch (e) {
        console.error('Failed to parse server message:', e);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.handlers.onDisconnect?.();
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  join(name: string): void {
    this.send({ type: 'join', name });
  }

  sendInput(input: Omit<ClientMessage & { type: 'input' }, 'type' | 'seq'>): number {
    const seq = ++this.inputSeq;
    this.send({
      type: 'input',
      seq,
      ...input,
    });
    return seq;
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.connected = false;
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private dispatch(msg: ServerMessage): void {
    switch (msg.type) {
      case 'snapshot': this.handlers.onSnapshot?.(msg); break;
      case 'welcome': this.handlers.onWelcome?.(msg); break;
      case 'player_killed': this.handlers.onPlayerKilled?.(msg); break;
      case 'enemy_killed': this.handlers.onEnemyKilled?.(msg); break;
      case 'boss_dead': this.handlers.onBossDead?.(msg); break;
      case 'game_over': this.handlers.onGameOver?.(msg); break;
      case 'player_joined': this.handlers.onPlayerJoined?.(msg); break;
      case 'player_left': this.handlers.onPlayerLeft?.(msg); break;
      case 'player_respawned': this.handlers.onPlayerRespawned?.(msg); break;
      case 'level_change': this.handlers.onLevelChange?.(msg); break;
      case 'damage': this.handlers.onDamage?.(msg); break;
    }
  }
}

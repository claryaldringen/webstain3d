import { NetworkClient } from '../network/NetworkClient.js';
import { KillFeed } from './KillFeed.js';
import { Scoreboard } from './Scoreboard.js';
import { RemotePlayerRenderer } from './RemotePlayerRenderer.js';
import { MultiplayerUI } from './MultiplayerUI.js';
import type {
  StateSnapshot,
  WelcomeMessage,
} from '../../shared/protocol.js';

// Re-use existing game infrastructure
import { Renderer } from '../rendering/Renderer.js';
import { GameMap } from '../map/GameMap.js';
import { SpriteManager } from '../sprites/SpriteManager.js';
import { Input } from '../systems/Input.js';
import { HUD } from '../rendering/HUD.js';
import { generateLevel } from '../map/LevelGenerator.js';
import {
  TILE_SIZE,
  PLAYER_MOVE_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_ROTATE_SPEED,
  PLAYER_HEIGHT,
} from '../core/constants.js';
import type { LevelConfig } from '../map/types.js';

export class MultiplayerGame {
  private canvas: HTMLCanvasElement;
  private renderer!: Renderer;
  private map!: GameMap;
  private spriteManager!: SpriteManager;
  private input!: Input;
  private hud!: HUD;

  private network!: NetworkClient;
  private killFeed!: KillFeed;
  private scoreboard!: Scoreboard;
  private remotePlayers!: RemotePlayerRenderer;
  private ui!: MultiplayerUI;

  private myId = '';
  private playerName = '';
  private currentLevel = 1;
  private lastSnapshot: StateSnapshot | null = null;
  private alive = true;
  private health = 100;
  private ammo = 8;
  private score = 0;
  private weapon = 1;
  private running = false;
  private animFrameId = 0;
  private lastTime = 0;
  private serverUrl: string;

  // Local prediction state
  private localX = 0;
  private localZ = 0;
  private localAngle = 0;

  constructor(canvas: HTMLCanvasElement, serverUrl: string) {
    this.canvas = canvas;
    this.serverUrl = serverUrl;
  }

  async start(): Promise<void> {
    this.renderer = new Renderer(this.canvas);
    this.input = new Input();
    this.hud = new HUD();
    this.killFeed = new KillFeed();
    this.scoreboard = new Scoreboard();
    this.remotePlayers = new RemotePlayerRenderer(this.renderer.scene);
    this.ui = new MultiplayerUI();

    // Show join screen
    this.ui.showJoinScreen((name) => {
      this.playerName = name;
      this.connect();
    });
  }

  private connect(): void {
    this.ui.showConnecting();

    this.network = new NetworkClient(this.serverUrl, {
      onConnect: () => {
        this.network.join(this.playerName);
      },

      onWelcome: (msg: WelcomeMessage) => {
        this.myId = msg.id;
        this.remotePlayers.setMyId(msg.id);
        this.ui.hide();
        this.initLevel(1, msg.levelConfigs[0]!.seed);
      },

      onSnapshot: (msg: StateSnapshot) => {
        this.lastSnapshot = msg;
        this.applySnapshot(msg);
      },

      onPlayerKilled: (msg) => {
        this.killFeed.addKill(msg.killerName, msg.victimName);
      },

      onEnemyKilled: (msg) => {
        this.killFeed.addEnemyKill(msg.playerName, msg.enemyType);
        if (msg.playerId === this.myId) {
          this.score += msg.score;
        }
      },

      onBossDead: (msg) => {
        this.killFeed.addMessage(`${msg.killerName} killed the BOSS!`);
      },

      onGameOver: (msg) => {
        this.running = false;
        this.ui.showGameOver(msg.scores);
      },

      onPlayerJoined: (msg) => {
        this.killFeed.addMessage(`${msg.name} joined`);
      },

      onPlayerLeft: (msg) => {
        this.killFeed.addMessage(`${msg.name} left`);
      },

      onDamage: (msg) => {
        if (msg.targetId === this.myId) {
          this.health = Math.max(0, this.health - msg.amount);
          this.hud.flashDamage();
        }
      },

      onPlayerRespawned: (msg) => {
        if (msg.id === this.myId) {
          this.alive = true;
          this.health = 100;
          this.ammo = 8;
          this.localX = msg.x;
          this.localZ = msg.z;
        }
      },

      onLevelChange: (msg) => {
        if (msg.playerId === this.myId) {
          this.currentLevel = msg.level;
        }
      },

      onDisconnect: () => {
        this.running = false;
        this.ui.showDisconnected();
      },
    });

    this.network.connect();
  }

  private async initLevel(level: number, seed: number): Promise<void> {
    this.currentLevel = level;

    // Generate level locally for rendering (same seed as server)
    this.renderer.clearLevel();
    this.map = new GameMap(this.renderer);

    const lvl = level;
    const enemyTypes: Record<string, number> = { guard: 3, dog: 1 };
    if (lvl >= 2) enemyTypes.ss = 1;
    if (lvl >= 3) enemyTypes.mutant = 1;
    if (lvl >= 5) enemyTypes.officer = 1;
    if (lvl >= 7) { enemyTypes.officer = 2; enemyTypes.ss = 2; }

    const config: LevelConfig = {
      style: 'rooms_corridors',
      seed,
      enemyCount: [5 + lvl * 2, 10 + lvl * 3],
      enemyTypes,
      itemDensity: 0.5,
      doorCount: [2, 4 + lvl],
      wallVariety: Math.min(7, 2 + lvl),
    };

    const levelData = generateLevel(config);
    await this.map.loadFromData(levelData);

    this.spriteManager = new SpriteManager(this.renderer, null);

    this.localX = (levelData.playerStart.x + 0.5) * TILE_SIZE;
    this.localZ = (levelData.playerStart.y + 0.5) * TILE_SIZE;
    this.localAngle = 0;

    this.startGameLoop();
  }

  private startGameLoop(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private gameLoop(time: number): void {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    // Read input
    const movement = this.input.getMovement();
    const shooting = this.input.isFiring();
    const interacting = this.input.isInteracting();

    // Local prediction: move locally
    if (this.alive) {
      const speed = PLAYER_MOVE_SPEED * (movement.sprint ? PLAYER_SPRINT_MULTIPLIER : 1) * dt;
      this.localAngle += movement.rotate * PLAYER_ROTATE_SPEED * dt;

      const dx = Math.cos(this.localAngle) * movement.forward + Math.cos(this.localAngle + Math.PI / 2) * movement.strafe;
      const dz = -Math.sin(this.localAngle) * movement.forward - Math.sin(this.localAngle + Math.PI / 2) * movement.strafe;
      const len = Math.sqrt(dx * dx + dz * dz);

      if (len > 0) {
        const mx = (dx / len) * speed;
        const mz = (dz / len) * speed;
        const tryX = this.localX + mx;
        const tryZ = this.localZ + mz;
        if (!this.map.isSolid(Math.floor(tryX / TILE_SIZE), Math.floor(this.localZ / TILE_SIZE))) {
          this.localX = tryX;
        }
        if (!this.map.isSolid(Math.floor(this.localX / TILE_SIZE), Math.floor(tryZ / TILE_SIZE))) {
          this.localZ = tryZ;
        }
      }
    }

    // Send input to server
    this.network.sendInput({
      forward: movement.forward,
      strafe: movement.strafe,
      rotate: movement.rotate,
      sprint: movement.sprint,
      shoot: shooting,
      interact: interacting,
    });

    // Update camera
    this.renderer.camera.position.set(this.localX, PLAYER_HEIGHT, this.localZ);
    this.renderer.camera.rotation.set(0, Math.PI / 2 - this.localAngle, 0, 'YXZ');

    // Update remote players
    if (this.lastSnapshot) {
      this.remotePlayers.update(this.lastSnapshot.players, dt);
    }

    // Scoreboard toggle (Tab)
    if (this.input.isScoreboardHeld()) {
      if (this.lastSnapshot) {
        this.scoreboard.show(this.lastSnapshot.players, this.myId);
      }
    } else {
      this.scoreboard.hide();
    }

    // Update kill feed
    this.killFeed.update();

    // Update HUD
    this.hud.updateRaw(this.score, 1, this.health, this.ammo, false, false, this.weapon);

    // Render
    this.renderer.render();

    // Clear one-shot inputs
    this.input.endFrame();

    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private applySnapshot(snap: StateSnapshot): void {
    const me = snap.players.find(p => p.id === this.myId);
    if (me) {
      this.health = me.health;
      this.alive = me.alive;
      this.score = me.score;
      this.weapon = me.weapon;

      // Reconcile position
      const dx = me.x - this.localX;
      const dz = me.z - this.localZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 2) {
        this.localX = me.x;
        this.localZ = me.z;
        this.localAngle = me.angle;
      } else if (dist > 0.5) {
        this.localX += dx * 0.1;
        this.localZ += dz * 0.1;
      }
    }
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    this.network?.disconnect();
    this.killFeed?.destroy();
    this.scoreboard?.destroy();
    this.remotePlayers?.destroy();
    this.ui?.destroy();
    this.renderer?.destroy();
    this.input?.destroy();
  }
}

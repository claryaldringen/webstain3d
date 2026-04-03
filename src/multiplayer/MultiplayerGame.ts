import { NetworkClient } from '../network/NetworkClient.js';
import { KillFeed } from './KillFeed.js';
import { Scoreboard } from './Scoreboard.js';
import { RemotePlayerRenderer } from './RemotePlayerRenderer.js';
import { RemoteEnemyRenderer } from './RemoteEnemyRenderer.js';
import { MultiplayerUI } from './MultiplayerUI.js';
import type {
  StateSnapshot,
  WelcomeMessage,
  LevelConfigData,
} from '../../shared/protocol.js';

// Re-use existing game infrastructure
import { Renderer } from '../rendering/Renderer.js';
import { GameMap } from '../map/GameMap.js';
import { SpriteManager } from '../sprites/SpriteManager.js';
import { Input } from '../systems/Input.js';
import { HUD } from '../rendering/HUD.js';
import { WeaponOverlay } from '../rendering/WeaponOverlay.js';
import { drawWeaponSprite, type WeaponName } from '../assets/WeaponSprites.js';
import { VSwapLoader } from '../assets/VSwapLoader.js';
import { assetUrl } from '../core/assetUrl.js';
import {
  TILE_SIZE,
  PLAYER_MOVE_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_ROTATE_SPEED,
  PLAYER_HEIGHT,
  WeaponId,
} from '../core/constants.js';

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
  private weaponOverlay: WeaponOverlay | null = null;
  private remoteEnemies: RemoteEnemyRenderer | null = null;
  private vswap: VSwapLoader | null = null;

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
  private inputAccum = 0;
  private serverUrl: string;

  private levelConfigsFromServer: LevelConfigData[] = [];

  // Local prediction state
  private localX = 0;
  private localZ = 0;
  private localAngle = 0;

  constructor(canvas: HTMLCanvasElement, serverUrl: string) {
    this.canvas = canvas;
    this.serverUrl = serverUrl;
  }

  async start(): Promise<void> {
    // Hide all singleplayer screen overlays
    document.querySelectorAll('.screen-overlay').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

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
        this.levelConfigsFromServer = msg.levelConfigs;
        this.ui.hide();
        this.initLevel(1);
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

  private async initLevel(level: number): Promise<void> {
    this.currentLevel = level;

    const serverLevel = this.levelConfigsFromServer.find(c => c.level === level);
    if (!serverLevel) {
      console.error('No level config from server for level', level);
      return;
    }

    // Use server's walls data directly for rendering
    this.renderer.clearLevel();
    this.map = new GameMap(this.renderer);

    const levelData = {
      width: serverLevel.width,
      height: serverLevel.height,
      walls: serverLevel.walls,
      doors: [] as any[],
      pushwalls: [] as any[],
      entities: serverLevel.enemies.map(e => ({
        type: e.type as any,
        x: e.x,
        y: e.y,
        angle: e.angle,
      })),
      playerStart: { x: serverLevel.playerStart.x, y: serverLevel.playerStart.y, angle: 0 },
      exitTile: serverLevel.exitTile,
    };

    await this.map.loadFromData(levelData);

    this.spriteManager = new SpriteManager(this.renderer, null);

    this.localX = (serverLevel.playerStart.x + 0.5) * TILE_SIZE;
    this.localZ = (serverLevel.playerStart.y + 0.5) * TILE_SIZE;
    this.localAngle = 0;

    // Load weapon overlay
    if (!this.vswap) {
      this.vswap = new VSwapLoader();
      try {
        await this.vswap.load(assetUrl('assets/VSWAP.WL1'), assetUrl('assets/palette.json'));
      } catch {
        this.vswap = null;
      }
    }
    if (this.weaponOverlay) this.weaponOverlay.destroy();
    this.weaponOverlay = new WeaponOverlay();
    this.weaponOverlay.initSprites(this.vswap, (name, firing) => drawWeaponSprite(name as WeaponName, firing));

    if (this.remoteEnemies) this.remoteEnemies.destroy();
    this.remoteEnemies = new RemoteEnemyRenderer(this.renderer.scene, this.vswap);

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

    // Local prediction: move locally (same math as Player.ts)
    if (this.alive) {
      const speed = PLAYER_MOVE_SPEED * (movement.sprint ? PLAYER_SPRINT_MULTIPLIER : 1) * dt;
      this.localAngle += movement.rotate * PLAYER_ROTATE_SPEED * dt;

      const dirX = -Math.sin(this.localAngle);
      const dirZ = -Math.cos(this.localAngle);
      const strafeX = Math.cos(this.localAngle);
      const strafeZ = -Math.sin(this.localAngle);

      const dx = (dirX * movement.forward + strafeX * movement.strafe) * speed;
      const dz = (dirZ * movement.forward + strafeZ * movement.strafe) * speed;

      if (dx !== 0) {
        const tryX = this.localX + dx;
        if (!this.map.isSolid(Math.floor(tryX / TILE_SIZE), Math.floor(this.localZ / TILE_SIZE))) {
          this.localX = tryX;
        }
      }
      if (dz !== 0) {
        const tryZ = this.localZ + dz;
        if (!this.map.isSolid(Math.floor(this.localX / TILE_SIZE), Math.floor(tryZ / TILE_SIZE))) {
          this.localZ = tryZ;
        }
      }
    }

    // Send input to server at ~20Hz (match server tick rate)
    this.inputAccum += dt;
    if (this.inputAccum >= 1 / 20) {
      this.inputAccum = 0;
      this.network.sendInput({
        forward: movement.forward,
        strafe: movement.strafe,
        rotate: movement.rotate,
        sprint: movement.sprint,
        shoot: shooting,
        interact: interacting,
        x: this.localX,
        z: this.localZ,
        angle: this.localAngle,
      });
    }

    // Update camera (same as singleplayer)
    this.renderer.camera.position.set(this.localX, PLAYER_HEIGHT, this.localZ);
    this.renderer.camera.rotation.order = 'YXZ';
    this.renderer.camera.rotation.set(0, this.localAngle, 0);

    // Update remote players and enemies
    if (this.lastSnapshot) {
      this.remotePlayers.update(this.lastSnapshot.players, dt);
      if (this.remoteEnemies) {
        this.remoteEnemies.update(this.lastSnapshot.enemies, dt);
      }
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

    // Update weapon overlay
    if (this.weaponOverlay) {
      if (shooting) this.weaponOverlay.setFiring(true);
      this.weaponOverlay.setWeapon(this.weapon as WeaponId);
      this.weaponOverlay.update(dt);
      this.weaponOverlay.render();
    }

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

      // Only hard-snap on large desync (respawn, level change, etc.)
      // Normal movement is fully client-predicted — server/client dt
      // differences make continuous reconciliation feel like invisible walls
      const dx = me.x - this.localX;
      const dz = me.z - this.localZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 5) {
        this.localX = me.x;
        this.localZ = me.z;
        this.localAngle = me.angle;
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
    this.remoteEnemies?.destroy();
    this.weaponOverlay?.destroy();
    this.ui?.destroy();
    this.renderer?.destroy();
    this.input?.destroy();
  }
}

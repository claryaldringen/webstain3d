import { GameState } from './GameState.js';
import { Renderer } from '../rendering/Renderer.js';
import { Input } from '../systems/Input.js';
import { AudioManager } from '../systems/AudioManager.js';
import { HUD } from '../rendering/HUD.js';
import { WeaponOverlay } from '../rendering/WeaponOverlay.js';
import { GameMap } from '../map/GameMap.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../entities/EnemyManager.js';
import { SpriteManager } from '../sprites/SpriteManager.js';
import { VSwapLoader } from '../assets/VSwapLoader.js';
import { TextureFactory } from '../assets/TextureFactory.js';
import { WeaponId, WEAPON_FIRE_RATES, WEAPON_RANGE, WEAPON_DAMAGE_MIN, WEAPON_DAMAGE_MAX } from './constants.js';
import { DoorState } from './GameState.js';
import { tryOpenDoor, updateDoorState, detectDoorOrientation, type DoorInstance } from '../systems/DoorManager.js';
import { assetUrl } from './assetUrl.js';
import { applyItemEffect, checkPickup, type ItemInstance } from '../systems/ItemManager.js';
import { hitscanCheck, updateWeaponCooldown } from '../systems/WeaponSystem.js';
import { hitEnemy } from '../entities/EnemyAI.js';
import { drawWeaponSprite, type WeaponName } from '../assets/WeaponSprites.js';
import { createDoorTextureByType } from '../assets/DoorTextures.js';
import { TILE_SIZE, WALL_HEIGHT, ITEM_EFFECTS, ENEMY_DROPS, INTERACTION_RANGE, ITEM_PICKUP_RADIUS, GUNFIRE_ALERT_RADIUS, WEAPON_NAMES } from './constants.js';
import { BLOCKING_DECORATIONS } from '../sprites/SpriteConfig.js';
import type { DoorData, EntityData, TilePosition, LevelData } from '../types/index.js';
import type { LevelConfig } from '../map/types.js';
import { generateLevel } from '../map/LevelGenerator.js';
import * as THREE from 'three';

/** Door instance with visual mesh for rendering. */
interface DoorWithMesh extends DoorInstance {
  mesh: THREE.Mesh;
  closedPosition: THREE.Vector3;
}

export class Game {
  private state: GameState = GameState.Title;
  private renderer: Renderer;
  private input: Input;
  private audio: AudioManager;
  private hud: HUD;
  private weaponOverlay: WeaponOverlay | null = null;

  private map: GameMap | null = null;
  private player: Player | null = null;
  private enemies: EnemyManager | null = null;
  private spriteManager: SpriteManager | null = null;
  private vswap: VSwapLoader | null = null;

  private doors: DoorWithMesh[] = [];
  private items: ItemInstance[] = [];
  private blockedTiles = new Set<string>();
  private weaponCooldown = 0;
  private currentLevel = 1;

  private lastTime = 0;
  private levelStartTime = 0;
  private animFrameId = 0;

  private screens: Record<string, HTMLElement | null>;
  private menuIndex = 0;
  private menuItems: HTMLElement[] = [];
  private soundEnabled = true;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.audio = new AudioManager();
    this.hud = new HUD();

    this.screens = {
      title: document.getElementById('screen-title'),
      death: document.getElementById('screen-death'),
      complete: document.getElementById('screen-complete'),
      pause: document.getElementById('screen-pause'),
    };

    this.initMenu();
  }

  private initMenu(): void {
    const menu = document.getElementById('title-menu');
    if (!menu) return;
    this.menuItems = Array.from(menu.querySelectorAll('[data-menu-item]'));
    this.updateMenuSelection();
  }

  private updateMenuSelection(): void {
    for (let i = 0; i < this.menuItems.length; i++) {
      const el = this.menuItems[i];
      if (i === this.menuIndex) {
        el.style.color = '#FCFC54';
        el.style.fontSize = '18px';
        el.textContent = '\u25B8 ' + (el.getAttribute('data-label') || el.textContent!.replace(/^\u25B8\s*/, ''));
        if (!el.getAttribute('data-label')) {
          el.setAttribute('data-label', el.textContent!.replace(/^\u25B8\s*/, ''));
        }
      } else {
        if (!el.getAttribute('data-label')) {
          el.setAttribute('data-label', el.textContent!.replace(/^\u25B8\s*/, ''));
        }
        el.style.color = '#808080';
        el.style.fontSize = '14px';
        el.textContent = el.getAttribute('data-label')!;
      }
    }
  }

  private handleMenuInput(): void {
    if (this.input.wasPressed('ArrowDown')) {
      this.menuIndex = (this.menuIndex + 1) % this.menuItems.length;
      this.updateMenuSelection();
    }
    if (this.input.wasPressed('ArrowUp')) {
      this.menuIndex = (this.menuIndex - 1 + this.menuItems.length) % this.menuItems.length;
      this.updateMenuSelection();
    }
    if (this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
      this.activateMenuItem(this.menuIndex);
    }
  }

  private activateMenuItem(index: number): void {
    const label = this.menuItems[index]?.getAttribute('data-label') || '';
    if (label.includes('New Game')) {
      this.startGame();
    } else if (label.includes('Sound')) {
      this.soundEnabled = !this.soundEnabled;
      this.audio.setMasterVolume(this.soundEnabled ? 1.0 : 0.0);
      this.menuItems[index].setAttribute('data-label', `Sound: ${this.soundEnabled ? 'ON' : 'OFF'}`);
      this.updateMenuSelection();
    } else if (label.includes('Control')) {
      this.showControlsOverlay();
    }
    // Quit does nothing in a web game
  }

  private showControlsOverlay(): void {
    const existing = document.getElementById('controls-overlay');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.id = 'controls-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:100;';
    overlay.innerHTML = `
      <div style="text-align:center;font-family:monospace;color:#FCFC54;">
        <h2 style="font-size:28px;margin-bottom:24px;">CONTROLS</h2>
        <table style="margin:0 auto;text-align:left;font-size:16px;border-spacing:12px 6px;">
          <tr><td style="color:#808080;">Arrow Keys</td><td>Move / Turn</td></tr>
          <tr><td style="color:#808080;">Alt + Arrows</td><td>Strafe</td></tr>
          <tr><td style="color:#808080;">Shift</td><td>Sprint</td></tr>
          <tr><td style="color:#808080;">Ctrl / Z</td><td>Fire</td></tr>
          <tr><td style="color:#808080;">Space</td><td>Open Door / Use</td></tr>
          <tr><td style="color:#808080;">1-4</td><td>Switch Weapon</td></tr>
          <tr><td style="color:#808080;">Esc</td><td>Pause</td></tr>
        </table>
        <p style="margin-top:24px;color:#808080;animation:blink 1s infinite;">PRESS ANY KEY TO CLOSE</p>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeHandler = () => {
      overlay.remove();
      document.removeEventListener('keydown', closeHandler);
    };
    // Delay to avoid immediate close from the same keypress
    setTimeout(() => document.addEventListener('keydown', closeHandler), 100);
  }

  start(): void {
    this.showScreen('title');
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private showScreen(name: string | null): void {
    for (const [key, el] of Object.entries(this.screens)) {
      if (el) el.style.display = key === name ? 'flex' : 'none';
    }
  }

  private async startGame(): Promise<void> {
    if (this.state !== GameState.Title) return;
    this.state = GameState.Loading;

    this.audio.init();
    this.audio.generateSounds();

    await this.initLevel();
    this.state = GameState.Playing;
    this.showScreen(null);
  }

  private async initLevel(): Promise<void> {
    this.renderer.clearLevel();

    // Load VSWAP
    try {
      this.vswap = new VSwapLoader();
      await this.vswap.load(assetUrl('assets/VSWAP.WL1'), assetUrl('assets/palette.json'));
    } catch {
      this.vswap = null;
    }

    // Load map with textures
    this.map = new GameMap(this.renderer);
    let data: LevelData;
    try {
      // Try to load static level JSON (check content-type to avoid Vite SPA fallback)
      const checkResp = await fetch(assetUrl(`data/level${this.currentLevel}.json`), { method: 'HEAD' });
      if (checkResp.ok && (checkResp.headers.get('content-type') || '').includes('json')) {
        data = await this.map.load(assetUrl(`data/level${this.currentLevel}.json`));
      } else {
        throw new Error('No static level');
      }
    } catch {
      // Fallback: try config-based generation, then default procedural
      const lvl = this.currentLevel;
      let config: LevelConfig;
      try {
        const configResp = await fetch(assetUrl(`data/level-configs/level${this.currentLevel}.json`));
        if (configResp.ok) {
          config = await configResp.json();
        } else {
          throw new Error('No config');
        }
      } catch {
        // Progressive difficulty: introduce enemy types as levels advance
        const enemyTypes: Record<string, number> = { guard: 3, dog: 1 };
        if (lvl >= 2) enemyTypes.ss = 1;
        if (lvl >= 3) enemyTypes.mutant = 1;
        if (lvl >= 5) enemyTypes.officer = 1;
        if (lvl >= 7) { enemyTypes.officer = 2; enemyTypes.ss = 2; }

        config = {
          style: 'rooms_corridors',
          seed: lvl * 1000 + Date.now(),
          enemyCount: [5 + lvl * 2, 10 + lvl * 3],
          enemyTypes,
          itemDensity: 0.5,
          doorCount: [2, 4 + lvl],
          wallVariety: Math.min(7, 2 + lvl),
        };
      }
      const levelData = generateLevel(config);

      // Spawn boss near the exit on level 10
      if (lvl === 10 && levelData.exitTile) {
        levelData.entities.push({
          type: 'boss',
          x: levelData.exitTile.x,
          y: levelData.exitTile.y - 1,
          angle: 180,
        });
      }

      data = await this.map.loadFromData(levelData);
    }

    // Sprites
    this.spriteManager = new SpriteManager(this.renderer, this.vswap);

    // Doors
    this.doors = [];
    for (const d of this.map.doors) {
      const orientation = detectDoorOrientation(d.x, d.y, (x, y) => this.map!.getWallId(x, y));

      // Create door mesh
      const geo = new THREE.PlaneGeometry(TILE_SIZE, WALL_HEIGHT);
      const doorCanvas = createDoorTextureByType(d.type);
      const doorTex = new THREE.CanvasTexture(doorCanvas);
      doorTex.magFilter = THREE.NearestFilter;
      doorTex.minFilter = THREE.NearestFilter;
      const mat = new THREE.MeshBasicMaterial({ map: doorTex, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        d.x * TILE_SIZE + TILE_SIZE / 2,
        WALL_HEIGHT / 2,
        d.y * TILE_SIZE + TILE_SIZE / 2,
      );
      if (orientation === 'vertical') {
        mesh.rotation.y = Math.PI / 2;
      }
      const closedPosition = mesh.position.clone();
      this.renderer.scene.add(mesh);

      this.doors.push({
        x: d.x,
        y: d.y,
        type: d.type,
        orientation,
        state: DoorState.Closed,
        progress: 0,
        stayTimer: 0,
        mesh,
        closedPosition,
      });
    }

    // Items
    this.items = [];
    for (const e of this.map.entities) {
      if (e.type !== 'item') continue;
      const x = (e.x + 0.5) * TILE_SIZE;
      const z = (e.y + 0.5) * TILE_SIZE;
      const itemColors: Record<string, string> = {
        ammo_clip: '#CCAA00', ammo_stack: '#CCAA00',
        medkit: '#FFFFFF', food: '#44AA44', first_aid: '#FF4444',
        cross: '#FFD700', chalice: '#FFD700', chest: '#FFD700', crown: '#FFD700',
        key_gold: '#FFD700', key_silver: '#C0C0C0',
        machine_gun: '#888888', chaingun: '#888888',
        extra_life: '#44FF44',
        // Decorations (fallback colors if VSWAP unavailable)
        puddle: '#334488', barrel_green: '#446633', table_chairs: '#8B6914',
        lamp_floor: '#CCAA44', chandelier: '#CCAA44', lamp: '#CCAA44', lamp_ceil: '#CCAA44',
        hanged_man: '#884444', bones_blood: '#AA4444', pillar: '#AAAAAA',
        plant: '#44AA44', plant_pot: '#44AA44', skeleton: '#DDDDBB',
        sink: '#AABBCC', vase: '#AA8844', table_plain: '#8B6914',
        suits_of_armor: '#888888', cage_hanging: '#666666',
        skeleton_cage: '#BBBB99', bones: '#DDDDBB',
      };
      const sprite = this.spriteManager.create(`assets/sprites/item_${e.subtype ?? ''}.png`, x, z, {
        width: 1.0, height: 1.0, anchorBottom: true,
        label: e.subtype ?? '', color: itemColors[e.subtype ?? ''] ?? '#FF00FF',
      });
      this.items.push({ subtype: e.subtype ?? '', x, z, collected: false, sprite });
    }

    // Build blocked tiles set for blocking decorations
    this.blockedTiles.clear();
    for (const e of this.map.entities) {
      if (e.type === 'item' && BLOCKING_DECORATIONS.has(e.subtype ?? '')) {
        this.blockedTiles.add(`${e.x},${e.y}`);
      }
    }

    // Enemies
    const itemManagerProxy = {
      spawnDrop: (subtype: string, x: number, z: number) => {
        const sprite = this.spriteManager!.create('', x, z, {
          width: 0.6, height: 0.6, anchorBottom: true,
          label: subtype, color: '#CCAA00',
        });
        this.items.push({ subtype, x, z, collected: false, sprite });
      },
    };
    this.enemies = new EnemyManager(this.spriteManager, this.map);
    this.enemies.blockedTiles = this.blockedTiles;
    this.enemies.itemManager = itemManagerProxy;
    this.enemies.doorOpener = {
      tryOpenAt: (tileX: number, tileY: number): boolean => {
        for (const door of this.doors) {
          if (door.x === tileX && door.y === tileY) {
            const result = tryOpenDoor(door, null);
            if (result === 'opening') {
              this.audio.play('door_open', { volume: 0.4 });
              return true;
            }
            return false;
          }
        }
        return false;
      },
    };
    this.enemies.init(this.map.entities);

    // Player — preserve stats between levels
    const prevPlayer = this.player;
    this.player = new Player();
    if (prevPlayer && this.currentLevel > 1) {
      this.player.health = prevPlayer.health;
      this.player.lives = prevPlayer.lives;
      this.player.ammo = prevPlayer.ammo;
      this.player.score = prevPlayer.score;
      this.player.currentWeapon = prevPlayer.currentWeapon;
      this.player.weapons = [...prevPlayer.weapons];
    }
    this.player.keys = { gold: false, silver: false }; // Keys don't carry over
    this.player.setCollisionCallback((tx, ty) =>
      this.map!.isSolid(tx, ty) || this.blockedTiles.has(`${tx},${ty}`));
    this.player.spawn(data.playerStart);

    // Validate spawn: if player is stuck in a wall, find nearest walkable tile
    if (this.map.isSolid(Math.floor(this.player.x / TILE_SIZE), Math.floor(this.player.z / TILE_SIZE))) {
      const w = this.map.width;
      const h = this.map.height;
      let bestDist = Infinity;
      let bestX = this.player.x;
      let bestZ = this.player.z;
      for (let ty = 1; ty < h - 1; ty++) {
        for (let tx = 1; tx < w - 1; tx++) {
          if (!this.map.isSolid(tx, ty)) {
            const cx = (tx + 0.5) * TILE_SIZE;
            const cz = (ty + 0.5) * TILE_SIZE;
            const dx = cx - this.player.x;
            const dz = cz - this.player.z;
            const dist = dx * dx + dz * dz;
            if (dist < bestDist) {
              bestDist = dist;
              bestX = cx;
              bestZ = cz;
            }
          }
        }
      }
      this.player.x = bestX;
      this.player.z = bestZ;
    }

    // Sync camera to spawn position immediately
    this.renderer.camera.position.x = this.player.x;
    this.renderer.camera.position.z = this.player.z;
    this.renderer.camera.rotation.y = this.player.angle;

    // Weapon overlay
    if (this.weaponOverlay) this.weaponOverlay.destroy();
    this.weaponOverlay = new WeaponOverlay();
    this.weaponOverlay.initSprites(this.vswap, (name, firing) => drawWeaponSprite(name as WeaponName, firing));

    this.weaponCooldown = 0;
    this.levelStartTime = performance.now();
  }

  private gameLoop(time: number): void {
    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));

    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    switch (this.state) {
      case GameState.Title:
        this.handleMenuInput();
        break;

      case GameState.Playing:
        this.updatePlaying(dt);
        break;

      case GameState.Death:
        if (this.input.anyKey()) {
          this.state = GameState.Title;
          this.showScreen('title');
        }
        break;

      case GameState.Complete:
        if (this.input.anyKey()) {
          this.currentLevel++;
          this.state = GameState.Loading;
          this.showScreen(null);
          this.initLevel().then(() => {
            this.state = GameState.Playing;
            this.levelStartTime = performance.now();
          });
        }
        break;

      case GameState.Pause:
        if (this.input.isPausing()) {
          this.state = GameState.Playing;
          this.showScreen(null);
        }
        break;
    }

    this.input.endFrame();
    this.renderer.render();
  }

  private updatePlaying(dt: number): void {
    if (!this.player || !this.map || !this.enemies || !this.spriteManager) return;

    if (this.input.isPausing()) {
      this.state = GameState.Pause;
      this.showScreen('pause');
      return;
    }

    // Door interaction
    if (this.input.isInteracting()) {
      // Check tile the player is looking at AND the tile the player is standing on
      const lookX = this.player.x + (-Math.sin(this.player.angle)) * INTERACTION_RANGE;
      const lookZ = this.player.z + (-Math.cos(this.player.angle)) * INTERACTION_RANGE;
      const lookTileX = Math.floor(lookX / TILE_SIZE);
      const lookTileZ = Math.floor(lookZ / TILE_SIZE);
      const standTileX = Math.floor(this.player.x / TILE_SIZE);
      const standTileZ = Math.floor(this.player.z / TILE_SIZE);

      for (const door of this.doors) {
        if ((door.x === lookTileX && door.y === lookTileZ) ||
            (door.x === standTileX && door.y === standTileZ)) {
          const result = tryOpenDoor(door, this.player);
          if (result === 'opening') {
            this.audio.play('door_open', { volume: 0.6 });
          } else if (result === 'locked_gold' || result === 'locked_silver') {
            this.audio.play('no_key', { volume: 0.7 });
          }
          break;
        }
      }
    }

    // Update player
    const movement = this.input.getMovement();
    this.player.update(dt, movement);

    // Sync camera
    this.renderer.camera.position.x = this.player.x;
    this.renderer.camera.position.z = this.player.z;
    this.renderer.camera.rotation.y = this.player.angle;

    // Update doors
    for (const door of this.doors) {
      // Prevent door from closing on the player
      if (door.state === DoorState.Closing) {
        const doorCenterX = (door.x + 0.5) * TILE_SIZE;
        const doorCenterZ = (door.y + 0.5) * TILE_SIZE;
        const dx = this.player.x - doorCenterX;
        const dz = this.player.z - doorCenterZ;
        if (Math.abs(dx) < TILE_SIZE * 0.6 && Math.abs(dz) < TILE_SIZE * 0.6) {
          // Player is in the door tile — reopen
          door.state = DoorState.Opening;
        }
      }
      updateDoorState(door, dt);
      // Doors are passable whenever not fully closed
      if (door.state === DoorState.Closed) {
        this.map.walls[door.y]![door.x] = -1;
      } else {
        this.map.walls[door.y]![door.x] = 0;
      }
      // Animate door mesh (slide open/closed)
      const offset = door.progress * TILE_SIZE;
      if (door.orientation === 'horizontal') {
        door.mesh.position.x = door.closedPosition.x + offset;
      } else {
        door.mesh.position.z = door.closedPosition.z + offset;
      }
    }

    // Update sprites (billboards)
    this.spriteManager.update(this.renderer.camera);

    // Item pickup
    for (const item of this.items) {
      if (item.collected) continue;
      if (checkPickup(item, this.player.x, this.player.z)) {
        if (applyItemEffect(item.subtype, this.player)) {
          item.collected = true;
          this.audio.play('pickup', { volume: 0.7 });
          if (item.sprite) {
            this.spriteManager.remove(item.sprite);
          }
        }
      }
    }

    // Update enemies (with audio proxy for player damage sound)
    const player = this.player;
    const audio = this.audio;
    const playerWithAudio = {
      get x() { return player.x; },
      get z() { return player.z; },
      takeDamage(amount: number) {
        player.takeDamage(amount);
        audio.play('player_pain', { volume: 0.6 });
      },
    };
    this.enemies.update(dt, playerWithAudio);

    // Weapon system
    this.weaponCooldown = updateWeaponCooldown(this.weaponCooldown, dt);

    // Weapon switch
    const switchTo = this.input.weaponSwitch();
    if (switchTo >= 0 && this.player.weapons[switchTo]) {
      this.player.currentWeapon = switchTo as WeaponId;
    }

    // Fire weapon
    if (this.input.isFiring() && this.weaponCooldown <= 0) {
      const weapon = this.player.currentWeapon;
      if (weapon !== WeaponId.Knife && this.player.ammo <= 0) {
        // No ammo
      } else {
        if (weapon !== WeaponId.Knife) this.player.ammo--;
        this.weaponCooldown = WEAPON_FIRE_RATES[weapon];
        if (this.weaponOverlay) this.weaponOverlay.setFiring(true);

        // Weapon sound
        const weaponSounds: Record<number, string> = {
          [WeaponId.Knife]: 'knife',
          [WeaponId.Pistol]: 'pistol',
          [WeaponId.MachineGun]: 'machinegun',
          [WeaponId.Chaingun]: 'machinegun',
        };
        this.audio.play(weaponSounds[weapon] ?? 'pistol', { volume: 0.8 });

        // Alert nearby enemies
        this.enemies.alertNearby(this.player.x, this.player.z);

        // Hitscan
        const dirX = -Math.sin(this.player.angle);
        const dirZ = -Math.cos(this.player.angle);
        const range = WEAPON_RANGE[weapon];
        const allEnemies = this.enemies.getEnemies();
        const target = hitscanCheck(this.player.x, this.player.z, dirX, dirZ, range, allEnemies);
        if (target) {
          const damage = WEAPON_DAMAGE_MIN + Math.random() * (WEAPON_DAMAGE_MAX - WEAPON_DAMAGE_MIN);
          this.enemies.hitEnemy(target as any, Math.round(damage), this.player);
          const enemy = target as any;
          if (enemy.health <= 0) {
            this.audio.playSpatial('enemy_die', this.player.x, this.player.z, enemy.x, enemy.z, 30);
          }
        }
      }
    }

    // Weapon overlay update & render
    if (this.weaponOverlay) {
      this.weaponOverlay.setWeapon(this.player.currentWeapon);
      this.weaponOverlay.update(dt);
      this.weaponOverlay.render();
    }

    // Update HUD
    this.hud.update(this.player);

    // Death check
    if (this.player.isDead) {
      this.state = GameState.Death;
      this.showScreen('death');
    }

    // Exit tile check
    if (this.map.exitTile && this.input.isInteracting()) {
      const px = Math.floor(this.player.x);
      const pz = Math.floor(this.player.z);
      if (px === this.map.exitTile.x && pz === this.map.exitTile.y) {
        this.state = GameState.Complete;
        this.showLevelComplete();
      }
    }
  }

  private showLevelComplete(): void {
    if (!this.player || !this.enemies) return;
    const elapsed = ((performance.now() - this.levelStartTime) / 1000).toFixed(0);
    const killPct = this.enemies.totalEnemies > 0
      ? Math.round(this.enemies.killedEnemies / this.enemies.totalEnemies * 100) : 0;
    const totalTreasures = this.items.filter(i => {
      const e = ITEM_EFFECTS[i.subtype];
      return e && e.type === 'score';
    }).length;
    const collectedTreasures = this.items.filter(i => {
      const e = ITEM_EFFECTS[i.subtype];
      return e && e.type === 'score' && i.collected;
    }).length;
    const treasurePct = totalTreasures > 0
      ? Math.round(collectedTreasures / totalTreasures * 100) : 0;

    const statsEl = document.getElementById('level-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <p style="margin:6px 0;">Time: ${elapsed} seconds</p>
        <p style="margin:6px 0;">Kill Ratio: ${killPct}%</p>
        <p style="margin:6px 0;">Treasure: ${treasurePct}%</p>
        <p style="margin:6px 0;">Score: ${String(this.player.score).padStart(7, '0')}</p>
      `;
    }
    this.showScreen('complete');
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.input.destroy();
    this.renderer.destroy();
    if (this.weaponOverlay) this.weaponOverlay.destroy();
  }
}

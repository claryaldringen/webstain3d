import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { DoorManager } from './doors.js';
import { SpriteManager } from './sprites.js';
import { ItemManager } from './items.js';
import { EnemyManager } from './enemies.js';
import { WeaponSystem } from './weapons.js';
import { HUD } from './hud.js';
import { AudioManager } from './audio.js';

const STATE = { TITLE: 0, PLAYING: 1, DEATH: 2, COMPLETE: 3, PAUSE: 4 };

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const input = new Input();
const audio = new AudioManager();
const hud = new HUD();

let map, player, doors, spriteManager, items, enemies, weapons;
let gameState = STATE.TITLE;
let lastTime = 0;
let levelStartTime = 0;

const screens = {
    title: document.getElementById('screen-title'),
    death: document.getElementById('screen-death'),
    complete: document.getElementById('screen-complete'),
    pause: document.getElementById('screen-pause'),
};

function showScreen(name) {
    for (const [key, el] of Object.entries(screens)) {
        el.style.display = key === name ? 'flex' : 'none';
    }
}

async function initLevel() {
    renderer.clearLevel();

    map = new GameMap(renderer);
    const data = await map.load('data/level1.json');

    spriteManager = new SpriteManager(renderer);
    doors = new DoorManager(renderer, map);
    doors.init(map.doors);
    doors.initPushwalls(map.pushwalls);

    items = new ItemManager(spriteManager);
    items.init(map.entities);

    enemies = new EnemyManager(spriteManager, map);
    enemies.itemManager = items;
    enemies.init(map.entities);

    weapons = new WeaponSystem(map, enemies);

    player = new Player(renderer.camera, map);
    player.spawn(data.playerStart);

    levelStartTime = performance.now();
}

function startGame() {
    if (gameState !== STATE.TITLE) return; // prevent double-init
    gameState = -1; // loading state — prevents re-triggering
    audio.init();
    audio.loadSound('pistol', 'assets/sounds/pistol.wav');
    audio.loadSound('machinegun', 'assets/sounds/machinegun.wav');
    audio.loadSound('knife', 'assets/sounds/knife.wav');
    audio.loadSound('door_open', 'assets/sounds/door_open.wav');
    audio.loadSound('pickup', 'assets/sounds/pickup.wav');
    audio.loadSound('enemy_die', 'assets/sounds/enemy_die.wav');
    audio.loadSound('player_pain', 'assets/sounds/player_pain.wav');
    audio.loadSound('secret', 'assets/sounds/secret.wav');
    audio.loadSound('no_key', 'assets/sounds/no_key.wav');

    initLevel().then(() => {
        gameState = STATE.PLAYING;
        showScreen(null);
    });
}

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    switch (gameState) {
        case STATE.TITLE:
            if (input.anyKey()) startGame();
            break;

        case STATE.PLAYING:
            if (input.isPausing()) {
                gameState = STATE.PAUSE;
                showScreen('pause');
                break;
            }

            if (input.isInteracting()) {
                const doorResult = doors.tryOpen(player);
                if (!doorResult) {
                    doors.tryPushWall(player);
                }
            }

            player.update(dt, input);
            doors.update(dt);
            doors.updatePushwalls(dt);
            spriteManager.update(renderer.camera);
            items.update(player);
            enemies.update(dt, player);
            weapons.update(dt, player, input);
            hud.update(player);

            if (player.isDead) {
                gameState = STATE.DEATH;
                showScreen('death');
            }

            if (map.exitTile) {
                const px = Math.floor(player.x);
                const pz = Math.floor(player.z);
                if (px === map.exitTile.x && pz === map.exitTile.y && input.isInteracting()) {
                    gameState = STATE.COMPLETE;
                    showLevelComplete();
                }
            }
            break;

        case STATE.DEATH:
            if (input.anyKey()) {
                gameState = STATE.TITLE;
                showScreen('title');
            }
            break;

        case STATE.COMPLETE:
            if (input.anyKey()) {
                gameState = STATE.TITLE;
                showScreen('title');
            }
            break;

        case STATE.PAUSE:
            if (input.isPausing()) {
                gameState = STATE.PLAYING;
                showScreen(null);
            }
            break;
    }

    input.endFrame();
    renderer.render();
}

function showLevelComplete() {
    const elapsed = ((performance.now() - levelStartTime) / 1000).toFixed(0);
    const killPct = enemies.totalEnemies > 0
        ? Math.round(enemies.killedEnemies / enemies.totalEnemies * 100) : 0;
    const treasurePct = items.totalTreasures > 0
        ? Math.round(items.collectedTreasures / items.totalTreasures * 100) : 0;

    const statsEl = document.getElementById('level-stats');
    statsEl.innerHTML = `
        <p style="margin:6px 0;">Time: ${elapsed} seconds</p>
        <p style="margin:6px 0;">Kill Ratio: ${killPct}%</p>
        <p style="margin:6px 0;">Treasure: ${treasurePct}%</p>
        <p style="margin:6px 0;">Score: ${String(player.score).padStart(7, '0')}</p>
    `;
    showScreen('complete');
}

showScreen('title');
lastTime = performance.now();
requestAnimationFrame(gameLoop);

import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { GameMap } from './map.js';
import { Player } from './player.js';

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const input = new Input();
const map = new GameMap(renderer);

let player;
let lastTime = 0;

async function init() {
    const data = await map.load('data/level1.json');

    player = new Player(renderer.camera, map);
    player.spawn(data.playerStart);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    player.update(dt, input);
    input.endFrame();
    renderer.render();
}

init();

import { Renderer } from './renderer.js';

const canvas = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);

// Place camera somewhere to verify floor/ceiling
renderer.camera.position.set(5, 0.5, 5);
renderer.camera.lookAt(10, 0.5, 5);

function gameLoop() {
    requestAnimationFrame(gameLoop);
    renderer.render();
}

gameLoop();
console.log('Webstain3D running');

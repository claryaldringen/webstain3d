// Lightweight WebSocket bot for multiplayer testing
// Usage: npx tsx tools/bot.ts [name] [server]
import WebSocket from 'ws';

const NAME = process.argv[2] || 'Hans';
const SERVER = process.argv[3] || 'wss://ws.martinzadrazil.com';

let seq = 0;
let x = 0, z = 0, angle = 0;
let phaseTimer = 0;
let forward = 0, strafe = 0, rotate = 0, sprint = false, shoot = false;
let walls: number[][] = [];
let mapWidth = 0, mapHeight = 0;
let myId = '';
let targetX = 0, targetZ = 0, hasTarget = false;

const SPEED = 3.5;
const ROTATE_SPEED = 2.6;
const RADIUS = 0.4;
const DT = 0.05; // 20Hz

function isSolid(tx: number, ty: number): boolean {
  if (tx < 0 || tx >= mapWidth || ty < 0 || ty >= mapHeight) return true;
  return walls[ty]?.[tx] !== 0;
}

function checkCollision(px: number, pz: number): boolean {
  const minTX = Math.floor((px - RADIUS));
  const maxTX = Math.floor((px + RADIUS));
  const minTZ = Math.floor((pz - RADIUS));
  const maxTZ = Math.floor((pz + RADIUS));
  for (let ty = minTZ; ty <= maxTZ; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      if (isSolid(tx, ty)) {
        const closestX = Math.max(tx, Math.min(px, tx + 1));
        const closestZ = Math.max(ty, Math.min(pz, ty + 1));
        const dx = px - closestX;
        const dz = pz - closestZ;
        if (dx * dx + dz * dz < RADIUS * RADIUS) return true;
      }
    }
  }
  return false;
}

const ws = new WebSocket(SERVER);

ws.on('open', () => {
  console.log(`[${NAME}] Connected to ${SERVER}`);
  ws.send(JSON.stringify({ type: 'join', name: NAME }));
});

ws.on('message', (data: Buffer) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'welcome') {
    myId = msg.id;
    console.log(`[${NAME}] Joined room ${msg.roomId} as ${msg.id}`);
    const lvl = msg.levelConfigs?.[0];
    if (lvl) {
      walls = lvl.walls;
      mapWidth = lvl.width;
      mapHeight = lvl.height;
      x = (lvl.playerStart.x + 0.5);
      z = (lvl.playerStart.y + 0.5);
      console.log(`[${NAME}] Map ${mapWidth}x${mapHeight}, start at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
  }
  if (msg.type === 'snapshot') {
    // Find nearest other player to aim at
    const others = (msg.players || []).filter((p: any) => p.id !== myId && p.alive);
    if (others.length > 0) {
      let closest = others[0];
      let closestDist = Infinity;
      for (const p of others) {
        const dx = p.x - x;
        const dz = p.z - z;
        const dist = dx * dx + dz * dz;
        if (dist < closestDist) { closestDist = dist; closest = p; }
      }
      targetX = closest.x;
      targetZ = closest.z;
      hasTarget = true;
    } else {
      hasTarget = false;
    }
  }
  if (msg.type === 'player_joined') console.log(`[${NAME}] ${msg.name} joined`);
  if (msg.type === 'player_left') console.log(`[${NAME}] ${msg.name} left`);
});

ws.on('close', () => { console.log(`[${NAME}] Disconnected`); process.exit(0); });
ws.on('error', (e) => { console.error(`[${NAME}] Error:`, e.message); });

function pickAction() {
  const r = Math.random();
  if (r < 0.35) {
    forward = 1; strafe = 0; rotate = (Math.random() - 0.5) * 0.3; shoot = false; sprint = false;
    phaseTimer = 1 + Math.random() * 2;
  } else if (r < 0.5) {
    forward = 0; strafe = 0; rotate = Math.random() > 0.5 ? 1 : -1; shoot = false; sprint = false;
    phaseTimer = 0.3 + Math.random() * 0.8;
  } else if (r < 0.7) {
    forward = 1; strafe = 0; rotate = (Math.random() - 0.5) * 0.5; shoot = true; sprint = false;
    phaseTimer = 0.5 + Math.random() * 1.5;
  } else if (r < 0.85) {
    forward = 0.5; strafe = Math.random() > 0.5 ? 1 : -1; rotate = 0; shoot = false; sprint = false;
    phaseTimer = 0.5 + Math.random() * 1;
  } else {
    forward = 1; strafe = 0; rotate = 0; shoot = false; sprint = false;
    phaseTimer = 1 + Math.random() * 2;
  }
}

pickAction();
let stuckCounter = 0;
let lastX = 0, lastZ = 0;

const interval = setInterval(() => {
  if (ws.readyState !== WebSocket.OPEN) return;

  phaseTimer -= DT;
  if (phaseTimer <= 0) pickAction();

  // Detect stuck and force turn
  if (Math.abs(x - lastX) < 0.001 && Math.abs(z - lastZ) < 0.001 && forward !== 0) {
    stuckCounter++;
    if (stuckCounter > 10) {
      rotate = Math.random() > 0.5 ? 1 : -1;
      forward = 0;
      phaseTimer = 0.5;
      stuckCounter = 0;
    }
  } else {
    stuckCounter = 0;
  }
  lastX = x; lastZ = z;

  // Aim at target player when visible
  if (hasTarget) {
    const dx = targetX - x;
    const dz = targetZ - z;
    const targetAngle = Math.atan2(-dx, -dz); // matches -sin/-cos model
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Smoothly rotate toward target
    let diff = targetAngle - angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    if (Math.abs(diff) < 0.2 && dist < 15) {
      // Aimed — shoot and approach
      shoot = true;
      forward = dist > 2 ? 1 : 0;
      rotate = diff * 3; // fine aim
    } else {
      // Turn toward target
      rotate = diff > 0 ? 1 : -1;
      forward = 0.5;
      shoot = false;
    }
    phaseTimer = 0.1; // fast re-eval
  }

  // Movement with collision
  angle += rotate * ROTATE_SPEED * DT;
  const speed = SPEED * (sprint ? 2 : 1) * DT;
  const dirX = -Math.sin(angle);
  const dirZ = -Math.cos(angle);
  const strafeX = Math.cos(angle);
  const strafeZ = -Math.sin(angle);

  const dx = (dirX * forward + strafeX * strafe) * speed;
  const dz = (dirZ * forward + strafeZ * strafe) * speed;

  if (dx !== 0) {
    const tryX = x + dx;
    if (!checkCollision(tryX, z)) x = tryX;
  }
  if (dz !== 0) {
    const tryZ = z + dz;
    if (!checkCollision(x, tryZ)) z = tryZ;
  }

  seq++;
  ws.send(JSON.stringify({
    type: 'input', seq, forward, strafe, rotate, sprint, shoot, interact: false,
    x, z, angle,
  }));
}, DT * 1000);

process.on('SIGINT', () => {
  console.log(`\n[${NAME}] Shutting down...`);
  clearInterval(interval);
  ws.close();
});

console.log(`[${NAME}] Bot running. Press Ctrl+C to stop.`);

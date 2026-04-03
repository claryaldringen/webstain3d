// Lightweight WebSocket bot for multiplayer testing
// Usage: npx tsx tools/bot.ts [name] [server]
import WebSocket from 'ws';

const NAME = process.argv[2] || 'Hans';
const SERVER = process.argv[3] || 'wss://ws.martinzadrazil.com';

let seq = 0;
let x = 0, z = 0, angle = 0;
let phase = 'forward';
let phaseTimer = 0;
let forward = 0, strafe = 0, rotate = 0, sprint = false, shoot = false;

const SPEED = 3.5;
const ROTATE_SPEED = 2.6;
const DT = 0.05; // 20Hz

const ws = new WebSocket(SERVER);

ws.on('open', () => {
  console.log(`[${NAME}] Connected to ${SERVER}`);
  ws.send(JSON.stringify({ type: 'join', name: NAME }));
});

ws.on('message', (data: Buffer) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'welcome') {
    console.log(`[${NAME}] Joined room ${msg.roomId} as ${msg.id}`);
    // Find our start position from level config
    const lvl = msg.levelConfigs?.[0];
    if (lvl?.playerStart) {
      x = (lvl.playerStart.x + 0.5);
      z = (lvl.playerStart.y + 0.5);
    }
  }
  if (msg.type === 'snapshot') {
    const me = msg.players?.find((p: any) => p.id === msg.you);
    if (me) {
      // Use server position as ground truth
      x = me.x; z = me.z; angle = me.angle;
    }
  }
  if (msg.type === 'player_joined') {
    console.log(`[${NAME}] ${msg.name} joined`);
  }
});

ws.on('close', () => { console.log(`[${NAME}] Disconnected`); process.exit(0); });
ws.on('error', (e) => { console.error(`[${NAME}] Error:`, e.message); });

function pickAction() {
  const r = Math.random();
  if (r < 0.35) {
    phase = 'forward';
    forward = 1; strafe = 0; rotate = (Math.random() - 0.5) * 0.3; shoot = false; sprint = false;
    phaseTimer = 1 + Math.random() * 2;
  } else if (r < 0.5) {
    phase = 'turn';
    forward = 0; strafe = 0; rotate = Math.random() > 0.5 ? 1 : -1; shoot = false; sprint = false;
    phaseTimer = 0.3 + Math.random() * 0.8;
  } else if (r < 0.7) {
    phase = 'shoot_move';
    forward = 1; strafe = 0; rotate = (Math.random() - 0.5) * 0.5; shoot = true; sprint = false;
    phaseTimer = 0.5 + Math.random() * 1.5;
  } else if (r < 0.85) {
    phase = 'strafe';
    forward = 0.5; strafe = Math.random() > 0.5 ? 1 : -1; rotate = 0; shoot = false; sprint = false;
    phaseTimer = 0.5 + Math.random() * 1;
  } else {
    phase = 'sprint';
    forward = 1; strafe = 0; rotate = 0; shoot = false; sprint = true;
    phaseTimer = 1 + Math.random() * 2;
  }
}

pickAction();

const interval = setInterval(() => {
  if (ws.readyState !== WebSocket.OPEN) return;

  phaseTimer -= DT;
  if (phaseTimer <= 0) pickAction();

  // Simple local prediction
  angle += rotate * ROTATE_SPEED * DT;
  const speed = SPEED * (sprint ? 2 : 1) * DT;
  const dirX = -Math.sin(angle);
  const dirZ = -Math.cos(angle);
  x += dirX * forward * speed;
  z += dirZ * forward * speed;

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

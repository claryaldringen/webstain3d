import { SeededRandom } from '../SeededRandom.js';
import type { Grid, LayoutResult, Room } from '../types.js';

const MIN_LEAF = 8;
const MIN_ROOM = 4;
const MAX_ROOM = 10;

interface Leaf {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: Leaf;
  right?: Leaf;
  room?: Room;
}

function splitLeaf(leaf: Leaf, rng: SeededRandom): void {
  // Already split
  if (leaf.left || leaf.right) return;

  // Decide split direction: prefer the longer axis; randomise when square
  const splitH = leaf.w > leaf.h
    ? false
    : leaf.h > leaf.w
      ? true
      : rng.next() < 0.5;

  const maxSplit = splitH ? leaf.h : leaf.w;
  if (maxSplit < MIN_LEAF * 2) return; // Too small to split further

  // Pick a split position that leaves at least MIN_LEAF on each side
  const splitPos = rng.int(MIN_LEAF, maxSplit - MIN_LEAF);

  if (splitH) {
    leaf.left  = { x: leaf.x, y: leaf.y,              w: leaf.w, h: splitPos };
    leaf.right = { x: leaf.x, y: leaf.y + splitPos,   w: leaf.w, h: leaf.h - splitPos };
  } else {
    leaf.left  = { x: leaf.x,              y: leaf.y, w: splitPos,          h: leaf.h };
    leaf.right = { x: leaf.x + splitPos,   y: leaf.y, w: leaf.w - splitPos, h: leaf.h };
  }

  splitLeaf(leaf.left,  rng);
  splitLeaf(leaf.right, rng);
}

function createRooms(leaf: Leaf, rng: SeededRandom, rooms: Room[]): void {
  if (leaf.left || leaf.right) {
    if (leaf.left)  createRooms(leaf.left,  rng, rooms);
    if (leaf.right) createRooms(leaf.right, rng, rooms);
    return;
  }

  // Leaf node: place a room
  const maxW = Math.min(leaf.w - 2, MAX_ROOM);
  const maxH = Math.min(leaf.h - 2, MAX_ROOM);
  if (maxW < MIN_ROOM || maxH < MIN_ROOM) return;

  const rw = rng.int(MIN_ROOM, maxW);
  const rh = rng.int(MIN_ROOM, maxH);
  const rx = leaf.x + 1 + rng.int(0, leaf.w - rw - 2);
  const ry = leaf.y + 1 + rng.int(0, leaf.h - rh - 2);

  leaf.room = { x: rx, y: ry, w: rw, h: rh };
  rooms.push(leaf.room);
}

function getRoom(leaf: Leaf): Room | undefined {
  if (leaf.room) return leaf.room;
  const lr = leaf.left  ? getRoom(leaf.left)  : undefined;
  const rr = leaf.right ? getRoom(leaf.right) : undefined;
  if (lr && rr) return lr; // return either; corridor connects them
  return lr ?? rr;
}

function carveHCorridor(walls: Grid, x1: number, x2: number, y: number): void {
  const start = Math.min(x1, x2);
  const end   = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    if (walls[y] !== undefined) walls[y][x] = 0;
  }
}

function carveVCorridor(walls: Grid, y1: number, y2: number, x: number): void {
  const start = Math.min(y1, y2);
  const end   = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    if (walls[y] !== undefined) walls[y][x] = 0;
  }
}

function connectRooms(leaf: Leaf, walls: Grid, rng: SeededRandom): void {
  if (!leaf.left || !leaf.right) return;

  // Recurse into children first
  connectRooms(leaf.left,  walls, rng);
  connectRooms(leaf.right, walls, rng);

  const roomA = getRoom(leaf.left);
  const roomB = getRoom(leaf.right);
  if (!roomA || !roomB) return;

  // Centre points of each room
  const ax = roomA.x + Math.floor(roomA.w / 2);
  const ay = roomA.y + Math.floor(roomA.h / 2);
  const bx = roomB.x + Math.floor(roomB.w / 2);
  const by = roomB.y + Math.floor(roomB.h / 2);

  // L-shaped corridor: horizontal then vertical (or vice-versa based on rng)
  if (rng.next() < 0.5) {
    carveHCorridor(walls, ax, bx, ay);
    carveVCorridor(walls, ay, by, bx);
  } else {
    carveVCorridor(walls, ay, by, ax);
    carveHCorridor(walls, ax, bx, by);
  }
}

function carveRoom(walls: Grid, room: Room): void {
  for (let dy = 0; dy < room.h; dy++) {
    for (let dx = 0; dx < room.w; dx++) {
      walls[room.y + dy][room.x + dx] = 0;
    }
  }
}

export function generateRoomsCorridors(
  rng: SeededRandom,
  width: number,
  height: number,
  wallVariety: number,
): LayoutResult {
  // 1. Fill grid with random wall texture IDs (1..wallVariety)
  const walls: Grid = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(rng.int(1, wallVariety));
    }
    walls.push(row);
  }

  // 2. BSP on the interior region (leaving a 1-tile border)
  const root: Leaf = { x: 1, y: 1, w: width - 2, h: height - 2 };
  splitLeaf(root, rng);

  // 3. Create rooms in leaf nodes
  const rooms: Room[] = [];
  createRooms(root, rng, rooms);

  // 4. Carve rooms into the grid
  for (const room of rooms) {
    carveRoom(walls, room);
  }

  // 5. Connect sibling rooms with L-shaped corridors
  connectRooms(root, walls, rng);

  // 6. Re-enforce border walls (corridors must not punch through the border)
  for (let x = 0; x < width; x++) {
    walls[0][x]          = walls[0][x]          > 0 ? walls[0][x]          : rng.int(1, wallVariety);
    walls[height - 1][x] = walls[height - 1][x] > 0 ? walls[height - 1][x] : rng.int(1, wallVariety);
  }
  for (let y = 0; y < height; y++) {
    walls[y][0]         = walls[y][0]         > 0 ? walls[y][0]         : rng.int(1, wallVariety);
    walls[y][width - 1] = walls[y][width - 1] > 0 ? walls[y][width - 1] : rng.int(1, wallVariety);
  }

  return { walls, rooms };
}

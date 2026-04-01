import { SeededRandom } from '../SeededRandom.js';
import type { Grid, LayoutResult, Room } from '../types.js';

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function carveRoom(walls: Grid, room: Room): void {
  for (let dy = 0; dy < room.h; dy++) {
    for (let dx = 0; dx < room.w; dx++) {
      walls[room.y + dy][room.x + dx] = 0;
    }
  }
}

function carveLine(walls: Grid, x1: number, y1: number, x2: number, y2: number): void {
  // Bresenham's line algorithm — carves a 3-wide corridor for reliable connectivity
  let dx = Math.abs(x2 - x1);
  let dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  let x = x1;
  let y = y1;

  const h = walls.length;
  const w = walls[0].length;

  const carveCell = (cx: number, cy: number) => {
    if (cx >= 1 && cx < w - 1 && cy >= 1 && cy < h - 1) {
      walls[cy][cx] = 0;
    }
  };

  while (true) {
    carveCell(x, y);
    // Widen the corridor by 1 in the perpendicular direction
    if (dx >= dy) {
      // Mostly horizontal — also carve row above and below
      carveCell(x, y - 1);
      carveCell(x, y + 1);
    } else {
      // Mostly vertical — also carve column left and right
      carveCell(x - 1, y);
      carveCell(x + 1, y);
    }
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

export function generateHubSpoke(
  rng: SeededRandom,
  width: number,
  height: number,
  wallVariety: number,
  spokeCount: number,
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

  const rooms: Room[] = [];

  // 2. Central hub room at (width/2, height/2), size 4-6
  const hubSize = rng.int(4, 6);
  const hubX = Math.floor(width / 2) - Math.floor(hubSize / 2);
  const hubY = Math.floor(height / 2) - Math.floor(hubSize / 2);
  const hubRoom: Room = { x: hubX, y: hubY, w: hubSize, h: hubSize };
  carveRoom(walls, hubRoom);
  rooms.push(hubRoom);

  const hubCX = Math.floor(width / 2);
  const hubCY = Math.floor(height / 2);

  // 3. spokeCount rooms at evenly distributed angles
  const radius = Math.floor(Math.min(width, height) / 2) - 4;
  const spokeRooms: Room[] = [];

  for (let i = 0; i < spokeCount; i++) {
    const angle = (2 * Math.PI * i) / spokeCount;
    const spokeSize = rng.int(3, 5);
    const spCX = Math.round(hubCX + radius * Math.cos(angle));
    const spCY = Math.round(hubCY + radius * Math.sin(angle));

    const spX = clamp(spCX - Math.floor(spokeSize / 2), 1, width - spokeSize - 1);
    const spY = clamp(spCY - Math.floor(spokeSize / 2), 1, height - spokeSize - 1);

    const spokeRoom: Room = { x: spX, y: spY, w: spokeSize, h: spokeSize };
    carveRoom(walls, spokeRoom);
    rooms.push(spokeRoom);
    spokeRooms.push(spokeRoom);
  }

  // 4. Carve Bresenham line corridors from hub center to each spoke room center
  for (const spoke of spokeRooms) {
    const spCX = spoke.x + Math.floor(spoke.w / 2);
    const spCY = spoke.y + Math.floor(spoke.h / 2);
    carveLine(walls, hubCX, hubCY, spCX, spCY);
  }

  // 5. If spokeCount >= 4, add ring corridor connecting mid-points at 55% radius
  if (spokeCount >= 4) {
    const ringRadius = Math.round(radius * 0.55);
    let prevX = -1, prevY = -1;
    for (let i = 0; i <= spokeCount; i++) {
      const angle = (2 * Math.PI * i) / spokeCount;
      const rx = clamp(Math.round(hubCX + ringRadius * Math.cos(angle)), 1, width - 2);
      const ry = clamp(Math.round(hubCY + ringRadius * Math.sin(angle)), 1, height - 2);
      if (prevX >= 0) {
        carveLine(walls, prevX, prevY, rx, ry);
      }
      prevX = rx;
      prevY = ry;
    }
  }

  // 6. Ensure border walls
  for (let x = 0; x < width; x++) {
    if (walls[0][x] === 0) walls[0][x] = rng.int(1, wallVariety);
    if (walls[height - 1][x] === 0) walls[height - 1][x] = rng.int(1, wallVariety);
  }
  for (let y = 0; y < height; y++) {
    if (walls[y][0] === 0) walls[y][0] = rng.int(1, wallVariety);
    if (walls[y][width - 1] === 0) walls[y][width - 1] = rng.int(1, wallVariety);
  }

  return { walls, rooms };
}

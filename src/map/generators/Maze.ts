import { SeededRandom } from '../SeededRandom.js';
import type { Grid, LayoutResult, Room } from '../types.js';

/**
 * Recursive-backtracker maze generator.
 *
 * The maze is carved on odd-coordinate "cells":
 *   cell (cx, cy)  →  grid position (cx*2+1, cy*2+1)
 *   wall between two adjacent cells is at their midpoint.
 *
 * After maze generation, ~40% of dead-end cells are expanded into 3×3 rooms.
 */
export function generateMaze(
  rng: SeededRandom,
  width: number,
  height: number,
  wallVariety: number,
): LayoutResult {
  // ── 1. Fill entire grid with random wall IDs (1..wallVariety) ──────────
  const walls: Grid = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(rng.int(1, wallVariety));
    }
    walls.push(row);
  }

  // ── 2. Determine maze cell dimensions ────────────────────────────────────
  // Cells sit at odd grid coords: 1, 3, 5, ...
  // Number of cells: floor((dim - 1) / 2)
  const cellsW = Math.floor((width  - 1) / 2);
  const cellsH = Math.floor((height - 1) / 2);

  // visited[cy][cx]
  const visited: boolean[][] = Array.from({ length: cellsH }, () =>
    new Array<boolean>(cellsW).fill(false),
  );

  // Helper: grid coords for a cell
  const gx = (cx: number) => cx * 2 + 1;
  const gy = (cy: number) => cy * 2 + 1;

  // Carve a grid tile (set to 0 = floor)
  const carve = (x: number, y: number) => {
    if (y >= 0 && y < height && x >= 0 && x < width) walls[y][x] = 0;
  };

  // ── 3. Iterative stack-based backtracker ──────────────────────────────────
  const startCX = 0;
  const startCY = 0;
  visited[startCY][startCX] = true;
  carve(gx(startCX), gy(startCY));

  const stack: [number, number][] = [[startCX, startCY]];
  const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];

    // Collect unvisited neighbours
    const neighbours: [number, number][] = [];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < cellsW && ny >= 0 && ny < cellsH && !visited[ny][nx]) {
        neighbours.push([nx, ny]);
      }
    }

    if (neighbours.length === 0) {
      // Dead end — backtrack
      stack.pop();
      continue;
    }

    // Pick a random unvisited neighbour
    const idx = Math.floor(rng.next() * neighbours.length);
    const [nx, ny] = neighbours[idx];

    // Carve the neighbour cell and the wall between current and neighbour
    visited[ny][nx] = true;
    carve(gx(nx), gy(ny));
    // Wall sits at the midpoint between the two cells
    carve(gx(cx) + (nx - cx), gy(cy) + (ny - cy));

    stack.push([nx, ny]);
  }

  // ── 4. Find dead ends and expand ~40% into 3×3 rooms ─────────────────────
  const deadEnds: [number, number][] = [];

  for (let cy = 0; cy < cellsH; cy++) {
    for (let cx = 0; cx < cellsW; cx++) {
      // Count open (floor) neighbours among the 4 adjacent grid tiles
      // (these are the carved-wall positions between cells)
      let openCount = 0;
      for (const [dx, dy] of dirs) {
        const wx = gx(cx) + dx;
        const wy = gy(cy) + dy;
        if (wy >= 0 && wy < height && wx >= 0 && wx < width && walls[wy][wx] === 0) {
          openCount++;
        }
      }
      if (openCount === 1) {
        deadEnds.push([cx, cy]);
      }
    }
  }

  rng.shuffle(deadEnds);
  const expandCount = Math.ceil(deadEnds.length * 0.4);
  const rooms: Room[] = [];

  for (let i = 0; i < expandCount; i++) {
    const [cx, cy] = deadEnds[i];
    const centerX = gx(cx);
    const centerY = gy(cy);

    // 3×3 room centred on the cell's grid position
    const rx = centerX - 1;
    const ry = centerY - 1;
    const rw = 3;
    const rh = 3;

    // Stay within the interior (not touching border walls)
    if (rx < 1 || ry < 1 || rx + rw > width - 1 || ry + rh > height - 1) continue;

    for (let dy = 0; dy < rh; dy++) {
      for (let dx = 0; dx < rw; dx++) {
        walls[ry + dy][rx + dx] = 0;
      }
    }

    rooms.push({ x: rx, y: ry, w: rw, h: rh });
  }

  // ── 5. Re-enforce border walls ────────────────────────────────────────────
  for (let x = 0; x < width; x++) {
    if (walls[0][x] === 0)          walls[0][x]          = rng.int(1, wallVariety);
    if (walls[height - 1][x] === 0) walls[height - 1][x] = rng.int(1, wallVariety);
  }
  for (let y = 0; y < height; y++) {
    if (walls[y][0] === 0)         walls[y][0]         = rng.int(1, wallVariety);
    if (walls[y][width - 1] === 0) walls[y][width - 1] = rng.int(1, wallVariety);
  }

  return { walls, rooms };
}

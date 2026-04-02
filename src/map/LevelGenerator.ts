import { SeededRandom } from './SeededRandom.js';
import { resolveConfig } from './types.js';
import type { LevelConfig, ResolvedConfig, LayoutResult, Room } from './types.js';
import type { LevelData, EntityData, DoorData, TilePosition } from '../types/index.js';
import { generateRoomsCorridors } from './generators/RoomsCorridors.js';
import { generateHubSpoke } from './generators/HubSpoke.js';
import { generateMaze } from './generators/Maze.js';
import { validateLevel } from './LevelValidator.js';
import { floodFill } from './LevelValidator.js';
import { STRUCTURAL_WALL_IDS, DECORATIVE_WALL_IDS } from '../core/constants.js';

const MIN_SPAWN_ENEMY_DIST = 8;
const AMMO_PER_CLIP = 8;
const SHOTS_PER_ENEMY: Record<string, number> = { guard: 3, ss: 5, dog: 1, mutant: 4, officer: 6, boss: 50 };
const STARTING_AMMO = 8;

function getFloorTiles(walls: number[][], width: number, height: number): TilePosition[] {
  const tiles: TilePosition[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (walls[y][x] === 0) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

function distBetween(a: TilePosition, b: TilePosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function findFarthestFloorTile(
  walls: number[][],
  from: TilePosition,
  floorTiles: TilePosition[],
  reachableSet: Set<string>,
): TilePosition | null {
  let best: TilePosition | null = null;
  let bestDist = -1;
  for (const t of floorTiles) {
    if (!reachableSet.has(`${t.x},${t.y}`)) continue;
    const d = distBetween(from, t);
    if (d > bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

function isChokepoint(walls: number[][], x: number, y: number, width: number, height: number): boolean {
  if (walls[y][x] !== 0) return false;
  // Floor tile with walls on opposing sides (N/S or E/W)
  const northWall = y - 1 < 0 || walls[y - 1][x] > 0;
  const southWall = y + 1 >= height || walls[y + 1][x] > 0;
  const eastWall = x + 1 >= width || walls[y][x + 1] > 0;
  const westWall = x - 1 < 0 || walls[y][x - 1] > 0;
  return (northWall && southWall && !eastWall && !westWall) ||
         (eastWall && westWall && !northWall && !southWall);
}

/**
 * Post-process walls: replace ~5% of wall tiles that face a floor tile
 * with a decorative variant for visual interest.
 */
function decorateWalls(
  rng: SeededRandom,
  walls: number[][],
  width: number,
  height: number,
  decorateChance: number = 0.05,
): void {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (walls[y][x] <= 0) continue; // skip floor/door tiles

      // Only decorate walls adjacent to at least one floor tile (visible face)
      let adjacentToFloor = false;
      for (const [dx, dy] of dirs) {
        if (walls[y + dy][x + dx] <= 0) {
          adjacentToFloor = true;
          break;
        }
      }
      if (!adjacentToFloor) continue;

      if (rng.next() < decorateChance) {
        walls[y][x] = rng.pick(DECORATIVE_WALL_IDS);
      }
    }
  }
}

function generateLayout(rng: SeededRandom, cfg: ResolvedConfig): LayoutResult {
  switch (cfg.style) {
    case 'hub_spoke': {
      const spokeCount = rng.int(4, 6);
      return generateHubSpoke(rng, cfg.width, cfg.height, cfg.wallVariety, spokeCount);
    }
    case 'maze':
      return generateMaze(rng, cfg.width, cfg.height, cfg.wallVariety);
    case 'rooms_corridors':
    default:
      return generateRoomsCorridors(rng, cfg.width, cfg.height, cfg.wallVariety);
  }
}

function placeDoors(
  rng: SeededRandom,
  walls: number[][],
  cfg: ResolvedConfig,
  playerStart: TilePosition,
  floorTiles: TilePosition[],
  width: number,
  height: number,
): { doors: DoorData[]; keyEntities: EntityData[] } {
  const doors: DoorData[] = [];
  const keyEntities: EntityData[] = [];

  // Find chokepoints
  const chokepoints: TilePosition[] = [];
  for (const t of floorTiles) {
    if (isChokepoint(walls, t.x, t.y, width, height)) {
      // Don't place doors on spawn or adjacent to spawn
      if (distBetween(t, playerStart) < 3) continue;
      chokepoints.push(t);
    }
  }

  rng.shuffle(chokepoints);

  const doorCount = rng.int(cfg.doorCount[0], cfg.doorCount[1]);
  const numDoors = Math.min(doorCount, chokepoints.length);

  for (let i = 0; i < numDoors; i++) {
    const pos = chokepoints[i];
    let type: 'normal' | 'gold' | 'silver' = 'normal';

    if (cfg.lockedDoors) {
      if (i === 0) type = 'gold';
      else if (i === 1) type = 'silver';
    }

    doors.push({ x: pos.x, y: pos.y, type });

    // Mark door tile as passable but negative (convention for doors in walls array)
    // We use -1 to indicate a door tile that flood fill can pass through
    walls[pos.y][pos.x] = -1;
  }

  // Place keys for locked doors - keys must be reachable without going through the locked door
  if (cfg.lockedDoors) {
    for (const door of doors) {
      if (door.type === 'normal') continue;
      const keySubtype = door.type === 'gold' ? 'key_gold' : 'key_silver';

      // Find tiles reachable from playerStart without going through this locked door
      const blocked = new Set([`${door.x},${door.y}`]);
      const passableWalls = walls.map(row => row.map(v => (v < 0 ? 0 : v)));
      const reachable = floodFill(passableWalls, playerStart.x, playerStart.y, width, height, blocked);

      // Pick a random reachable floor tile for the key
      const candidates = floorTiles.filter(t =>
        reachable.has(`${t.x},${t.y}`) &&
        walls[t.y][t.x] <= 0 &&  // floor or door
        !(t.x === playerStart.x && t.y === playerStart.y) &&
        !doors.some(d => d.x === t.x && d.y === t.y)
      );

      if (candidates.length > 0) {
        const keyTile = rng.pick(candidates);
        keyEntities.push({ type: 'item', subtype: keySubtype, x: keyTile.x, y: keyTile.y });
      }
    }
  }

  return { doors, keyEntities };
}

function placeEnemies(
  rng: SeededRandom,
  cfg: ResolvedConfig,
  walls: number[][],
  floorTiles: TilePosition[],
  spawns: TilePosition[],
  occupiedSet: Set<string>,
): EntityData[] {
  const enemies: EntityData[] = [];
  const enemyCount = rng.int(cfg.enemyCount[0], cfg.enemyCount[1]);

  // Build list of candidate tiles far enough from all spawns
  const candidates = floorTiles.filter(t => {
    if (walls[t.y][t.x] !== 0) return false;
    if (occupiedSet.has(`${t.x},${t.y}`)) return false;
    for (const s of spawns) {
      if (distBetween(t, s) < MIN_SPAWN_ENEMY_DIST) return false;
    }
    return true;
  });

  rng.shuffle(candidates);

  const count = Math.min(enemyCount, candidates.length);
  for (let i = 0; i < count; i++) {
    const pos = candidates[i];
    const enemyType = rng.weightedPick(cfg.enemyTypes as Record<string, number>);
    enemies.push({
      type: enemyType as EntityData['type'],
      x: pos.x,
      y: pos.y,
      angle: rng.next() * Math.PI * 2,
    });
    occupiedSet.add(`${pos.x},${pos.y}`);
  }

  return enemies;
}

function placeItems(
  rng: SeededRandom,
  cfg: ResolvedConfig,
  walls: number[][],
  floorTiles: TilePosition[],
  enemies: EntityData[],
  occupiedSet: Set<string>,
): EntityData[] {
  const items: EntityData[] = [];

  // Calculate ammo needed
  let totalShotsNeeded = 0;
  for (const e of enemies) {
    totalShotsNeeded += SHOTS_PER_ENEMY[e.type] ?? 3;
  }
  const ammoNeeded = Math.ceil(totalShotsNeeded * 1.2);
  const ammoToPlace = Math.max(0, ammoNeeded - STARTING_AMMO);
  const ammoClipsNeeded = Math.ceil(ammoToPlace / AMMO_PER_CLIP);

  // Gather available floor tiles
  const available = floorTiles.filter(t =>
    walls[t.y][t.x] === 0 && !occupiedSet.has(`${t.x},${t.y}`)
  );
  rng.shuffle(available);

  let idx = 0;

  const placeItem = (subtype: string): boolean => {
    if (idx >= available.length) return false;
    const pos = available[idx++];
    items.push({ type: 'item', subtype, x: pos.x, y: pos.y });
    occupiedSet.add(`${pos.x},${pos.y}`);
    return true;
  };

  // Place ammo clips
  for (let i = 0; i < ammoClipsNeeded; i++) {
    placeItem('ammo_clip');
  }

  // Place health items based on density
  const healthCount = Math.max(1, Math.floor(enemies.length * cfg.itemDensity * 0.5));
  const healthTypes = ['food', 'first_aid', 'medkit'];
  for (let i = 0; i < healthCount; i++) {
    placeItem(healthTypes[i % healthTypes.length]);
  }

  // Place some treasure
  const treasureTypes = ['cross', 'chalice', 'chest', 'crown'];
  const treasureCount = Math.max(1, Math.floor(cfg.itemDensity * 3));
  for (let i = 0; i < treasureCount; i++) {
    placeItem(treasureTypes[i % treasureTypes.length]);
  }

  // --- Decorations ---
  // Separate tiles into wall-adjacent (good for props along walls) and open (center of rooms)
  const wallAdjacentTiles: TilePosition[] = [];
  const openTiles: TilePosition[] = [];
  for (let i = idx; i < available.length; i++) {
    const t = available[i];
    const adjWall =
      walls[t.y - 1]?.[t.x] !== undefined && walls[t.y - 1][t.x] > 0 ||
      walls[t.y + 1]?.[t.x] !== undefined && walls[t.y + 1][t.x] > 0 ||
      walls[t.y]?.[t.x - 1] !== undefined && walls[t.y][t.x - 1] > 0 ||
      walls[t.y]?.[t.x + 1] !== undefined && walls[t.y][t.x + 1] > 0;
    if (adjWall) {
      wallAdjacentTiles.push(t);
    } else {
      openTiles.push(t);
    }
  }
  rng.shuffle(wallAdjacentTiles);
  rng.shuffle(openTiles);

  let wallIdx = 0;
  let openIdx = 0;

  const placeDecorWall = (subtype: string): boolean => {
    if (wallIdx < wallAdjacentTiles.length) {
      const pos = wallAdjacentTiles[wallIdx++];
      items.push({ type: 'item', subtype, x: pos.x, y: pos.y });
      occupiedSet.add(`${pos.x},${pos.y}`);
      return true;
    }
    return placeDecorOpen(subtype);
  };

  const placeDecorOpen = (subtype: string): boolean => {
    if (openIdx < openTiles.length) {
      const pos = openTiles[openIdx++];
      items.push({ type: 'item', subtype, x: pos.x, y: pos.y });
      occupiedSet.add(`${pos.x},${pos.y}`);
      return true;
    }
    return false;
  };

  // Scale decoration count by floor tile count (more space = more props)
  const decorScale = Math.max(1, floorTiles.length / 40);

  // Lighting: chandeliers and lamps spread throughout
  const lightTypes = ['chandelier', 'lamp', 'lamp_ceil', 'lamp_floor'];
  const lightCount = Math.max(4, Math.floor(decorScale * 3));
  for (let i = 0; i < lightCount; i++) {
    placeDecorOpen(lightTypes[i % lightTypes.length]);
  }

  // Wall-adjacent decorations: barrels, suits of armor, plants, skeletons
  const wallDecoTypes = ['barrel_green', 'plant', 'suits_of_armor', 'plant_pot', 'pillar', 'vase'];
  const wallDecoCount = Math.max(4, Math.floor(decorScale * 4));
  for (let i = 0; i < wallDecoCount; i++) {
    placeDecorWall(wallDecoTypes[i % wallDecoTypes.length]);
  }

  // Grim decorations: bones, skeletons, cages
  const grimDecoTypes = ['bones', 'bones_blood', 'skeleton', 'cage_hanging', 'skeleton_cage', 'hanged_man'];
  const grimCount = Math.max(2, Math.floor(decorScale * 2));
  for (let i = 0; i < grimCount; i++) {
    placeDecorWall(grimDecoTypes[i % grimDecoTypes.length]);
  }

  // Furniture: tables in rooms, sinks against walls
  const tableTypes = ['table_chairs', 'table_plain'];
  const tableCount = Math.max(1, Math.floor(decorScale * 1));
  for (let i = 0; i < tableCount; i++) {
    placeDecorOpen(tableTypes[i % tableTypes.length]);
  }
  const sinkCount = Math.max(1, Math.floor(decorScale * 0.5));
  for (let i = 0; i < sinkCount; i++) {
    placeDecorWall('sink');
  }

  // Puddles in open areas (rare)
  const puddleCount = Math.max(1, Math.floor(decorScale * 0.5));
  for (let i = 0; i < puddleCount; i++) {
    placeDecorOpen('puddle');
  }

  return items;
}

function buildEmptyRoom(width: number, height: number): LevelData {
  const walls: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(y === 0 || y === height - 1 || x === 0 || x === width - 1 ? 1 : 0);
    }
    walls.push(row);
  }
  return {
    width,
    height,
    walls,
    doors: [],
    pushwalls: [],
    entities: [],
    playerStart: { x: Math.floor(width / 2), y: Math.floor(height / 2), angle: 0 },
    exitTile: { x: width - 2, y: height - 2 },
  };
}

export function generateLevel(config: LevelConfig): LevelData {
  const cfg = resolveConfig(config);

  for (let attempt = 0; attempt < 10; attempt++) {
    const rng = new SeededRandom(cfg.seed + attempt);

    // 1. Generate layout (uses structural wall IDs only)
    const layout = generateLayout(rng, cfg);
    const walls = layout.walls;
    const rooms = layout.rooms;

    // 1b. Sprinkle decorative wall tiles (~5% of visible walls)
    decorateWalls(rng, walls, cfg.width, cfg.height);

    const floorTiles = getFloorTiles(walls, cfg.width, cfg.height);
    if (floorTiles.length < 20) continue; // Not enough space

    // 2. Place player start - pick a tile in the first room, or a random floor tile
    let playerStartTile: TilePosition;
    if (rooms.length > 0) {
      const startRoom = rooms[0];
      playerStartTile = {
        x: startRoom.x + Math.floor(startRoom.w / 2),
        y: startRoom.y + Math.floor(startRoom.h / 2),
      };
    } else {
      playerStartTile = rng.pick(floorTiles);
    }

    // Ensure start is on a floor tile
    if (walls[playerStartTile.y][playerStartTile.x] !== 0) {
      playerStartTile = rng.pick(floorTiles);
    }

    const occupiedSet = new Set<string>();
    occupiedSet.add(`${playerStartTile.x},${playerStartTile.y}`);

    // 3. Place exit - farthest reachable tile from start
    const reachable = floodFill(walls, playerStartTile.x, playerStartTile.y, cfg.width, cfg.height);
    const exitTile = findFarthestFloorTile(walls, playerStartTile, floorTiles, reachable);
    if (!exitTile) continue;
    occupiedSet.add(`${exitTile.x},${exitTile.y}`);

    // 4. Place doors
    const { doors, keyEntities } = placeDoors(rng, walls, cfg, playerStartTile, floorTiles, cfg.width, cfg.height);

    // 5. Place multiplayer spawns
    const playerSpawns: TilePosition[] = [];
    if (cfg.spawnCount > 0) {
      // Distribute spawns across reachable floor tiles
      const spawnCandidates = floorTiles.filter(t =>
        walls[t.y][t.x] === 0 &&
        !occupiedSet.has(`${t.x},${t.y}`) &&
        reachable.has(`${t.x},${t.y}`)
      );
      rng.shuffle(spawnCandidates);

      // Try to spread spawns evenly
      const count = Math.min(cfg.spawnCount, spawnCandidates.length);
      // Pick spawns that are spread apart
      for (let i = 0; i < count; i++) {
        // Simple approach: pick from shuffled candidates, skip if too close to existing spawns
        for (let j = 0; j < spawnCandidates.length; j++) {
          const candidate = spawnCandidates[j];
          if (occupiedSet.has(`${candidate.x},${candidate.y}`)) continue;
          let tooClose = false;
          for (const existing of playerSpawns) {
            if (distBetween(candidate, existing) < 5) {
              tooClose = true;
              break;
            }
          }
          if (distBetween(candidate, playerStartTile) < 5) tooClose = true;
          if (!tooClose) {
            playerSpawns.push(candidate);
            occupiedSet.add(`${candidate.x},${candidate.y}`);
            spawnCandidates.splice(j, 1);
            break;
          }
        }
      }

      // If we couldn't find enough spread-out spawns, fill remaining from whatever's available
      while (playerSpawns.length < count && spawnCandidates.length > 0) {
        const candidate = spawnCandidates.shift()!;
        if (!occupiedSet.has(`${candidate.x},${candidate.y}`)) {
          playerSpawns.push(candidate);
          occupiedSet.add(`${candidate.x},${candidate.y}`);
        }
      }
    }

    // All spawns for distance checking
    const allSpawns = [playerStartTile, ...playerSpawns];

    // 6. Place enemies
    const enemies = placeEnemies(rng, cfg, walls, floorTiles, allSpawns, occupiedSet);

    // 7. Place items (including ammo)
    const items = placeItems(rng, cfg, walls, floorTiles, enemies, occupiedSet);

    // Combine all entities
    const entities: EntityData[] = [...enemies, ...items, ...keyEntities];

    // Build the level data
    const level: LevelData = {
      width: cfg.width,
      height: cfg.height,
      walls,
      doors,
      pushwalls: [],
      entities,
      playerStart: { x: playerStartTile.x, y: playerStartTile.y, angle: 0 },
      exitTile,
    };

    // 8. Validate
    const errors = validateLevel(level);
    if (errors.length === 0) {
      if (cfg.spawnCount > 0) {
        (level as any).playerSpawns = playerSpawns;
      }
      return level;
    }
    // Validation failed, try next seed
  }

  // Fallback: empty room
  return buildEmptyRoom(cfg.width, cfg.height);
}

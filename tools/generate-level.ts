import { readFileSync, writeFileSync } from 'fs';
import { generateLevel } from '../src/map/LevelGenerator.js';
import type { LevelConfig } from '../src/map/types.js';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`Usage: npx tsx tools/generate-level.ts <config.json> [output.json]

  config.json  - LevelConfig JSON file
  output.json  - Output file (default: stdout)

Example config:
{
  "style": "rooms_corridors",
  "seed": 42,
  "enemyCount": [5, 10],
  "enemyTypes": { "guard": 3, "dog": 1 },
  "itemDensity": 0.5
}`);
  process.exit(0);
}

const configPath = args[0];
const outputPath = args[1];

const configJson = readFileSync(configPath, 'utf-8');
const config: LevelConfig = JSON.parse(configJson);

console.error(`Generating level (style=${config.style}, seed=${config.seed ?? 'random'})...`);
const level = generateLevel(config);

const output = JSON.stringify(level, null, 2);

if (outputPath) {
  writeFileSync(outputPath, output);
  console.error(`Written to ${outputPath}`);
} else {
  console.log(output);
}

const enemies = level.entities.filter(e => e.type !== 'item');
const items = level.entities.filter(e => e.type === 'item');
console.error(`Stats: ${enemies.length} enemies, ${items.length} items, ${level.doors.length} doors`);

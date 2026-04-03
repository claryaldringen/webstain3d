// Re-export LevelGenerator for server use
// Direct cross-package .js imports don't resolve with tsx,
// so we use a .ts import from within the server package.
export { generateLevel } from '../../src/map/LevelGenerator.ts';
export type { LevelConfig } from '../../src/map/types.ts';

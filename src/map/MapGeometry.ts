/**
 * MapGeometry helper — thin re-export of geometry-building functionality.
 *
 * The primary buildGeometry logic lives in GameMap.buildGeometry().
 * This module provides a standalone helper for building a single wall quad,
 * which can be used by other systems (e.g. pushwalls, dynamic geometry).
 */

import * as THREE from 'three';
import { TILE_SIZE, WALL_HEIGHT } from '../core/constants.js';

export type FaceDirection = 'north' | 'south' | 'east' | 'west';

export interface WallQuad {
  positions: number[];
  uvs: number[];
  indices: number[];
}

/**
 * Build vertex data for a single wall face at a given tile coordinate.
 * @param x Tile x coordinate
 * @param y Tile y coordinate
 * @param face Which face of the tile to build
 * @param baseIndex Starting vertex index for index buffer offsets
 */
export function buildWallQuad(
  x: number,
  y: number,
  face: FaceDirection,
  baseIndex: number,
): WallQuad {
  const wx = x * TILE_SIZE;
  const wy = y * TILE_SIZE;

  let verts: [number, number, number][];
  if (face === 'north') {
    const z = wy + TILE_SIZE;
    verts = [
      [wx, 0, z], [wx + TILE_SIZE, 0, z],
      [wx + TILE_SIZE, WALL_HEIGHT, z], [wx, WALL_HEIGHT, z],
    ];
  } else if (face === 'south') {
    const z = wy;
    verts = [
      [wx + TILE_SIZE, 0, z], [wx, 0, z],
      [wx, WALL_HEIGHT, z], [wx + TILE_SIZE, WALL_HEIGHT, z],
    ];
  } else if (face === 'east') {
    const xp = wx + TILE_SIZE;
    verts = [
      [xp, 0, wy + TILE_SIZE], [xp, 0, wy],
      [xp, WALL_HEIGHT, wy], [xp, WALL_HEIGHT, wy + TILE_SIZE],
    ];
  } else {
    // west
    verts = [
      [wx, 0, wy], [wx, 0, wy + TILE_SIZE],
      [wx, WALL_HEIGHT, wy + TILE_SIZE], [wx, WALL_HEIGHT, wy],
    ];
  }

  const positions: number[] = [];
  for (const v of verts) positions.push(...v);

  const uvs = [0, 0, 1, 0, 1, 1, 0, 1];

  const indices = [
    baseIndex, baseIndex + 1, baseIndex + 2,
    baseIndex, baseIndex + 2, baseIndex + 3,
  ];

  return { positions, uvs, indices };
}

/**
 * Create a Three.js BufferGeometry from an array of WallQuads.
 */
export function createWallGeometry(quads: WallQuad[]): THREE.BufferGeometry {
  const allPositions: number[] = [];
  const allUvs: number[] = [];
  const allIndices: number[] = [];

  for (const q of quads) {
    allPositions.push(...q.positions);
    allUvs.push(...q.uvs);
    allIndices.push(...q.indices);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2));
  geometry.setIndex(allIndices);
  geometry.computeVertexNormals();
  return geometry;
}

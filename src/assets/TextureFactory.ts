import { VSwapLoader } from './VSwapLoader.js';
import { generateProceduralWallTextures } from './WallTextures.js';
import { TEXTURE_SIZE } from '../core/constants.js';
import { assetUrl } from '../core/assetUrl.js';

// Wall texture mapping: wallId -> [darkVswapIdx, lightVswapIdx]
// Structural (plain) textures: IDs 1-10
// Decorative (accent) textures: IDs 51-60
const WALL_MAP: Record<number, [number, number]> = {
  // Structural walls
  1: [0, 1],     // gray stone
  2: [16, 17],   // red brick
  3: [8, 9],     // blue stone
  4: [12, 13],   // wood paneling
  5: [24, 25],   // purple stone
  6: [22, 23],   // red brick variant
  7: [14, 15],   // metal door frame
  8: [46, 47],   // gray stone variant
  9: [48, 49],   // stone with cross
  10: [44, 45],  // brown stone

  // Decorative walls (used sparingly as accents)
  51: [2, 3],    // Nazi banner on gray stone
  52: [6, 7],    // Hitler portrait on gray
  53: [18, 19],  // Nazi eagle on red brick
  54: [10, 11],  // Nazi eagle emblem on red
  55: [34, 35],  // eagle on purple stone
  56: [20, 21],  // swastika medallion on red brick
  57: [4, 5],    // cell door / dungeon
  58: [26, 27],  // metal/achtung sign
  59: [36, 37],  // iron cross on wood
  60: [50, 51],  // gray variant with emblem
};

function pixelsToCanvas(pixels: Uint8ClampedArray, size: number = TEXTURE_SIZE): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(size, size);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export class TextureFactory {
  private vswap: VSwapLoader | null;

  constructor(vswap: VSwapLoader | null) {
    this.vswap = vswap;
  }

  async generateAll(): Promise<Map<number, HTMLCanvasElement>> {
    if (this.vswap) {
      try {
        const textures = new Map<number, HTMLCanvasElement>();

        for (const [wallIdStr, [darkIdx, lightIdx]] of Object.entries(WALL_MAP)) {
          const wallId = Number(wallIdStr);
          const lightPixels = this.vswap.getWallTexture(lightIdx);
          const darkPixels = this.vswap.getWallTexture(darkIdx);

          if (lightPixels) {
            textures.set(wallId, pixelsToCanvas(lightPixels));
          }
          if (darkPixels) {
            textures.set(-wallId, pixelsToCanvas(darkPixels));
          }
        }

        if (textures.size > 0) return textures;
        console.warn('VSWAP textures extracted but empty, falling back to procedural');
      } catch (e) {
        console.warn('Failed to extract VSWAP textures, falling back to procedural:', e);
      }
    }

    return generateProceduralWallTextures();
  }

  getSpriteCanvas(spriteIndex: number): HTMLCanvasElement | null {
    if (!this.vswap) return null;
    const pixels = this.vswap.getSpriteTexture(spriteIndex);
    if (!pixels) return null;
    return pixelsToCanvas(pixels);
  }
}

export async function generateWallTextures(): Promise<Map<number, HTMLCanvasElement>> {
  try {
    const loader = new VSwapLoader();
    await loader.load(assetUrl('assets/VSWAP.WL1'), assetUrl('assets/palette.json'));
    const factory = new TextureFactory(loader);
    return factory.generateAll();
  } catch (e) {
    console.warn('Failed to load VSWAP textures, falling back to procedural:', e);
  }
  return generateProceduralWallTextures();
}

import { VSwapLoader } from './VSwapLoader.js';
import { generateProceduralWallTextures } from './WallTextures.js';
import { TEXTURE_SIZE } from '../core/constants.js';
import { assetUrl } from '../core/assetUrl.js';

// Wall texture mapping: wallId -> [darkVswapIdx, lightVswapIdx]
// VSWAP convention: even index = light face, odd index = dark face
// Structural (plain) textures: IDs 1-10
// Decorative (accent) textures: IDs 51-60
const WALL_MAP: Record<number, [number, number]> = {
  // Structural walls (plain textures for room fill)
  1: [1, 0],     // gray stone
  2: [3, 2],     // gray stone alt
  3: [15, 14],   // blue stone
  4: [17, 16],   // blue stone alt
  5: [23, 22],   // wood paneling
  6: [33, 32],   // red brick
  7: [37, 36],   // purple stone
  8: [53, 52],   // gray brick
  9: [29, 28],   // teal metal plate
  10: [25, 24],  // metal/industrial

  // Decorative walls (used sparingly as accents)
  51: [5, 4],    // Nazi flag on gray stone
  52: [7, 6],    // Hitler portrait on gray
  53: [9, 8],    // jail cell bars
  54: [11, 10],  // arch with swastika emblem
  55: [13, 12],  // jail cell with skeleton
  56: [19, 18],  // eagle emblem in frame
  57: [21, 20],  // Hitler portrait in gold frame
  58: [27, 26],  // Verboten/Achtung sign
  59: [35, 34],  // swastika medallion on red brick
  60: [39, 38],  // eagle on purple stone
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

// VSWAP.WL1 loader — extracts wall textures and sprites from Wolf3D data files
// Format: https://vpoupet.github.io/wolfenstein/docs/files.html

export interface VSwapHeader {
  numChunks: number;
  numWalls: number;
  numSprites: number;
  numSounds: number;
}

export type Palette = [number, number, number][];

export function parseVSwapHeader(view: DataView): VSwapHeader {
  const numChunks = view.getUint16(0, true);
  const spriteStart = view.getUint16(2, true);
  const soundStart = view.getUint16(4, true);
  return {
    numChunks,
    numWalls: spriteStart,
    numSprites: soundStart - spriteStart,
    numSounds: numChunks - soundStart,
  };
}

export function extractWallPixels(data: Uint8Array, palette: Palette): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(64 * 64 * 4);
  for (let col = 0; col < 64; col++) {
    for (let row = 0; row < 64; row++) {
      const paletteIndex = data[col * 64 + row];
      const color = palette[paletteIndex!];
      if (!color) continue;
      const offset = (row * 64 + col) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

export function extractSpritePixels(data: Uint8Array, palette: Palette): Uint8ClampedArray | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const firstCol = view.getUint16(0, true);
  const lastCol = view.getUint16(2, true);

  if (firstCol > 63 || lastCol > 63 || firstCol > lastCol) return null;

  const numCols = lastCol - firstCol + 1;
  const colOffsets: number[] = [];
  for (let i = 0; i < numCols; i++) {
    colOffsets.push(view.getUint16(4 + i * 2, true));
  }

  const pixels = new Uint8ClampedArray(64 * 64 * 4);

  for (let i = 0; i < numCols; i++) {
    const col = firstCol + i;
    if (col >= 64) break;
    let off = colOffsets[i]!;

    let safety = 100;
    while (safety-- > 0) {
      if (off + 6 > data.byteLength) break;
      const endRow2 = view.getUint16(off, true);
      if (endRow2 === 0) break;

      const end = endRow2 / 2;
      const srcOff = view.getInt16(off + 2, true); // signed!
      const start = view.getUint16(off + 4, true) / 2;
      off += 6;

      let pixOff = srcOff + start;
      if (pixOff < 0 || pixOff >= data.byteLength) continue;

      for (let row = start; row < end; row++) {
        if (row >= 64 || pixOff >= data.byteLength) break;
        const paletteIndex = data[pixOff++]!;
        const color = palette[paletteIndex];
        if (!color) continue;
        const p = (row * 64 + col) * 4;
        pixels[p] = color[0];
        pixels[p + 1] = color[1];
        pixels[p + 2] = color[2];
        pixels[p + 3] = 255;
      }
    }
  }

  return pixels;
}

export class VSwapLoader {
  private chunks: (Uint8Array | null)[] = [];
  private palette: Palette = [];
  numWalls = 0;
  numSprites = 0;
  numSounds = 0;

  async load(vswapUrl: string, paletteUrl: string): Promise<void> {
    const [vswapBuf, paletteData] = await Promise.all([
      fetch(vswapUrl).then(r => r.arrayBuffer()),
      fetch(paletteUrl).then(r => r.json() as Promise<Palette>),
    ]);
    this.palette = paletteData;
    this.parse(vswapBuf);
  }

  private parse(buffer: ArrayBuffer): void {
    const view = new DataView(buffer);
    const header = parseVSwapHeader(view);
    this.numWalls = header.numWalls;
    this.numSprites = header.numSprites;
    this.numSounds = header.numSounds;

    const offsets: number[] = [];
    const lengths: number[] = [];
    let pos = 6;
    for (let i = 0; i < header.numChunks; i++) {
      offsets.push(view.getUint32(pos, true));
      pos += 4;
    }
    for (let i = 0; i < header.numChunks; i++) {
      lengths.push(view.getUint16(pos, true));
      pos += 2;
    }

    this.chunks = [];
    for (let i = 0; i < header.numChunks; i++) {
      if (offsets[i] === 0 && lengths[i] === 0) {
        this.chunks.push(null);
      } else {
        this.chunks.push(new Uint8Array(buffer, offsets[i]!, lengths[i]!));
      }
    }
  }

  getWallTexture(index: number): Uint8ClampedArray | null {
    if (index < 0 || index >= this.numWalls) return null;
    const chunk = this.chunks[index];
    if (!chunk) return null;
    return extractWallPixels(chunk, this.palette);
  }

  getSpriteTexture(index: number): Uint8ClampedArray | null {
    if (index < 0 || index >= this.numSprites) return null;
    const chunkIndex = this.numWalls + index;
    const chunk = this.chunks[chunkIndex];
    if (!chunk) return null;
    return extractSpritePixels(chunk, this.palette);
  }
}

import { describe, it, expect } from 'vitest';
import { parseVSwapHeader, extractWallPixels, extractSpritePixels } from '../../src/assets/VSwapLoader.js';

describe('VSwapLoader', () => {
  describe('parseVSwapHeader', () => {
    it('parses chunk counts from header', () => {
      // Simulated header: numChunks=663, spriteStart=106, soundStart=542
      const buf = new ArrayBuffer(6);
      const view = new DataView(buf);
      view.setUint16(0, 663, true);
      view.setUint16(2, 106, true);
      view.setUint16(4, 542, true);

      const header = parseVSwapHeader(view);
      expect(header.numChunks).toBe(663);
      expect(header.numWalls).toBe(106);
      expect(header.numSprites).toBe(436);
      expect(header.numSounds).toBe(121);
    });
  });

  describe('extractWallPixels', () => {
    it('extracts 64x64 wall from column-first data', () => {
      // Create 4096-byte chunk (64x64), all palette index 5
      const data = new Uint8Array(4096).fill(5);
      const palette: [number, number, number][] = Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]);
      palette[5] = [255, 0, 0];

      const pixels = extractWallPixels(data, palette);
      // First pixel (col 0, row 0): red
      expect(pixels[0]).toBe(255);
      expect(pixels[1]).toBe(0);
      expect(pixels[2]).toBe(0);
      expect(pixels[3]).toBe(255);
    });
  });

  describe('extractSpritePixels', () => {
    it('returns null for invalid sprite header', () => {
      // firstCol > lastCol
      const data = new Uint8Array([10, 0, 5, 0]); // firstCol=10, lastCol=5
      const palette: [number, number, number][] = [];
      const result = extractSpritePixels(data, palette);
      expect(result).toBeNull();
    });

    it('extracts pixels with signed int16 srcOff', () => {
      // Build a minimal 1-column sprite: firstCol=0, lastCol=0
      // Column offset table: 1 entry pointing to post data
      // Post: endRow*2=4, srcOff (signed), startRow*2=0
      // Pixel data: 1 byte at calculated offset
      const buf = new ArrayBuffer(20);
      const view = new DataView(buf);
      view.setUint16(0, 0, true);  // firstCol = 0
      view.setUint16(2, 0, true);  // lastCol = 0
      view.setUint16(4, 10, true); // colOffset[0] = 10 (post starts at byte 10)
      // Pixel data at byte 6
      const data = new Uint8Array(buf);
      data[6] = 42; // palette index at position 6
      data[7] = 43; // palette index at position 7
      // Post at byte 10: endRow*2=4, srcOff=6, startRow*2=0
      view.setUint16(10, 4, true);  // endRow*2 = 4 → endRow = 2
      view.setInt16(12, 6, true);   // srcOff = 6 (signed)
      view.setUint16(14, 0, true);  // startRow*2 = 0 → startRow = 0
      // Terminator
      view.setUint16(16, 0, true);

      const palette: [number, number, number][] = Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]);
      palette[42] = [100, 200, 50];
      palette[43] = [10, 20, 30];

      const result = extractSpritePixels(new Uint8Array(buf), palette);
      expect(result).not.toBeNull();
      // Pixel at (col=0, row=0): palette[42] = [100, 200, 50]
      const px0 = (0 * 64 + 0) * 4;
      expect(result![px0]).toBe(100);
      expect(result![px0 + 1]).toBe(200);
      expect(result![px0 + 2]).toBe(50);
      expect(result![px0 + 3]).toBe(255);
    });
  });
});

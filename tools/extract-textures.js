#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { WOLF3D_PALETTE, vgaToRgb } from './wolf3d-palette.js';

const [,, vswapPath, outDir] = process.argv;
if (!vswapPath || !outDir) {
    console.error('Usage: node extract-textures.js <VSWAP.WL1> <output-dir>');
    process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const buf = readFileSync(vswapPath);
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

const chunkCount = view.getUint16(0, true);
const spriteStart = view.getUint16(2, true);
const soundStart = view.getUint16(4, true);

console.log(`Chunks: ${chunkCount}, Sprites start: ${spriteStart}, Sounds start: ${soundStart}`);

const offsets = [];
const sizes = [];
for (let i = 0; i < chunkCount; i++) {
    offsets.push(view.getUint32(6 + i * 4, true));
    sizes.push(view.getUint16(6 + chunkCount * 4 + i * 2, true));
}

for (let i = 0; i < spriteStart; i++) {
    const offset = offsets[i];
    const size = sizes[i];
    if (offset === 0 || size === 0) continue;

    const pixels = buf.slice(offset, offset + 4096);
    if (pixels.length < 4096) continue;

    const width = 64, height = 64;
    const rgbData = Buffer.alloc(width * height * 3);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const colorIndex = pixels[x * 64 + y];
            const [vr, vg, vb] = WOLF3D_PALETTE[colorIndex] || [0, 0, 0];
            const [r, g, b] = vgaToRgb(vr, vg, vb);
            const idx = (y * width + x) * 3;
            rgbData[idx] = r;
            rgbData[idx + 1] = g;
            rgbData[idx + 2] = b;
        }
    }

    const filename = `wall_${String(i + 1).padStart(3, '0')}.ppm`;
    const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
    writeFileSync(join(outDir, filename), Buffer.concat([header, rgbData]));
    console.log(`Extracted ${filename}`);
}

console.log(`\nDone! Convert to PNG with: mogrify -format png ${outDir}/*.ppm && rm ${outDir}/*.ppm`);

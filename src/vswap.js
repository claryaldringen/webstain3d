// VSWAP.WL1 loader — extracts wall textures and sprites from Wolf3D data files
// Format: https://vpoupet.github.io/wolfenstein/docs/files.html

export class VSwapLoader {
    constructor() {
        this.chunks = [];
        this.palette = [];
        this.numWalls = 0;
        this.numSprites = 0;
        this.numSounds = 0;
    }

    async load(vswapUrl, paletteUrl) {
        const [vswapBuf, paletteData] = await Promise.all([
            fetch(vswapUrl).then(r => r.arrayBuffer()),
            fetch(paletteUrl).then(r => r.json())
        ]);

        this.palette = paletteData;
        this._parse(vswapBuf);
    }

    _parse(buffer) {
        const view = new DataView(buffer);
        const numChunks = view.getUint16(0, true);
        const spriteStart = view.getUint16(2, true);
        const soundStart = view.getUint16(4, true);

        this.numWalls = spriteStart;
        this.numSprites = soundStart - spriteStart;
        this.numSounds = numChunks - soundStart;

        // Read offsets (uint32) and lengths (uint16)
        const offsets = [];
        const lengths = [];
        let pos = 6;
        for (let i = 0; i < numChunks; i++) {
            offsets.push(view.getUint32(pos, true));
            pos += 4;
        }
        for (let i = 0; i < numChunks; i++) {
            lengths.push(view.getUint16(pos, true));
            pos += 2;
        }

        this.chunks = [];
        for (let i = 0; i < numChunks; i++) {
            if (offsets[i] === 0 && lengths[i] === 0) {
                this.chunks.push(null);
            } else {
                this.chunks.push(new Uint8Array(buffer, offsets[i], lengths[i]));
            }
        }
    }

    // Extract a 64x64 wall texture as a canvas element
    // Walls are stored column-first: 64 columns of 64 pixels each
    getWallTexture(index) {
        if (index < 0 || index >= this.numWalls || !this.chunks[index]) return null;

        const data = this.chunks[index];
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(64, 64);

        for (let col = 0; col < 64; col++) {
            for (let row = 0; row < 64; row++) {
                const paletteIndex = data[col * 64 + row];
                const [r, g, b] = this.palette[paletteIndex];
                const pixelOffset = (row * 64 + col) * 4;
                img.data[pixelOffset] = r;
                img.data[pixelOffset + 1] = g;
                img.data[pixelOffset + 2] = b;
                img.data[pixelOffset + 3] = 255;
            }
        }

        ctx.putImageData(img, 0, 0);
        return c;
    }

    // Extract a sprite as a canvas element (variable width, with transparency)
    // Format: [firstCol:u16, lastCol:u16, colOffsets:u16[], pixel pool, posts...]
    // Posts: [endRow*2:u16, srcOff:u16, startRow*2:u16] terminated by endRow*2 == 0
    // srcOff is pre-adjusted: actual pixel offset = srcOff + startRow (absolute from chunk start)
    getSpriteTexture(index) {
        if (index < 0 || index >= this.numSprites) return null;
        const chunkIndex = this.numWalls + index;
        const chunk = this.chunks[chunkIndex];
        if (!chunk) return null;

        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        const img = ctx.createImageData(64, 64);
        // Start fully transparent
        for (let i = 3; i < img.data.length; i += 4) img.data[i] = 0;

        const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        const firstCol = view.getUint16(0, true);
        const lastCol = view.getUint16(2, true);

        // Validate
        if (firstCol > 63 || lastCol > 63 || firstCol > lastCol) return c;

        const numCols = lastCol - firstCol + 1;
        const colOffsets = [];
        for (let i = 0; i < numCols; i++) {
            colOffsets.push(view.getUint16(4 + i * 2, true));
        }

        // Pixel pool starts after header + column offset table
        const pixelPoolStart = 4 + numCols * 2;

        for (let i = 0; i < numCols; i++) {
            const col = firstCol + i;
            if (col >= 64) break;
            let off = colOffsets[i];

            // Safety: prevent infinite loops
            let safety = 100;
            while (safety-- > 0) {
                if (off + 6 > chunk.byteLength) break;
                const endRow2 = view.getUint16(off, true);
                if (endRow2 === 0) break;

                const end = endRow2 / 2;
                const srcOff = view.getInt16(off + 2, true);
                const start = view.getUint16(off + 4, true) / 2;
                off += 6;

                // srcOff + start = absolute byte offset from chunk start
                let pixOff = srcOff + start;
                if (pixOff >= chunk.byteLength) continue;

                for (let row = start; row < end; row++) {
                    if (row >= 64 || pixOff >= chunk.byteLength) break;
                    const paletteIndex = chunk[pixOff++];
                    const [r, g, b] = this.palette[paletteIndex] || [0, 0, 0];
                    const p = (row * 64 + col) * 4;
                    img.data[p] = r;
                    img.data[p + 1] = g;
                    img.data[p + 2] = b;
                    img.data[p + 3] = 255;
                }
            }
        }

        ctx.putImageData(img, 0, 0);
        return c;
    }

    // Get all wall textures as a Map (1-indexed to match our level format)
    getAllWallTextures() {
        const textures = new Map();
        for (let i = 0; i < this.numWalls; i++) {
            const canvas = this.getWallTexture(i);
            if (canvas) {
                // Wolf3D wall textures come in pairs: even=dark (E/W), odd=light (N/S)
                // We store by pair index (1-based) matching our level wall IDs
                textures.set(i, canvas);
            }
        }
        return textures;
    }
}

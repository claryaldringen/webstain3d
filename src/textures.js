// Procedural texture generator — pixel-art Wolf3D style, all work done per-pixel

export async function generateWallTextures() {
    try {
        const { VSwapLoader } = await import('./vswap.js');
        const loader = new VSwapLoader();
        await loader.load('assets/VSWAP.WL1', 'assets/palette.json');

        // Map our wall IDs to VSWAP texture pairs [dark, light]
        const WALL_MAP = {
            1: [16, 17],   // Blue stone (solid blue blocks)
            2: [20, 21],   // Wood panel (brown)
            3: [0, 1],     // Gray stone (main gray blocks)
            4: [32, 33],   // Red brick
            5: [34, 35],   // Nazi flag (red with swastika)
            6: [4, 5],     // Nazi eagle (eagle on gray)
            7: [18, 19],   // Nazi portrait (gold frame)
        };

        const textures = new Map();
        for (const [wallId, [darkIdx, lightIdx]] of Object.entries(WALL_MAP)) {
            const lightCanvas = loader.getWallTexture(lightIdx);
            const darkCanvas = loader.getWallTexture(darkIdx);
            if (lightCanvas) {
                textures.set(Number(wallId), lightCanvas);
            }
            // Store dark (E/W) variants with negative key
            if (darkCanvas) {
                textures.set(-Number(wallId), darkCanvas);
            }
        }

        // Also store the loader for potential sprite use later
        window._vswapLoader = loader;

        // If we got at least some textures, return them
        if (textures.size > 0) return textures;

        // Fall through to procedural if nothing extracted
        console.warn('VSWAP textures extracted but empty, falling back to procedural');
    } catch (e) {
        console.warn('Failed to load VSWAP textures, falling back to procedural:', e);
    }
    return generateProceduralWallTextures();
}

export function generateProceduralWallTextures() {
    const textures = new Map();
    textures.set(1, blueStoneWall());
    textures.set(2, woodPanelWall());
    textures.set(3, grayBrickWall());
    textures.set(4, redBrickWall());
    textures.set(5, naziFlagWall());
    textures.set(6, naziEagleWall());
    textures.set(7, naziPortraitWall());
    return textures;
}

// ───── helpers ─────

function createCanvas(w = 64, h = 64) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

function getPixels(ctx, w = 64, h = 64) {
    return ctx.getImageData(0, 0, w, h);
}
function putPixels(ctx, img) {
    ctx.putImageData(img, 0, 0);
}

function setPixel(img, x, y, r, g, b, w = 64, h = 64) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
}

function setPixelA(img, x, y, r, g, b, a, w = 64, h = 64) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = a;
}

function getPixel(img, x, y, w = 64) {
    const i = (y * w + x) * 4;
    return [img.data[i], img.data[i+1], img.data[i+2]];
}

function fill(img, r, g, b, w = 64, h = 64) {
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            setPixel(img, x, y, r, g, b, w, h);
}

function fillRect(img, x0, y0, rw, rh, r, g, b, w = 64, h = 64) {
    for (let y = y0; y < y0 + rh; y++)
        for (let x = x0; x < x0 + rw; x++)
            setPixel(img, x, y, r, g, b, w, h);
}

function noise(img, intensity, w = 64, h = 64) {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const [r, g, b] = getPixel(img, x, y, w);
            const n = ((Math.random() - 0.5) * intensity) | 0;
            setPixel(img, x, y,
                clamp(r + n), clamp(g + n), clamp(b + n), w, h);
        }
    }
}

function clamp(v) { return Math.max(0, Math.min(255, v)); }

// ───── Wall type 1: Blue-gray stone (iconic Wolf3D outer wall) ─────

function blueStoneWall() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = getPixels(ctx);

    // Mortar/grout base — dark gray
    fill(img, 36, 38, 42);

    // Staggered 16x8 block pattern (like reference screenshots)
    const bw = 16, bh = 8;
    for (let row = 0; row < 8; row++) {
        const by = row * bh;
        const offset = (row % 2) * (bw / 2);

        for (let col = -1; col < 5; col++) {
            const bx = col * bw + offset;
            const shade = ((Math.random() * 16) - 8) | 0;
            // Dark gray with very subtle cool tint — NOT blue/purple
            const br = clamp(80 + shade);
            const bg = clamp(82 + shade);
            const bb = clamp(92 + shade);

            // Fill block interior
            for (let y = by + 1; y < by + bh - 1; y++) {
                for (let x = bx + 1; x < bx + bw - 1; x++) {
                    const px = ((x % 64) + 64) % 64;
                    const py = ((y % 64) + 64) % 64;
                    // Subtle surface variation
                    const sv = ((Math.random() - 0.5) * 6) | 0;
                    setPixel(img, px, py, clamp(br + sv), clamp(bg + sv), clamp(bb + sv));
                }
            }

            // Top highlight (strong)
            for (let x = bx + 1; x < bx + bw - 1; x++) {
                const px = ((x % 64) + 64) % 64;
                setPixel(img, px, ((by + 1) % 64 + 64) % 64, clamp(br + 30), clamp(bg + 30), clamp(bb + 30));
                setPixel(img, px, ((by + 2) % 64 + 64) % 64, clamp(br + 18), clamp(bg + 18), clamp(bb + 18));
            }
            // Left highlight
            for (let y = by + 1; y < by + bh - 1; y++) {
                const py = ((y % 64) + 64) % 64;
                setPixel(img, ((bx + 1) % 64 + 64) % 64, py, clamp(br + 24), clamp(bg + 24), clamp(bb + 24));
            }

            // Bottom shadow (strong)
            for (let x = bx + 1; x < bx + bw; x++) {
                const px = ((x % 64) + 64) % 64;
                setPixel(img, px, ((by + bh - 1) % 64 + 64) % 64, clamp(br - 35), clamp(bg - 35), clamp(bb - 35));
                setPixel(img, px, ((by + bh - 2) % 64 + 64) % 64, clamp(br - 20), clamp(bg - 20), clamp(bb - 20));
            }
            // Right shadow
            for (let y = by + 1; y < by + bh; y++) {
                const py = ((y % 64) + 64) % 64;
                setPixel(img, ((bx + bw - 1) % 64 + 64) % 64, py, clamp(br - 30), clamp(bg - 30), clamp(bb - 30));
            }
        }
    }

    noise(img, 4);
    putPixels(ctx, img);
    return c;
}

// ───── Wall type 2: Wood panel ─────

function woodPanelWall() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = getPixels(ctx);

    // Warmer brown base
    fill(img, 132, 88, 38);

    // 4 planks, each 16px wide, with slight color variation
    const plankColors = [
        [132, 88, 38],
        [126, 82, 34],
        [138, 94, 42],
        [122, 80, 32]
    ];

    for (let plank = 0; plank < 4; plank++) {
        const px0 = plank * 16;
        const [pr, pg, pb] = plankColors[plank];
        for (let x = px0; x < px0 + 16; x++) {
            for (let y = 0; y < 64; y++) {
                // Wood grain: vertical sine waves unique per plank
                const grain = Math.sin(y * 0.35 + plank * 1.7) * 8
                    + Math.sin(y * 0.12 + x * 0.4) * 5;
                const v = grain | 0;
                setPixel(img, x, y, clamp(pr + v), clamp(pg + v * 0.65), clamp(pb + v * 0.25));
            }
        }

        // Plank division lines (dark groove on left, light highlight on right)
        if (plank > 0) {
            for (let y = 0; y < 64; y++) {
                setPixel(img, px0, y, 65, 42, 16);     // dark groove
                setPixel(img, px0 + 1, y, 155, 108, 52); // light highlight
            }
        }
    }

    // Horizontal trim lines (top, middle, bottom)
    for (const divY of [0, 1, 31, 32, 62, 63]) {
        for (let x = 0; x < 64; x++) {
            if (divY === 0 || divY === 31 || divY === 62)
                setPixel(img, x, divY, 60, 38, 12);
            else
                setPixel(img, x, divY, 155, 110, 55);
        }
    }

    // Outer edge bevels
    for (let y = 0; y < 64; y++) {
        setPixel(img, 0, y, 85, 55, 20);
        setPixel(img, 63, y, 85, 55, 20);
        setPixel(img, 1, y, 150, 105, 48);
        setPixel(img, 62, y, 60, 38, 14);
    }

    // Nail details (one near each corner of each plank section)
    for (let plank = 0; plank < 4; plank++) {
        const cx = plank * 16 + 8;
        for (const ny of [8, 40, 55]) {
            setPixel(img, cx, ny, 50, 50, 55);
            setPixel(img, cx + 1, ny, 80, 80, 85);
            setPixel(img, cx, ny + 1, 80, 80, 85);
            setPixel(img, cx + 1, ny + 1, 50, 50, 55);
        }
    }

    noise(img, 4);
    putPixels(ctx, img);
    return c;
}

// ───── Wall type 3: Gray stone block ─────

function grayBrickWall() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = getPixels(ctx);

    // Dark mortar background (warm gray — warmer than blue stone's cool tint)
    fill(img, 52, 48, 44);

    // Block layout: 8 rows of ~8px height, 16px wide blocks, staggered
    const blockW = 16;
    const blockH = 8;

    for (let row = 0; row < 8; row++) {
        const by = row * blockH;
        const offset = (row % 2) * (blockW / 2);

        for (let col = -1; col < 5; col++) {
            const bx = col * blockW + offset;

            // Per-block shade variation (warm gray, slightly brownish)
            const shade = ((Math.random() * 20) - 10) | 0;
            const baseR = clamp(110 + shade);
            const baseG = clamp(106 + shade);
            const baseB = clamp(98 + shade);

            // Fill block interior (inside mortar lines)
            for (let y = by + 1; y < by + blockH - 1; y++) {
                for (let x = bx + 1; x < bx + blockW - 1; x++) {
                    const px = ((x % 64) + 64) % 64;
                    const py = ((y % 64) + 64) % 64;
                    setPixel(img, px, py, baseR, baseG, baseB);
                }
            }

            // 3D bevel — top highlight (lighter)
            for (let x = bx + 1; x < bx + blockW - 1; x++) {
                const px = ((x % 64) + 64) % 64;
                const py = (((by + 1) % 64) + 64) % 64;
                setPixel(img, px, py, clamp(baseR + 32), clamp(baseG + 32), clamp(baseB + 30));
            }
            // Second row top highlight (subtler)
            for (let x = bx + 2; x < bx + blockW - 2; x++) {
                const px = ((x % 64) + 64) % 64;
                const py = (((by + 2) % 64) + 64) % 64;
                setPixel(img, px, py, clamp(baseR + 16), clamp(baseG + 16), clamp(baseB + 14));
            }

            // 3D bevel — left highlight
            for (let y = by + 1; y < by + blockH - 1; y++) {
                const px = (((bx + 1) % 64) + 64) % 64;
                const py = ((y % 64) + 64) % 64;
                setPixel(img, px, py, clamp(baseR + 28), clamp(baseG + 28), clamp(baseB + 26));
            }

            // 3D bevel — bottom shadow (darker)
            for (let x = bx + 1; x < bx + blockW; x++) {
                const px = ((x % 64) + 64) % 64;
                const py = (((by + blockH - 2) % 64) + 64) % 64;
                setPixel(img, px, py, clamp(baseR - 28), clamp(baseG - 28), clamp(baseB - 26));
            }

            // 3D bevel — right shadow
            for (let y = by + 1; y < by + blockH; y++) {
                const px = (((bx + blockW - 2) % 64) + 64) % 64;
                const py = ((y % 64) + 64) % 64;
                setPixel(img, px, py, clamp(baseR - 24), clamp(baseG - 24), clamp(baseB - 22));
            }

            // Mortar lines (horizontal) — already dark from fill, just reinforce
            for (let x = bx; x < bx + blockW; x++) {
                const px = ((x % 64) + 64) % 64;
                const py = ((by % 64) + 64) % 64;
                setPixel(img, px, py, 52, 48, 44);
            }
            // Mortar lines (vertical)
            for (let y = by; y < by + blockH; y++) {
                const px = ((bx % 64) + 64) % 64;
                const py = ((y % 64) + 64) % 64;
                setPixel(img, px, py, 52, 48, 44);
            }

            // Small surface imperfections (pitting)
            for (let k = 0; k < 4; k++) {
                const rx = bx + 2 + ((Math.random() * (blockW - 4)) | 0);
                const ry = by + 2 + ((Math.random() * (blockH - 4)) | 0);
                const px = ((rx % 64) + 64) % 64;
                const py = ((ry % 64) + 64) % 64;
                const pit = ((Math.random() * 16) - 8) | 0;
                setPixel(img, px, py, clamp(baseR + pit), clamp(baseG + pit), clamp(baseB + pit));
            }
        }
    }

    noise(img, 3);
    putPixels(ctx, img);
    return c;
}

// ───── Wall type 4: Red brick ─────

function redBrickWall() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = getPixels(ctx);

    fill(img, 140, 130, 110);

    const brickW = 16;
    const brickH = 8;

    for (let row = 0; row < 8; row++) {
        const by = row * brickH;
        const offset = (row % 2) * (brickW / 2);

        for (let col = -1; col < 5; col++) {
            const bx = col * brickW + offset;
            const shade = ((Math.random() * 30) - 15) | 0;
            const br = clamp(148 + shade);
            const bg = clamp(52 + shade * 0.4);
            const bb = clamp(42 + shade * 0.3);

            for (let y = by + 1; y < by + brickH - 1; y++) {
                for (let x = bx + 1; x < bx + brickW - 1; x++) {
                    const px = ((x % 64) + 64) % 64;
                    const py = ((y % 64) + 64) % 64;
                    const streak = ((Math.sin(y * 2.5 + x * 0.3) * 6) | 0);
                    setPixel(img, px, py, clamp(br + streak), clamp(bg + streak * 0.3), clamp(bb + streak * 0.2));
                }
            }

            for (let x = bx + 1; x < bx + brickW - 1; x++) {
                const px = ((x % 64) + 64) % 64;
                const py = (((by + 1) % 64) + 64) % 64;
                setPixel(img, px, py, clamp(br + 30), clamp(bg + 20), clamp(bb + 15));
            }
            for (let y = by + 1; y < by + brickH - 1; y++) {
                const px = (((bx + 1) % 64) + 64) % 64;
                const py = ((y % 64) + 64) % 64;
                setPixel(img, px, py, clamp(br + 22), clamp(bg + 15), clamp(bb + 10));
            }

            for (let x = bx + 1; x < bx + brickW; x++) {
                const px = ((x % 64) + 64) % 64;
                const py = (((by + brickH - 1) % 64) + 64) % 64;
                setPixel(img, px, py, clamp(br - 40), clamp(bg - 25), clamp(bb - 20));
            }
            for (let y = by + 1; y < by + brickH; y++) {
                const px = (((bx + brickW - 1) % 64) + 64) % 64;
                const py = ((y % 64) + 64) % 64;
                setPixel(img, px, py, clamp(br - 35), clamp(bg - 22), clamp(bb - 18));
            }

            for (let x = bx; x < bx + brickW; x++) {
                const px = ((x % 64) + 64) % 64;
                const py = ((by % 64) + 64) % 64;
                setPixel(img, px, py, 130, 120, 100);
            }
            for (let y = by; y < by + brickH; y++) {
                const px = ((bx % 64) + 64) % 64;
                const py = ((y % 64) + 64) % 64;
                setPixel(img, px, py, 130, 120, 100);
            }
        }
    }

    noise(img, 4);
    putPixels(ctx, img);
    return c;
}

// ───── Nazi-themed wall textures ─────

function naziFlagWall() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = getPixels(ctx);
    // Bright red background
    fill(img, 200, 24, 24);
    // White circle in center (radius ~18px, centered at 32,32)
    for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
            const dx = x - 32, dy = y - 32;
            if (dx * dx + dy * dy < 18 * 18) setPixel(img, x, y, 240, 240, 240);
        }
    }
    // Clean swastika (black) — central cross + 4 arm extensions
    const bk = (x, y, w, h) => fillRect(img, x, y, w, h, 20, 20, 20);
    // Central vertical bar
    bk(30, 19, 4, 26);
    // Central horizontal bar
    bk(19, 30, 26, 4);
    // Top-right arm: goes right from the top of the vertical
    bk(34, 19, 9, 4);
    // Bottom-left arm: goes left from the bottom of the vertical
    bk(19, 41, 15, 4);
    // Right-bottom arm: goes down from the right end of the horizontal
    bk(41, 30, 4, 15);
    // Left-top arm: goes up from the left end of the horizontal
    bk(19, 19, 4, 15);
    // Dark red border frame
    fillRect(img, 0, 0, 64, 3, 100, 8, 8);
    fillRect(img, 0, 61, 64, 3, 100, 8, 8);
    fillRect(img, 0, 0, 3, 64, 100, 8, 8);
    fillRect(img, 61, 0, 3, 64, 100, 8, 8);
    // Inner border highlight
    fillRect(img, 3, 3, 58, 1, 220, 40, 40);
    fillRect(img, 3, 60, 58, 1, 140, 12, 12);
    fillRect(img, 3, 3, 1, 58, 220, 40, 40);
    fillRect(img, 60, 3, 1, 58, 140, 12, 12);
    noise(img, 3);
    putPixels(ctx, img);
    return c;
}

function naziEagleWall() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = getPixels(ctx);
    // Dark gray stone base
    fill(img, 80, 80, 88);
    noise(img, 8);

    // Eagle body color (dark charcoal) and highlight
    const eD = (x, y, w, h) => fillRect(img, x, y, w, h, 28, 28, 32);
    const eL = (x, y, w, h) => fillRect(img, x, y, w, h, 48, 48, 56);

    // Head
    eD(30, 5, 4, 3);
    eD(29, 7, 6, 3);
    eL(30, 6, 4, 1);  // head highlight
    // Beak (pointing right)
    fillRect(img, 35, 8, 3, 2, 180, 160, 40);

    // Neck
    eD(30, 10, 4, 4);

    // Upper wings (wider spread, shaped)
    eD(22, 10, 20, 2);
    eD(18, 12, 28, 2);
    eD(12, 14, 40, 2);
    eD(8, 16, 48, 2);
    eD(4, 18, 56, 3);
    // Wing highlight on top edges
    eL(14, 14, 36, 1);
    eL(6, 18, 52, 1);

    // Wing tips angled down (feathered)
    eD(4, 21, 10, 3);
    eD(50, 21, 10, 3);
    eD(4, 24, 8, 3);
    eD(52, 24, 8, 3);
    eD(5, 27, 6, 2);
    eD(53, 27, 6, 2);
    eD(6, 29, 4, 2);
    eD(54, 29, 4, 2);
    // Feather details (individual lines)
    eL(4, 21, 1, 3);
    eL(50, 21, 1, 3);

    // Body (torso)
    eD(28, 21, 8, 14);
    eD(26, 24, 12, 8);
    eL(29, 22, 6, 1); // body highlight

    // Talons (legs gripping wreath)
    eD(24, 35, 4, 5);
    eD(36, 35, 4, 5);
    eD(22, 38, 4, 3);
    eD(38, 38, 4, 3);
    eD(20, 40, 3, 2);
    eD(41, 40, 3, 2);

    // Wreath circle below (brighter gold, thicker)
    for (let y = 42; y < 60; y++) {
        for (let x = 22; x < 42; x++) {
            const dx = x - 32, dy = y - 51;
            const dist2 = dx * dx + dy * dy;
            if (dist2 < 8 * 8 && dist2 > 5 * 5) {
                // Gold wreath with highlight variation
                const bright = (Math.sin(Math.atan2(dy, dx) * 8) * 20) | 0;
                setPixel(img, x, y, clamp(210 + bright), clamp(185 + bright), clamp(50 + bright));
            }
        }
    }
    // Laurel leaf details on wreath (small bright spots)
    const leaf = (x, y) => setPixel(img, x, y, 240, 220, 80);
    leaf(25, 45); leaf(24, 48); leaf(24, 52); leaf(25, 55);
    leaf(39, 45); leaf(40, 48); leaf(40, 52); leaf(39, 55);
    leaf(27, 43); leaf(37, 43);
    leaf(28, 58); leaf(36, 58);

    // Tiny swastika inside wreath (dark)
    const s = (x, y, w, h) => fillRect(img, x, y, w, h, 28, 28, 32);
    s(31, 48, 2, 7);   // vertical
    s(28, 50, 8, 2);   // horizontal
    s(28, 47, 2, 4);   // top-left arm down
    s(35, 51, 2, 4);   // bottom-right arm down
    s(31, 47, 5, 2);   // top-right arm
    s(28, 54, 5, 2);   // bottom-left arm

    putPixels(ctx, img);
    return c;
}

function naziPortraitWall() {
    const c = createCanvas(), ctx = c.getContext('2d');
    const img = getPixels(ctx);
    // Dark wood paneling background
    fill(img, 72, 48, 24);
    for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 64; y++) {
            const grain = Math.sin(y * 0.4 + x * 0.2) * 6;
            const [r,g,b] = getPixel(img, x, y);
            setPixel(img, x, y, clamp(r+grain), clamp(g+grain*0.6), clamp(b+grain*0.3));
        }
    }
    // Red banner hanging on wall
    fillRect(img, 16, 4, 32, 52, 180, 20, 20);
    fillRect(img, 18, 6, 28, 48, 200, 28, 28);
    // White circle
    for (let y = 14; y < 44; y++) {
        for (let x = 20; x < 44; x++) {
            const dx = x-32, dy = y-29;
            if (dx*dx+dy*dy < 12*12) setPixel(img, x, y, 240, 240, 240);
        }
    }
    // Swastika
    const sw = (x,y,w,h) => fillRect(img, x,y,w,h, 24,24,24);
    sw(31,21,2,16); sw(24,28,16,2);
    sw(24,24,2,6); sw(38,28,2,6);
    sw(31,21,7,2); sw(26,35,7,2);
    // Banner pole
    fillRect(img, 14, 2, 36, 3, 160, 140, 40);
    fillRect(img, 15, 3, 34, 1, 200, 180, 60);
    // Banner fringe
    for (let x = 18; x < 46; x += 2) {
        fillRect(img, x, 54, 1, 3, 180, 160, 40);
    }
    noise(img, 3);
    putPixels(ctx, img);
    return c;
}

// ───── Sprite placeholders — Wolf3D-faithful pixel art ─────
// 128x128 for characters, 64x64 for items

const P = {
    sk0: [232, 196, 164], sk1: [216, 176, 140], sk2: [196, 156, 120], sk3: [172, 132, 96],
    hr0: [216, 200, 148], hr1: [192, 176, 124], hr2: [168, 152, 104], hr3: [140, 124, 84],
    br0: [140, 100, 48], br1: [120, 84, 36], br2: [100, 68, 24], br3: [76, 52, 16], br4: [52, 36, 8],
    hm0: [108, 120, 92], hm1: [84, 96, 68], hm2: [64, 76, 52], hm3: [48, 56, 36],
    ss0: [168, 176, 192], ss1: [140, 152, 168], ss2: [116, 128, 148], ss3: [88, 100, 120],
    dk0: [56, 44, 32], dk1: [40, 28, 20], dk2: [24, 16, 8],
    mt0: [120, 120, 132], mt1: [88, 88, 100], mt2: [60, 60, 72], mt3: [36, 36, 44],
    gd0: [252, 232, 80], gd1: [216, 192, 48], gd2: [176, 148, 32],
    dg0: [160, 124, 56], dg1: [128, 92, 40], dg2: [100, 72, 28], dg3: [76, 52, 16], dg4: [52, 36, 8],
    wh: [248, 248, 240], bk: [8, 4, 0], rd: [200, 40, 20],
};

export function generateSpritePlaceholder(color, width, height, label) {
    const W = width, H = height;
    const c = createCanvas(W, H);
    const ctx = c.getContext('2d');
    const img = getPixels(ctx, W, H);

    for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
            setPixelA(img, x, y, 0, 0, 0, 0, W, H);

    const sp = (x, y, r, g, b) => setPixel(img, x, y, r, g, b, W, H);
    const sr = (x0, y0, w, h, r, g, b) => fillRect(img, x0, y0, w, h, r, g, b, W, H);

    if (label === 'guard') {
        drawGuard(sp, sr, W, H);
    } else if (label === 'ss') {
        drawSS(sp, sr, W, H);
    } else if (label === 'dog') {
        drawDog(sp, sr, W, H);
    } else if (label === 'lamp') {
        drawLamp(sp, sr, W, H);
    } else {
        drawItem(sp, sr, W, H, color);
    }

    putPixels(ctx, img);
    return c;
}

// Shared face drawing — 128x128 scale, reference: fair skin, short blond hair parted right,
// blue-green eyes, strong square jaw, straight nose, stern thin mouth
function drawFace(sp, sr, cx, topY) {
    const y0 = topY;

    // --- Short blond hair (parted to right, visible at sides and top under headgear shadow) ---
    sr(cx-12, y0, 24, 4, ...P.hr1);      // hair top
    sr(cx-14, y0+2, 28, 3, ...P.hr2);    // hair sides
    sr(cx-10, y0, 20, 2, ...P.hr0);      // highlight
    // Sideburns
    sr(cx-14, y0+5, 4, 10, ...P.hr2);
    sr(cx+10, y0+5, 4, 10, ...P.hr2);
    sr(cx-15, y0+6, 3, 8, ...P.hr3);
    sr(cx+12, y0+6, 3, 8, ...P.hr3);

    // --- Forehead ---
    sr(cx-12, y0+4, 24, 6, ...P.sk0);
    sr(cx-10, y0+4, 20, 3, 240, 208, 176);  // highlight

    // --- Brow ridge (strong, defined) ---
    sr(cx-11, y0+10, 22, 3, ...P.sk1);
    sr(cx-10, y0+10, 8, 2, ...P.sk2);    // left brow shadow
    sr(cx+2, y0+10, 8, 2, ...P.sk2);     // right brow shadow
    // Eyebrows (blond but visible)
    sr(cx-9, y0+10, 7, 2, ...P.hr3);
    sr(cx+2, y0+10, 7, 2, ...P.hr3);

    // --- Eyes (blue-green, detailed) ---
    const ey = y0+13;
    // Eye sockets shadow
    sr(cx-10, ey-1, 8, 6, ...P.sk1);
    sr(cx+2, ey-1, 8, 6, ...P.sk1);
    // Whites
    sr(cx-9, ey, 6, 4, 248, 248, 244);
    sr(cx+3, ey, 6, 4, 248, 248, 244);
    // Iris (blue-green)
    sr(cx-7, ey, 3, 4, 80, 140, 160);
    sr(cx+5, ey, 3, 4, 80, 140, 160);
    // Pupil
    sr(cx-6, ey+1, 2, 2, 16, 16, 20);
    sr(cx+5, ey+1, 2, 2, 16, 16, 20);
    // Eye highlight
    sp(cx-6, ey, 255, 255, 255);
    sp(cx+6, ey, 255, 255, 255);
    // Lower eyelid
    sr(cx-9, ey+4, 6, 1, ...P.sk2);
    sr(cx+3, ey+4, 6, 1, ...P.sk2);
    // Under-eye shadow
    sr(cx-8, ey+5, 5, 1, ...P.sk2);
    sr(cx+3, ey+5, 5, 1, ...P.sk2);

    // --- Cheeks ---
    sr(cx-12, y0+14, 24, 8, ...P.sk0);
    sr(cx-13, y0+16, 4, 4, ...P.sk1);    // left cheek shadow
    sr(cx+9, y0+16, 4, 4, ...P.sk1);     // right cheek shadow
    sr(cx-6, y0+16, 12, 4, 236, 200, 168); // cheek highlight

    // --- Nose (straight, slightly wide) ---
    sr(cx-2, y0+14, 4, 8, ...P.sk1);     // bridge
    sr(cx-1, y0+14, 2, 6, ...P.sk0);     // bridge highlight
    sr(cx-3, y0+20, 6, 3, ...P.sk2);     // nose ball
    sr(cx-2, y0+20, 4, 2, ...P.sk1);     // highlight
    // Nostrils
    sp(cx-3, y0+22, ...P.sk3);
    sp(cx+2, y0+22, ...P.sk3);
    // Nose shadow
    sr(cx-4, y0+23, 8, 1, ...P.sk2);

    // --- Mouth (thin, stern, tight-lipped) ---
    sr(cx-12, y0+24, 24, 6, ...P.sk0);
    // Upper lip line
    sr(cx-5, y0+26, 10, 1, 180, 130, 110);
    // Lip color
    sr(cx-4, y0+27, 8, 2, 200, 148, 124);
    // Lower lip highlight
    sr(cx-3, y0+28, 6, 1, 216, 168, 140);
    // Mouth corners (stern/slightly down)
    sp(cx-5, y0+27, ...P.sk2);
    sp(cx+4, y0+27, ...P.sk2);
    // Philtrum
    sr(cx-1, y0+24, 2, 2, ...P.sk1);

    // --- Chin (strong, square jawline) ---
    sr(cx-10, y0+30, 20, 3, ...P.sk0);
    sr(cx-8, y0+30, 16, 2, 228, 192, 160); // chin highlight
    // Chin cleft (subtle)
    sp(cx, y0+31, ...P.sk1);
    sp(cx, y0+32, ...P.sk2);

    // --- Jaw (wide, square — distinctive feature) ---
    sr(cx-14, y0+32, 28, 4, ...P.sk1);
    sr(cx-15, y0+30, 4, 4, ...P.sk2);     // left jaw angle
    sr(cx+11, y0+30, 4, 4, ...P.sk2);     // right jaw angle
    // Jaw shadow
    sr(cx-14, y0+36, 28, 2, ...P.sk3);
}

function drawGuard(sp, sr, W, H) {
    // 128x128 Wolf3D guard — Stahlhelm, brown uniform, Luger pistol
    const cx = W / 2;  // 64

    // === Stahlhelm (larger, darker steel gray) ===
    // Use darker steel gray colors for helmet
    const hd0 = [88, 96, 80];   // highlight
    const hd1 = [68, 76, 60];   // main
    const hd2 = [52, 60, 44];   // shadow
    const hd3 = [36, 40, 30];   // deep shadow
    sr(cx-16, 0, 32, 5, ...hd2);         // top crown
    sr(cx-20, 5, 40, 7, ...hd1);         // main dome
    sr(cx-24, 12, 48, 5, ...hd2);        // lower dome
    sr(cx-26, 17, 52, 5, ...hd3);        // brim (wider, thicker)
    // Highlight on dome
    sr(cx-12, 1, 20, 4, ...hd0);
    sr(cx-8, 0, 12, 2, ...hd0);
    // Brim shadow
    sr(cx-26, 21, 52, 2, ...hd3);
    // Side ventilation bumps
    sr(cx-24, 9, 5, 7, ...hd2);
    sr(cx+19, 9, 5, 7, ...hd2);

    // === Face (using shared detailed face, positioned below larger helmet) ===
    drawFace(sp, sr, cx, 22);

    // === Neck ===
    sr(cx-8, 58, 16, 4, ...P.sk2);
    sr(cx-6, 60, 12, 3, ...P.sk3);

    // === Collar ===
    sr(cx-12, 62, 24, 4, ...P.br0);
    sr(cx-10, 62, 20, 2, ...P.br0);      // collar edge (matches uniform brown)

    // === Shoulders + torso ===
    sr(cx-28, 66, 56, 6, ...P.br1);      // shoulders
    sr(cx-24, 72, 48, 24, ...P.br2);     // torso
    sr(cx-8, 68, 16, 20, ...P.br1);      // chest highlight
    // Epaulettes
    sr(cx-28, 66, 6, 4, ...P.br0);
    sr(cx+22, 66, 6, 4, ...P.br0);
    // Buttons
    for (let y = 70; y < 92; y += 5) {
        sr(cx-1, y, 3, 2, ...P.gd1);
    }
    // Chest pockets
    sr(cx-20, 74, 10, 8, ...P.br3);
    sr(cx+10, 74, 10, 8, ...P.br3);
    sr(cx-20, 74, 10, 2, ...P.br1);      // pocket flap highlight
    sr(cx+10, 74, 10, 2, ...P.br1);
    // Nazi eagle breast insignia
    sr(cx+12, 76, 6, 3, ...P.gd2);
    sr(cx+11, 77, 8, 1, ...P.gd2);

    // === Belt ===
    sr(cx-24, 94, 48, 5, ...P.dk0);
    sr(cx-24, 95, 48, 2, ...P.dk1);
    // Belt buckle (round, with eagle)
    sr(cx-4, 94, 8, 5, ...P.gd1);
    sr(cx-3, 95, 6, 3, ...P.gd0);

    // === Arms (with visible gap/shadow separating from torso) ===
    // Dark shadow strip between arm and torso for separation
    sr(cx-29, 67, 4, 28, 16, 12, 8);      // left arm-body gap shadow (wide, near-black)
    sr(cx+26, 67, 4, 28, 16, 12, 8);     // right arm-body gap shadow (wide, near-black)

    // Left arm — short sleeve then exposed skin
    sr(cx-36, 67, 8, 8, ...P.br2);       // left short sleeve
    sr(cx-38, 74, 6, 4, ...P.br3);       // left sleeve shadow/cuff
    sr(cx-36, 76, 8, 12, ...P.sk1);      // left exposed upper arm (skin)
    sr(cx-38, 78, 4, 10, ...P.sk2);      // left arm shadow (skin)
    sr(cx-34, 78, 3, 8, ...P.sk0);       // left arm highlight (muscle)
    sr(cx-38, 88, 8, 6, ...P.sk1);       // left hand
    sr(cx-36, 86, 4, 3, ...P.sk0);
    // Right arm — short sleeve then exposed skin
    sr(cx+28, 67, 8, 8, ...P.br2);       // right short sleeve
    sr(cx+32, 74, 6, 4, ...P.br3);       // right sleeve shadow/cuff
    sr(cx+28, 76, 8, 12, ...P.sk1);      // right exposed upper arm (skin)
    sr(cx+32, 78, 4, 10, ...P.sk2);      // right arm shadow (skin)
    sr(cx+32, 78, 3, 8, ...P.sk0);       // right arm highlight (muscle)
    sr(cx+30, 88, 8, 6, ...P.sk1);       // right hand
    sr(cx+32, 86, 4, 3, ...P.sk0);

    // === Luger pistol in right hand ===
    sr(cx+36, 78, 4, 14, ...P.mt1);
    sr(cx+37, 74, 3, 8, ...P.mt2);
    sr(cx+38, 70, 2, 6, ...P.mt3);
    sr(cx+36, 78, 2, 4, ...P.mt0);

    // === Legs ===
    sr(cx-18, 99, 13, 20, ...P.br3);     // left leg
    sr(cx+5, 99, 13, 20, ...P.br3);      // right leg
    sr(cx-3, 100, 6, 18, 36, 24, 8);     // gap shadow (wider, darker)
    sr(cx-14, 101, 6, 14, ...P.br2);     // left highlight
    sr(cx+9, 101, 6, 14, ...P.br2);

    // === Boots (blue, matching Wolf3D reference) ===
    sr(cx-20, 119, 16, 8, 40, 44, 120);
    sr(cx+4, 119, 16, 8, 40, 44, 120);
    sr(cx-18, 119, 4, 6, 60, 68, 160);   // boot shine
    sr(cx+6, 119, 4, 6, 60, 68, 160);
    sr(cx-20, 126, 16, 1, 24, 28, 80);   // soles
    sr(cx+4, 126, 16, 1, 24, 28, 80);
    // Boot straps
    sr(cx-20, 119, 16, 2, 50, 56, 140);
    sr(cx+4, 119, 16, 2, 50, 56, 140);
}

function drawSS(sp, sr, W, H) {
    // 128x128 SS officer — peaked cap, blue-gray uniform, MP40
    const cx = W / 2;

    // === Officer peaked cap ===
    sr(cx-16, 2, 32, 6, ...P.mt2);        // cap crown
    sr(cx-18, 8, 36, 4, ...P.mt2);        // cap body
    sr(cx-12, 3, 20, 3, ...P.mt1);        // highlight
    sr(cx-18, 10, 36, 2, 160, 24, 24);    // red band
    sr(cx-20, 12, 40, 4, ...P.mt3);       // visor
    sr(cx-22, 15, 44, 2, ...P.dk1);       // visor shadow
    // Skull (Totenkopf) on cap
    sr(cx-4, 4, 3, 3, ...P.wh); sr(cx+1, 4, 3, 3, ...P.wh);
    sr(cx-3, 6, 6, 2, ...P.wh);
    sp(cx-3, 5, ...P.bk); sp(cx+2, 5, ...P.bk);  // eye holes
    sr(cx-2, 8, 4, 1, ...P.wh);  // jaw

    // === Face ===
    drawFace(sp, sr, cx, 16);

    // === Neck ===
    sr(cx-8, 54, 16, 4, ...P.sk2);

    // === SS collar (with runes) ===
    sr(cx-12, 58, 24, 4, ...P.ss0);
    // SS collar tabs
    sr(cx-12, 58, 6, 3, ...P.rd);  // left tab
    sr(cx+6, 58, 6, 3, ...P.rd);   // right tab
    // SS runes (lightning bolts)
    sp(cx-10, 59, ...P.wh); sp(cx-9, 60, ...P.wh);
    sp(cx+8, 59, ...P.wh); sp(cx+9, 60, ...P.wh);

    // === Shoulders + torso (blue-gray) ===
    sr(cx-28, 62, 56, 6, ...P.ss1);
    sr(cx-24, 68, 48, 24, ...P.ss2);
    sr(cx-8, 64, 16, 20, ...P.ss1);       // chest highlight
    // Epaulettes with SS insignia
    sr(cx-28, 62, 6, 4, ...P.ss0);
    sr(cx+22, 62, 6, 4, ...P.ss0);
    // Buttons
    for (let y = 66; y < 88; y += 5) {
        sr(cx-1, y, 3, 2, ...P.mt0);
    }
    // Iron Cross 1st class on left chest
    sr(cx-18, 70, 2, 6, ...P.bk);
    sr(cx-20, 72, 6, 2, ...P.bk);
    // Chest pockets
    sr(cx-22, 74, 10, 8, ...P.ss3);
    sr(cx+12, 74, 10, 8, ...P.ss3);
    // Nazi eagle on right breast
    sr(cx+14, 68, 6, 2, ...P.gd2);
    sr(cx+13, 69, 8, 1, ...P.gd2);

    // === GREEN ammo pouches / magazine carriers on chest ===
    // Left pouch cluster (3 pouches side by side)
    sr(cx-22, 80, 4, 8, 40, 140, 40);   // left pouch
    sr(cx-17, 80, 4, 8, 48, 160, 48);   // center-left pouch
    sr(cx-12, 80, 4, 8, 40, 140, 40);   // center pouch
    // Right pouch cluster
    sr(cx+8, 80, 4, 8, 40, 140, 40);
    sr(cx+13, 80, 4, 8, 48, 160, 48);
    sr(cx+18, 80, 4, 8, 40, 140, 40);
    // Pouch flap tops (darker green)
    sr(cx-22, 80, 4, 2, 28, 100, 28);
    sr(cx-17, 80, 4, 2, 32, 110, 32);
    sr(cx-12, 80, 4, 2, 28, 100, 28);
    sr(cx+8, 80, 4, 2, 28, 100, 28);
    sr(cx+13, 80, 4, 2, 32, 110, 32);
    sr(cx+18, 80, 4, 2, 28, 100, 28);
    // Pouch highlights (bright green accent)
    sr(cx-21, 82, 2, 4, 60, 180, 60);
    sr(cx-16, 82, 2, 4, 68, 200, 68);
    sr(cx+9, 82, 2, 4, 60, 180, 60);
    sr(cx+14, 82, 2, 4, 68, 200, 68);
    // Pouch bottom shadow
    sr(cx-22, 87, 14, 1, 24, 80, 24);
    sr(cx+8, 87, 14, 1, 24, 80, 24);

    // === Belt with SS buckle ===
    sr(cx-24, 90, 48, 5, ...P.dk0);
    sr(cx-24, 91, 48, 2, ...P.dk1);
    sr(cx-4, 90, 8, 5, ...P.mt0);         // round buckle
    sr(cx-3, 91, 6, 3, ...P.mt1);

    // === Arms ===
    sr(cx-32, 63, 6, 22, ...P.ss2);
    sr(cx-34, 68, 4, 14, ...P.ss3);
    sr(cx-34, 82, 6, 6, ...P.sk1);
    sr(cx+26, 63, 6, 22, ...P.ss2);
    sr(cx+28, 68, 4, 14, ...P.ss3);
    sr(cx+28, 82, 6, 6, ...P.sk1);

    // === MP40 ===
    sr(cx+32, 72, 4, 16, ...P.mt1);
    sr(cx+33, 66, 3, 10, ...P.mt2);
    sr(cx+34, 62, 2, 6, ...P.mt3);
    sr(cx+36, 76, 3, 8, ...P.mt2);        // magazine

    // === Legs (dark) ===
    sr(cx-18, 95, 14, 20, ...P.mt3);
    sr(cx+4, 95, 14, 20, ...P.mt3);
    sr(cx-2, 96, 4, 18, ...P.dk2);
    sr(cx-14, 97, 6, 14, ...P.mt2);
    sr(cx+8, 97, 6, 14, ...P.mt2);

    // === Tall SS boots ===
    sr(cx-20, 112, 16, 14, ...P.dk1);
    sr(cx+4, 112, 16, 14, ...P.dk1);
    sr(cx-18, 112, 4, 12, ...P.dk0);
    sr(cx+6, 112, 4, 12, ...P.dk0);
    sr(cx-20, 125, 16, 2, ...P.dk2);
    sr(cx+4, 125, 16, 2, ...P.dk2);
}

function drawDog(sp, sr, W, H) {
    // 128x128 German Shepherd — side view, attacking, jaws open

    // === Ears (pointed) ===
    sr(84, 10, 8, 14, ...P.dg2);
    sr(86, 8, 6, 6, ...P.dg3);
    sr(86, 12, 4, 4, ...P.dg0);   // inner ear

    // === Head ===
    sr(76, 22, 28, 22, ...P.dg1);
    sr(80, 18, 20, 6, ...P.dg2);
    sr(82, 20, 16, 4, ...P.dg0);  // forehead highlight

    // === Eye (red, fierce) ===
    sr(96, 28, 6, 5, ...P.wh);
    sr(98, 29, 3, 3, 200, 40, 20);
    sp(99, 30, 240, 60, 30);
    sp(97, 28, 255, 255, 240);     // eye shine

    // === Snout ===
    sr(100, 34, 22, 12, ...P.dg0);
    sr(104, 36, 16, 8, 196, 156, 68);
    // Nose
    sr(118, 36, 6, 5, 20, 16, 10);

    // === Open mouth with teeth ===
    sr(100, 46, 24, 6, 180, 36, 28);   // mouth interior
    sr(104, 44, 18, 4, 160, 28, 20);
    // Upper teeth
    sr(104, 46, 4, 3, ...P.wh);
    sr(110, 46, 4, 3, ...P.wh);
    sr(116, 46, 3, 3, ...P.wh);
    sr(120, 46, 2, 2, ...P.wh);
    // Lower jaw
    sr(100, 52, 20, 4, ...P.dg1);
    sr(102, 56, 16, 2, ...P.dg2);
    // Lower teeth
    sr(106, 50, 3, 3, ...P.wh);
    sr(112, 50, 3, 3, ...P.wh);
    sr(118, 50, 2, 2, ...P.wh);
    // Tongue
    sr(108, 48, 8, 4, 200, 80, 80);

    // === Neck ===
    sr(64, 38, 20, 20, ...P.dg1);
    sr(56, 44, 16, 14, ...P.dg2);

    // === Body ===
    sr(20, 44, 60, 24, ...P.dg1);        // main body
    sr(24, 38, 52, 8, ...P.dg2);          // back
    sr(28, 34, 44, 6, ...P.dg3);          // dark saddle
    sr(32, 32, 36, 4, ...P.dg4);          // saddle center
    sr(30, 64, 40, 6, ...P.dg0);          // belly (lighter)
    // Body highlight
    sr(36, 50, 16, 10, ...P.dg0);
    // Ribcage lines
    for (let x = 48; x < 76; x += 8) {
        sr(x, 48, 2, 14, ...P.dg2);
    }

    // === Tail (raised) ===
    sr(8, 32, 10, 6, ...P.dg2);
    sr(4, 28, 8, 6, ...P.dg3);
    sr(2, 24, 6, 6, ...P.dg3);
    sr(6, 30, 4, 4, ...P.dg1);            // highlight

    // === Front legs ===
    // Near leg
    sr(72, 68, 12, 8, ...P.dg1);
    sr(74, 76, 10, 18, ...P.dg1);
    sr(76, 78, 4, 14, ...P.dg0);          // highlight
    sr(72, 94, 12, 8, ...P.dg2);          // paw
    sr(72, 100, 14, 4, ...P.dg3);         // claws
    sp(74, 103, ...P.dk2); sp(78, 103, ...P.dk2); sp(82, 103, ...P.dk2);

    // Far leg
    sr(60, 68, 10, 6, ...P.dg2);
    sr(62, 74, 8, 18, ...P.dg2);
    sr(60, 92, 10, 8, ...P.dg3);
    sr(60, 100, 12, 3, ...P.dg4);

    // === Hind legs ===
    // Near leg
    sr(28, 64, 16, 10, ...P.dg2);         // thigh
    sr(24, 76, 10, 18, ...P.dg1);
    sr(26, 78, 4, 14, ...P.dg0);
    sr(22, 94, 12, 8, ...P.dg2);
    sr(22, 100, 14, 4, ...P.dg3);
    sp(24, 103, ...P.dk2); sp(28, 103, ...P.dk2); sp(32, 103, ...P.dk2);

    // Far leg
    sr(16, 64, 12, 8, ...P.dg3);
    sr(14, 74, 8, 18, ...P.dg2);
    sr(12, 92, 10, 8, ...P.dg3);
    sr(12, 100, 12, 3, ...P.dg4);
}

function drawLamp(sp, sr, W, H) {
    const cx = W / 2;
    // Chain/wire hanging from ceiling (top of sprite)
    sr(cx - 1, 0, 2, 16, 140, 140, 140);   // gray chain
    sr(cx, 0, 1, 16, 170, 170, 170);        // chain highlight

    // Lamp mount (small circle at top of shade)
    sr(cx - 3, 14, 6, 3, 80, 80, 80);

    // Green dome shade — wider at bottom, narrow at top
    // Top narrow section
    sr(cx - 6, 17, 12, 3, 0, 160, 50);
    // Middle section
    sr(cx - 10, 20, 20, 4, 0, 180, 60);
    // Wide bottom section
    sr(cx - 14, 24, 28, 5, 0, 160, 50);
    // Bottom rim
    sr(cx - 16, 29, 32, 2, 0, 130, 40);

    // Highlight on dome (top-left)
    sr(cx - 4, 18, 6, 2, 40, 220, 100);
    sr(cx - 8, 21, 8, 2, 30, 200, 80);

    // Shadow on dome (bottom-right)
    sr(cx + 6, 22, 4, 4, 0, 120, 35);
    sr(cx + 10, 25, 4, 3, 0, 100, 30);

    // Yellow/white light glow underneath
    sr(cx - 10, 31, 20, 3, 255, 255, 180);
    sr(cx - 6, 34, 12, 2, 255, 255, 140);
    sr(cx - 3, 36, 6, 2, 255, 240, 100);

    // Bright bulb center
    sr(cx - 2, 31, 4, 3, 255, 255, 220);
}

function drawItem(sp, sr, W, H, color) {
    const cx = W / 2, cy = H / 2;

    let r = 200, g = 200, b = 200;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }
    }

    // Gold treasures
    if (r > 200 && g > 180 && b < 100) {
        // Wolf3D gold cross
        sr(cx - 3, cy - 14, 6, 28, ...P.gd0);
        sr(cx - 10, cy - 6, 20, 6, ...P.gd0);
        // 3D shading - highlight (top/left)
        sr(cx - 2, cy - 14, 4, 2, ...P.gd0);
        sr(cx - 3, cy - 13, 1, 24, 255, 244, 120);
        sr(cx - 10, cy - 6, 1, 5, 255, 244, 120);
        sr(cx - 9, cy - 6, 18, 1, 255, 244, 120);
        // Shadow (bottom/right)
        sr(cx + 2, cy - 12, 1, 24, ...P.gd2);
        sr(cx + 9, cy - 5, 1, 5, ...P.gd2);
        sr(cx - 9, cy - 1, 18, 1, ...P.gd2);
        // Sparkles
        sp(cx - 8, cy - 10, 255, 255, 220);
        sp(cx + 7, cy - 9, 255, 255, 200);
        sp(cx + 6, cy + 6, 255, 255, 200);
    } else if (r > 200 && g < 100 && b < 100) {
        // First aid kit — white box with red cross
        sr(cx - 12, cy - 10, 24, 20, 240, 240, 240);
        sr(cx - 11, cy - 9, 22, 18, 252, 252, 252);
        sr(cx - 3, cy - 8, 6, 16, 200, 32, 32);
        sr(cx - 8, cy - 3, 16, 6, 200, 32, 32);
        // Box edges
        sr(cx - 12, cy + 9, 24, 1, 180, 180, 180);
        sr(cx + 11, cy - 9, 1, 19, 200, 200, 200);
        sr(cx - 12, cy - 10, 24, 1, 220, 220, 220);
        sr(cx - 12, cy - 9, 1, 19, 248, 248, 248);
    } else if (r < 100 && g > 140 && b < 100) {
        // Food (dog food / meal) — plate with food
        sr(cx - 10, cy + 2, 20, 4, 200, 180, 140);    // plate
        sr(cx - 8, cy - 4, 16, 8, 140, 100, 40);       // bowl
        sr(cx - 6, cy - 6, 12, 4, 100, 160, 60);       // green food
        sr(cx - 4, cy - 8, 8, 3, 120, 180, 80);        // food top
        sr(cx - 3, cy - 7, 4, 1, 160, 220, 100);       // highlight
        sr(cx - 10, cy + 5, 20, 1, 160, 140, 100);     // plate shadow
    } else if (r > 180 && g > 180 && b < 80) {
        // Ammo clip
        sr(cx - 6, cy - 8, 12, 16, 180, 160, 48);
        sr(cx - 5, cy - 7, 10, 14, 200, 180, 56);
        // Bullets
        for (let i = 0; i < 3; i++) {
            sr(cx - 3 + i * 3, cy - 5, 2, 10, 216, 196, 64);
            sp(cx - 3 + i * 3, cy - 6, 232, 212, 80);
        }
        sr(cx - 6, cy - 8, 12, 1, 220, 200, 72);
        sr(cx - 6, cy + 7, 12, 1, 140, 120, 32);
    } else if (r > 180 && g > 180 && b > 180) {
        // Medkit (white with red cross)
        sr(cx - 10, cy - 8, 20, 16, 240, 240, 240);
        sr(cx - 9, cy - 7, 18, 14, 252, 252, 252);
        sr(cx - 2, cy - 6, 4, 12, 200, 36, 36);
        sr(cx - 6, cy - 2, 12, 4, 200, 36, 36);
        sr(cx - 10, cy + 7, 20, 1, 180, 180, 180);
        sr(cx + 9, cy - 7, 1, 15, 200, 200, 200);
    } else if (r > 120 && r < 180 && g > 120 && g < 180 && b > 120 && b < 180) {
        // Weapon pickup
        sr(cx - 14, cy - 3, 28, 8, ...P.mt1);
        sr(cx + 10, cy - 5, 8, 5, ...P.mt2);
        sr(cx - 14, cy + 3, 8, 6, 100, 72, 32);
        sr(cx - 2, cy + 5, 4, 6, ...P.mt2);
        sr(cx - 13, cy - 2, 26, 1, ...P.mt0);
        sr(cx + 4, cy + 1, 3, 6, ...P.mt2);
    } else if (b > 180) {
        // Silver key
        sr(cx - 2, cy - 12, 4, 18, r, g, b);
        sr(cx - 7, cy - 14, 14, 8, r, g, b);
        sr(cx - 5, cy - 12, 10, 4, clamp(r-40), clamp(g-40), clamp(b-40));
        sr(cx, cy + 2, 5, 4, r, g, b);
        sr(cx + 3, cy + 4, 3, 2, r, g, b);
        sr(cx - 6, cy - 13, 2, 3, 255, 255, 255);
    } else {
        // Default orb
        for (let dy = -12; dy <= 12; dy++) {
            for (let dx = -12; dx <= 12; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 12) {
                    const shade = 1 - dist / 12;
                    const light = Math.max(0, 1 - Math.sqrt((dx+3)*(dx+3) + (dy+3)*(dy+3)) / 12);
                    sp(cx + dx, cy + dy,
                        clamp(r * shade * 0.8 + 255 * light * 0.4),
                        clamp(g * shade * 0.8 + 255 * light * 0.4),
                        clamp(b * shade * 0.8 + 255 * light * 0.4));
                }
            }
        }
    }
}

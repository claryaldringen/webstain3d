// WallTextures — procedural wall texture generators (pixel-art Wolf3D style)
// Converted from src/textures.js procedural wall functions

// ───── Helpers ─────

function createCanvas(w: number = 64, h: number = 64): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function getPixels(ctx: CanvasRenderingContext2D, w: number = 64, h: number = 64): ImageData {
    return ctx.getImageData(0, 0, w, h);
}

function putPixels(ctx: CanvasRenderingContext2D, img: ImageData): void {
    ctx.putImageData(img, 0, 0);
}

function setPixel(img: ImageData, x: number, y: number, r: number, g: number, b: number, w: number = 64, h: number = 64): void {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    img.data[i] = r;
    img.data[i + 1] = g;
    img.data[i + 2] = b;
    img.data[i + 3] = 255;
}

function getPixel(img: ImageData, x: number, y: number, w: number = 64): [number, number, number] {
    const i = (y * w + x) * 4;
    return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!];
}

function fill(img: ImageData, r: number, g: number, b: number, w: number = 64, h: number = 64): void {
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            setPixel(img, x, y, r, g, b, w, h);
}

function fillRect(img: ImageData, x0: number, y0: number, rw: number, rh: number, r: number, g: number, b: number, w: number = 64, h: number = 64): void {
    for (let y = y0; y < y0 + rh; y++)
        for (let x = x0; x < x0 + rw; x++)
            setPixel(img, x, y, r, g, b, w, h);
}

function noise(img: ImageData, intensity: number, w: number = 64, h: number = 64): void {
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const [r, g, b] = getPixel(img, x, y, w);
            const n = ((Math.random() - 0.5) * intensity) | 0;
            setPixel(img, x, y,
                clamp(r + n), clamp(g + n), clamp(b + n), w, h);
        }
    }
}

function clamp(v: number): number {
    return Math.max(0, Math.min(255, v));
}

// ───── Wall type 1: Blue-gray stone (iconic Wolf3D outer wall) ─────

function blueStoneWall(): HTMLCanvasElement {
    const c = createCanvas(), ctx = c.getContext('2d')!;
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

function woodPanelWall(): HTMLCanvasElement {
    const c = createCanvas(), ctx = c.getContext('2d')!;
    const img = getPixels(ctx);

    // Warmer brown base
    fill(img, 132, 88, 38);

    // 4 planks, each 16px wide, with slight color variation
    const plankColors: [number, number, number][] = [
        [132, 88, 38],
        [126, 82, 34],
        [138, 94, 42],
        [122, 80, 32]
    ];

    for (let plank = 0; plank < 4; plank++) {
        const px0 = plank * 16;
        const [pr, pg, pb] = plankColors[plank]!;
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

function grayBrickWall(): HTMLCanvasElement {
    const c = createCanvas(), ctx = c.getContext('2d')!;
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

function redBrickWall(): HTMLCanvasElement {
    const c = createCanvas(), ctx = c.getContext('2d')!;
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

function naziFlagWall(): HTMLCanvasElement {
    const c = createCanvas(), ctx = c.getContext('2d')!;
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
    const bk = (x: number, y: number, w: number, h: number) => fillRect(img, x, y, w, h, 20, 20, 20);
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

function naziEagleWall(): HTMLCanvasElement {
    const c = createCanvas(), ctx = c.getContext('2d')!;
    const img = getPixels(ctx);
    // Dark gray stone base
    fill(img, 80, 80, 88);
    noise(img, 8);

    // Eagle body color (dark charcoal) and highlight
    const eD = (x: number, y: number, w: number, h: number) => fillRect(img, x, y, w, h, 28, 28, 32);
    const eL = (x: number, y: number, w: number, h: number) => fillRect(img, x, y, w, h, 48, 48, 56);

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
    const leaf = (x: number, y: number) => setPixel(img, x, y, 240, 220, 80);
    leaf(25, 45); leaf(24, 48); leaf(24, 52); leaf(25, 55);
    leaf(39, 45); leaf(40, 48); leaf(40, 52); leaf(39, 55);
    leaf(27, 43); leaf(37, 43);
    leaf(28, 58); leaf(36, 58);

    // Tiny swastika inside wreath (dark)
    const s = (x: number, y: number, w: number, h: number) => fillRect(img, x, y, w, h, 28, 28, 32);
    s(31, 48, 2, 7);   // vertical
    s(28, 50, 8, 2);   // horizontal
    s(28, 47, 2, 4);   // top-left arm down
    s(35, 51, 2, 4);   // bottom-right arm down
    s(31, 47, 5, 2);   // top-right arm
    s(28, 54, 5, 2);   // bottom-left arm

    putPixels(ctx, img);
    return c;
}

function naziPortraitWall(): HTMLCanvasElement {
    const c = createCanvas(), ctx = c.getContext('2d')!;
    const img = getPixels(ctx);
    // Dark wood paneling background
    fill(img, 72, 48, 24);
    for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 64; y++) {
            const grain = Math.sin(y * 0.4 + x * 0.2) * 6;
            const [r, g, b] = getPixel(img, x, y);
            setPixel(img, x, y, clamp(r + grain), clamp(g + grain * 0.6), clamp(b + grain * 0.3));
        }
    }
    // Red banner hanging on wall
    fillRect(img, 16, 4, 32, 52, 180, 20, 20);
    fillRect(img, 18, 6, 28, 48, 200, 28, 28);
    // White circle
    for (let y = 14; y < 44; y++) {
        for (let x = 20; x < 44; x++) {
            const dx = x - 32, dy = y - 29;
            if (dx * dx + dy * dy < 12 * 12) setPixel(img, x, y, 240, 240, 240);
        }
    }
    // Swastika
    const sw = (x: number, y: number, w: number, h: number) => fillRect(img, x, y, w, h, 24, 24, 24);
    sw(31, 21, 2, 16); sw(24, 28, 16, 2);
    sw(24, 24, 2, 6); sw(38, 28, 2, 6);
    sw(31, 21, 7, 2); sw(26, 35, 7, 2);
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

// ───── Public API ─────

/**
 * Generate all procedural wall textures.
 * Returns a Map keyed by wall type ID (1-7).
 */
export function generateProceduralWallTextures(): Map<number, HTMLCanvasElement> {
    const textures = new Map<number, HTMLCanvasElement>();
    textures.set(1, blueStoneWall());
    textures.set(2, woodPanelWall());
    textures.set(3, grayBrickWall());
    textures.set(4, redBrickWall());
    textures.set(5, naziFlagWall());
    textures.set(6, naziEagleWall());
    textures.set(7, naziPortraitWall());
    return textures;
}

// Re-export individual generators for direct use
export {
    blueStoneWall,
    woodPanelWall,
    grayBrickWall,
    redBrickWall,
    naziFlagWall,
    naziEagleWall,
    naziPortraitWall,
};

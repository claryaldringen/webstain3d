// DoorTextures — procedural door texture generators for Wolf3D clone
// Extracted from src/doors.js (lines 6-213)

/**
 * Add subtle per-pixel noise to a canvas for texture detail.
 */
function applyNoise(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number = 6): void {
    const imgData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const n = (Math.random() - 0.5) * amount;
        imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i]! + n));
        imgData.data[i + 1] = Math.max(0, Math.min(255, imgData.data[i + 1]! + n));
        imgData.data[i + 2] = Math.max(0, Math.min(255, imgData.data[i + 2]! + n));
    }
    ctx.putImageData(imgData, 0, 0);
}

/**
 * Create the standard gray metal door texture (64x64).
 */
export function createDoorTexture(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;

    // Gray metal base
    ctx.fillStyle = '#787878';
    ctx.fillRect(0, 0, 64, 64);

    // Frame (dark border)
    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 0, 64, 2); ctx.fillRect(0, 62, 64, 2);
    ctx.fillRect(0, 0, 2, 64); ctx.fillRect(62, 0, 2, 64);

    // Metal plates (horizontal lines)
    ctx.fillStyle = '#606060';
    for (let y = 8; y < 56; y += 16) {
        ctx.fillRect(4, y, 56, 1);
    }

    // Lighter horizontal highlights
    ctx.fillStyle = '#909090';
    for (let y = 9; y < 56; y += 16) {
        ctx.fillRect(4, y, 56, 1);
    }

    // Rivets
    ctx.fillStyle = '#555555';
    for (let y = 6; y < 60; y += 16) {
        ctx.fillRect(6, y, 2, 2);
        ctx.fillRect(56, y, 2, 2);
    }
    ctx.fillStyle = '#999999';
    for (let y = 6; y < 60; y += 16) {
        ctx.fillRect(6, y, 1, 1);
        ctx.fillRect(56, y, 1, 1);
    }

    // Door handle (right side)
    ctx.fillStyle = '#B8A830';
    ctx.fillRect(48, 28, 6, 8);
    ctx.fillStyle = '#D8C840';
    ctx.fillRect(49, 29, 4, 6);
    ctx.fillStyle = '#8C7820';
    ctx.fillRect(48, 35, 6, 1);

    // Keyhole
    ctx.fillStyle = '#303030';
    ctx.fillRect(50, 32, 2, 3);

    applyNoise(ctx, 64, 64);
    return c;
}

/**
 * Create the gold locked door texture (64x64).
 */
export function createGoldDoorTexture(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;

    // Gold metal base
    ctx.fillStyle = '#C8A028';
    ctx.fillRect(0, 0, 64, 64);

    // Frame (darker gold border)
    ctx.fillStyle = '#7C6010';
    ctx.fillRect(0, 0, 64, 2); ctx.fillRect(0, 62, 64, 2);
    ctx.fillRect(0, 0, 2, 64); ctx.fillRect(62, 0, 2, 64);

    // Inner frame highlight
    ctx.fillStyle = '#D8B838';
    ctx.fillRect(2, 2, 60, 1); ctx.fillRect(2, 2, 1, 60);

    // Metal plates (horizontal lines)
    ctx.fillStyle = '#A88818';
    for (let y = 8; y < 56; y += 16) {
        ctx.fillRect(4, y, 56, 1);
    }

    // Lighter horizontal highlights
    ctx.fillStyle = '#E0C040';
    for (let y = 9; y < 56; y += 16) {
        ctx.fillRect(4, y, 56, 1);
    }

    // Rivets (gold-toned)
    ctx.fillStyle = '#907018';
    for (let y = 6; y < 60; y += 16) {
        ctx.fillRect(6, y, 2, 2);
        ctx.fillRect(56, y, 2, 2);
    }
    ctx.fillStyle = '#D8C040';
    for (let y = 6; y < 60; y += 16) {
        ctx.fillRect(6, y, 1, 1);
        ctx.fillRect(56, y, 1, 1);
    }

    // Lock emblem (center) - keyhole plate
    ctx.fillStyle = '#7C6010';
    ctx.fillRect(26, 24, 12, 16);
    ctx.fillStyle = '#907018';
    ctx.fillRect(27, 25, 10, 14);
    // Keyhole circle (top)
    ctx.fillStyle = '#303030';
    ctx.fillRect(30, 27, 4, 4);
    ctx.fillStyle = '#202020';
    ctx.fillRect(31, 28, 2, 2);
    // Keyhole slot (bottom)
    ctx.fillStyle = '#303030';
    ctx.fillRect(31, 31, 2, 6);
    // Keyhole plate highlight
    ctx.fillStyle = '#B89828';
    ctx.fillRect(26, 24, 12, 1);
    ctx.fillRect(26, 24, 1, 16);

    applyNoise(ctx, 64, 64);
    return c;
}

/**
 * Create the silver locked door texture (64x64).
 */
export function createSilverDoorTexture(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d')!;

    // Silver metal base
    ctx.fillStyle = '#A0A0A8';
    ctx.fillRect(0, 0, 64, 64);

    // Frame (darker silver border)
    ctx.fillStyle = '#606068';
    ctx.fillRect(0, 0, 64, 2); ctx.fillRect(0, 62, 64, 2);
    ctx.fillRect(0, 0, 2, 64); ctx.fillRect(62, 0, 2, 64);

    // Inner frame highlight
    ctx.fillStyle = '#B8B8C0';
    ctx.fillRect(2, 2, 60, 1); ctx.fillRect(2, 2, 1, 60);

    // Metal plates (horizontal lines)
    ctx.fillStyle = '#888890';
    for (let y = 8; y < 56; y += 16) {
        ctx.fillRect(4, y, 56, 1);
    }

    // Lighter horizontal highlights
    ctx.fillStyle = '#C0C0C8';
    for (let y = 9; y < 56; y += 16) {
        ctx.fillRect(4, y, 56, 1);
    }

    // Rivets (silver-toned)
    ctx.fillStyle = '#707078';
    for (let y = 6; y < 60; y += 16) {
        ctx.fillRect(6, y, 2, 2);
        ctx.fillRect(56, y, 2, 2);
    }
    ctx.fillStyle = '#C8C8D0';
    for (let y = 6; y < 60; y += 16) {
        ctx.fillRect(6, y, 1, 1);
        ctx.fillRect(56, y, 1, 1);
    }

    // Lock emblem (center) - keyhole plate
    ctx.fillStyle = '#606068';
    ctx.fillRect(26, 24, 12, 16);
    ctx.fillStyle = '#707078';
    ctx.fillRect(27, 25, 10, 14);
    // Keyhole circle (top)
    ctx.fillStyle = '#303030';
    ctx.fillRect(30, 27, 4, 4);
    ctx.fillStyle = '#202020';
    ctx.fillRect(31, 28, 2, 2);
    // Keyhole slot (bottom)
    ctx.fillStyle = '#303030';
    ctx.fillRect(31, 31, 2, 6);
    // Keyhole plate highlight
    ctx.fillStyle = '#989898';
    ctx.fillRect(26, 24, 12, 1);
    ctx.fillRect(26, 24, 1, 16);

    applyNoise(ctx, 64, 64);
    return c;
}

/** Door texture type identifiers */
export type DoorType = 'normal' | 'gold' | 'silver';

/**
 * Create a door texture canvas by type.
 */
export function createDoorTextureByType(type: DoorType): HTMLCanvasElement {
    switch (type) {
        case 'gold':
            return createGoldDoorTexture();
        case 'silver':
            return createSilverDoorTexture();
        case 'normal':
        default:
            return createDoorTexture();
    }
}

// WeaponSprites — procedural weapon sprite drawing for Wolf3D clone
// Converted from src/weapons.js (drawWeapon, drawKnife, drawPistol, drawMachineGun, drawChaingun)

/** Valid weapon names */
export type WeaponName = 'knife' | 'pistol' | 'machinegun' | 'chaingun';

/** Frame names for weapon animation */
export type FrameName = 'idle' | 'atk1' | 'atk2' | 'atk3' | 'atk4';

/** A set of weapon frame canvases keyed by frame name */
export type WeaponFrames = Record<FrameName, HTMLCanvasElement>;

/** All weapon sprites keyed by weapon name */
export type WeaponSpriteSet = Record<WeaponName, WeaponFrames>;

// ───── Wolf3D color palette ─────

// Skin tones
const SKIN0 = '#D8A878';
const SKIN1 = '#C89868';
const SKIN2 = '#B08050';

// Brown uniform
const UNI0 = '#8C6C2C';
const UNI1 = '#7C5C1C';
const UNI2 = '#6C4C0C';

// Gun metal
const GUN0 = '#78787C';
const GUN1 = '#585860';
const GUN2 = '#3C3C44';
const GUN3 = '#24242C';

// ───── Individual weapon drawing functions ─────

function drawKnife(ctx: CanvasRenderingContext2D, cx: number, by: number, firing: boolean): void {
    if (firing) {
        // === Slash frame — arm swung across, blade horizontal ===
        // Sleeve
        ctx.fillStyle = UNI1;
        ctx.fillRect(50, 100, 40, 28);
        ctx.fillStyle = UNI2;
        ctx.fillRect(52, 98, 36, 4);

        // Forearm (rotated, going left)
        ctx.fillStyle = SKIN0;
        ctx.fillRect(30, 76, 38, 20);
        ctx.fillStyle = SKIN1;
        ctx.fillRect(32, 74, 34, 4);

        // Fist
        ctx.fillStyle = SKIN0;
        ctx.fillRect(18, 72, 18, 20);
        // Finger wraps
        ctx.fillStyle = SKIN1;
        ctx.fillRect(20, 74, 4, 14);
        ctx.fillRect(26, 74, 4, 14);
        ctx.fillStyle = SKIN2;
        ctx.fillRect(18, 80, 18, 2);

        // Guard
        ctx.fillStyle = '#AA8830';
        ctx.fillRect(14, 70, 6, 24);
        ctx.fillStyle = '#C8A040';
        ctx.fillRect(15, 72, 4, 20);

        // Blade (horizontal slash)
        ctx.fillStyle = '#C0C0C8';
        ctx.fillRect(-8, 74, 26, 10);
        ctx.fillStyle = '#E0E0E8';  // highlight
        ctx.fillRect(-6, 76, 22, 4);
        ctx.fillStyle = '#A8A8B0';
        ctx.fillRect(-8, 82, 26, 2);  // edge shadow
        // Tip
        ctx.fillStyle = '#B0B0B8';
        ctx.fillRect(-14, 76, 8, 6);
        ctx.fillRect(-18, 77, 6, 4);

        // Slash trail
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(-10, 60, 50, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(-6, 56, 46, 3);
    } else {
        // === Idle — arm from lower right, knife pointing up ===
        // Sleeve
        ctx.fillStyle = UNI1;
        ctx.fillRect(58, 104 + by, 36, 24);
        ctx.fillStyle = UNI0;
        ctx.fillRect(60, 102 + by, 32, 4);
        ctx.fillStyle = UNI2;
        ctx.fillRect(56, 104 + by, 4, 20);

        // Forearm
        ctx.fillStyle = SKIN0;
        ctx.fillRect(56, 84 + by, 28, 22);
        ctx.fillStyle = SKIN1;
        ctx.fillRect(54, 86 + by, 4, 16);
        // Wrist
        ctx.fillStyle = SKIN1;
        ctx.fillRect(58, 82 + by, 24, 4);

        // Fist gripping handle
        ctx.fillStyle = SKIN0;
        ctx.fillRect(54, 68 + by, 24, 16);
        // Fingers
        ctx.fillStyle = SKIN1;
        ctx.fillRect(56, 70 + by, 5, 10);
        ctx.fillRect(62, 70 + by, 5, 10);
        ctx.fillRect(68, 70 + by, 5, 10);
        ctx.fillStyle = SKIN2;
        ctx.fillRect(54, 76 + by, 24, 2);
        // Thumb
        ctx.fillStyle = SKIN0;
        ctx.fillRect(76, 72 + by, 5, 10);

        // Handle
        ctx.fillStyle = '#5C3C10';
        ctx.fillRect(60, 56 + by, 12, 14);
        ctx.fillStyle = '#4C2C08';
        ctx.fillRect(62, 58 + by, 2, 10);
        ctx.fillRect(66, 58 + by, 2, 10);
        ctx.fillRect(70, 58 + by, 2, 10);

        // Guard
        ctx.fillStyle = '#AA8830';
        ctx.fillRect(54, 52 + by, 24, 5);
        ctx.fillStyle = '#C8A040';
        ctx.fillRect(56, 53 + by, 20, 2);

        // Blade (pointing up)
        ctx.fillStyle = '#B8B8C0';
        ctx.fillRect(60, 10 + by, 12, 44);
        // Center shine
        ctx.fillStyle = '#E0E0E8';
        ctx.fillRect(63, 12 + by, 6, 40);
        // Left edge (darker)
        ctx.fillStyle = '#A0A0A8';
        ctx.fillRect(60, 12 + by, 3, 42);
        // Right edge highlight
        ctx.fillStyle = '#D0D0D8';
        ctx.fillRect(70, 14 + by, 2, 38);
        // Blood groove
        ctx.fillStyle = '#9898A0';
        ctx.fillRect(64, 18 + by, 2, 32);
        // Tip
        ctx.fillStyle = '#C8C8D0';
        ctx.fillRect(62, 8 + by, 8, 4);
        ctx.fillRect(63, 6 + by, 6, 4);
        ctx.fillRect(64, 4 + by, 4, 4);
    }
}

function drawPistol(ctx: CanvasRenderingContext2D, cx: number, by: number, firing: boolean): void {
    // Wolf3D Luger-style pistol, centered, held from below

    // === Sleeve ===
    ctx.fillStyle = UNI1;
    ctx.fillRect(cx - 14, 112 + by, 40, 16);
    ctx.fillStyle = UNI0;
    ctx.fillRect(cx - 12, 110 + by, 36, 4);
    ctx.fillStyle = UNI2;
    ctx.fillRect(cx + 24, 112 + by, 4, 12);

    // === Forearm ===
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx - 8, 90 + by, 28, 22);
    ctx.fillStyle = SKIN1;
    ctx.fillRect(cx - 6, 88 + by, 24, 4);
    ctx.fillStyle = SKIN2;
    ctx.fillRect(cx - 10, 94 + by, 4, 14);  // shadow side

    // === Hand ===
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx - 10, 72 + by, 32, 20);
    // Fingers wrapping around grip
    ctx.fillStyle = SKIN1;
    ctx.fillRect(cx - 8, 74 + by, 6, 14);   // finger 1
    ctx.fillRect(cx - 1, 74 + by, 6, 14);    // finger 2
    ctx.fillRect(cx + 6, 74 + by, 6, 14);    // finger 3
    ctx.fillRect(cx + 13, 74 + by, 6, 14);   // finger 4
    // Finger separation shadows
    ctx.fillStyle = SKIN2;
    ctx.fillRect(cx - 2, 76 + by, 1, 10);
    ctx.fillRect(cx + 5, 76 + by, 1, 10);
    ctx.fillRect(cx + 12, 76 + by, 1, 10);
    // Knuckles highlight
    ctx.fillStyle = '#E0B888';
    ctx.fillRect(cx - 6, 77 + by, 4, 2);
    ctx.fillRect(cx + 1, 77 + by, 4, 2);
    ctx.fillRect(cx + 8, 77 + by, 4, 2);
    ctx.fillRect(cx + 15, 77 + by, 4, 2);
    // Thumb (left side)
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx - 14, 68 + by, 7, 14);
    ctx.fillStyle = '#E0B888';
    ctx.fillRect(cx - 13, 69 + by, 5, 3);

    // === Pistol grip (angled back slightly) ===
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx - 1, 64 + by, 16, 22);
    // Grip panels (checkered texture)
    ctx.fillStyle = GUN1;
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(cx + 1, 66 + by + i * 4, 12, 1);
    }
    ctx.fillStyle = '#2C2C34';
    ctx.fillRect(cx, 64 + by, 14, 1);  // top edge

    // === Receiver/frame ===
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 4, 40 + by, 22, 26);
    // Frame highlight
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx - 3, 40 + by, 20, 2);
    // Frame shadow
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 16, 42 + by, 2, 22);

    // === Slide ===
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx - 1, 34 + by, 16, 8);
    // Slide serrations
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx, 35 + by, 14, 1);
    ctx.fillRect(cx, 37 + by, 14, 1);
    ctx.fillRect(cx, 39 + by, 14, 1);

    // === Barrel (prominent chrome barrel with rings — key Wolf3D visual) ===
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx + 1, 18 + by, 12, 18);
    // Toggle mechanism (Luger feature)
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx + 2, 32 + by, 10, 4);
    ctx.fillStyle = '#90909C';
    ctx.fillRect(cx + 3, 33 + by, 8, 2);

    // Chrome barrel — thicker and more prominent with ring ridges
    ctx.fillStyle = '#8C8C94';
    ctx.fillRect(cx + 2, 6 + by, 10, 14);
    // Chrome barrel rings (the distinctive stacked-ring look from W3D)
    ctx.fillStyle = '#A8A8B0';
    ctx.fillRect(cx + 2, 7 + by, 10, 2);
    ctx.fillStyle = '#70707C';
    ctx.fillRect(cx + 2, 9 + by, 10, 1);
    ctx.fillStyle = '#A8A8B0';
    ctx.fillRect(cx + 2, 11 + by, 10, 2);
    ctx.fillStyle = '#70707C';
    ctx.fillRect(cx + 2, 13 + by, 10, 1);
    ctx.fillStyle = '#A8A8B0';
    ctx.fillRect(cx + 2, 15 + by, 10, 2);
    ctx.fillStyle = '#70707C';
    ctx.fillRect(cx + 2, 17 + by, 10, 1);
    // Barrel center highlight (chrome sheen)
    ctx.fillStyle = '#B8B8C4';
    ctx.fillRect(cx + 4, 8 + by, 6, 1);
    ctx.fillRect(cx + 4, 12 + by, 6, 1);
    ctx.fillRect(cx + 4, 16 + by, 6, 1);

    // Bore (dark hole at top)
    ctx.fillStyle = '#101014';
    ctx.fillRect(cx + 4, 4 + by, 6, 4);
    // Bore rim
    ctx.fillStyle = '#606068';
    ctx.fillRect(cx + 3, 3 + by, 8, 1);
    ctx.fillRect(cx + 3, 4 + by, 1, 4);
    ctx.fillRect(cx + 10, 4 + by, 1, 4);
    // Front sight
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 6, 2 + by, 2, 3);

    // === Trigger guard ===
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 6, 62 + by, 20, 3);
    ctx.fillRect(cx - 6, 62 + by, 2, 8);
    // Trigger
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 3, 58 + by, 3, 8);

    if (firing) {
        // Muzzle flash — 3-color Wolf3D style (larger to match bigger barrel)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx, 0, 14, 10);
        ctx.fillStyle = '#FCFC54';
        ctx.fillRect(cx - 8, 0, 30, 12);
        ctx.fillStyle = '#FC5400';
        ctx.fillRect(cx - 12, 0, 38, 6);
        ctx.fillStyle = '#FCFC54';
        ctx.fillRect(cx - 4, 8, 22, 6);
        // Small sparks
        ctx.fillStyle = '#FCFC98';
        ctx.fillRect(cx - 16, 4, 4, 3);
        ctx.fillRect(cx + 28, 6, 4, 3);
    }
}

function drawMachineGun(ctx: CanvasRenderingContext2D, cx: number, by: number, firing: boolean): void {
    // Wolf3D MP40: two hands, barrel shroud with holes, side magazine

    // === Right sleeve + arm ===
    ctx.fillStyle = UNI1;
    ctx.fillRect(cx + 8, 108 + by, 26, 20);
    ctx.fillStyle = UNI0;
    ctx.fillRect(cx + 10, 106 + by, 22, 4);
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx + 8, 88 + by, 20, 20);

    // === Left sleeve + arm ===
    ctx.fillStyle = UNI1;
    ctx.fillRect(cx - 22, 108 + by, 26, 20);
    ctx.fillStyle = UNI0;
    ctx.fillRect(cx - 20, 106 + by, 22, 4);
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx - 18, 78 + by, 18, 30);

    // === Right hand (on grip) ===
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx + 4, 76 + by, 18, 14);
    ctx.fillStyle = SKIN1;
    ctx.fillRect(cx + 6, 78 + by, 4, 10);
    ctx.fillRect(cx + 12, 78 + by, 4, 10);
    ctx.fillStyle = '#E0B888';
    ctx.fillRect(cx + 7, 80 + by, 3, 2);
    ctx.fillRect(cx + 13, 80 + by, 3, 2);

    // === Left hand (gripping barrel shroud) ===
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx - 14, 60 + by, 18, 14);
    ctx.fillStyle = SKIN1;
    ctx.fillRect(cx - 12, 62 + by, 4, 8);
    ctx.fillRect(cx - 6, 62 + by, 4, 8);
    ctx.fillStyle = SKIN2;
    ctx.fillRect(cx - 14, 68 + by, 18, 2);

    // === Wood stock ===
    ctx.fillStyle = '#6C4C10';
    ctx.fillRect(cx + 4, 86 + by, 16, 20);
    ctx.fillStyle = '#5C3C08';
    ctx.fillRect(cx + 6, 88 + by, 2, 16);
    ctx.fillRect(cx + 12, 88 + by, 2, 16);
    ctx.fillStyle = '#7C5C18';
    ctx.fillRect(cx + 8, 88 + by, 3, 16);  // wood grain highlight
    // Stock butt
    ctx.fillStyle = '#5C3C08';
    ctx.fillRect(cx + 2, 104 + by, 20, 6);

    // === Pistol grip ===
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 6, 72 + by, 10, 16);
    ctx.fillStyle = '#2C2C34';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx + 8, 74 + by + i * 4, 6, 1);
    }

    // === Receiver ===
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 6, 46 + by, 26, 28);
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx - 4, 46 + by, 22, 2);  // top highlight
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 18, 48 + by, 2, 24); // right shadow
    // Bolt handle (right side)
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 18, 54 + by, 6, 4);
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx + 22, 54 + by, 3, 3);  // knob

    // === Magazine (stick mag, below and right) ===
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 16, 62 + by, 6, 24);
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx + 17, 64 + by, 4, 1);
    ctx.fillRect(cx + 17, 70 + by, 4, 1);
    ctx.fillRect(cx + 17, 76 + by, 4, 1);

    // === Barrel shroud (perforated) ===
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 4, 22 + by, 20, 26);
    // Perforation holes (distinctive MP40 look)
    ctx.fillStyle = GUN2;
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(cx - 2, 26 + by + i * 6, 4, 3);
        ctx.fillRect(cx + 8, 26 + by + i * 6, 4, 3);
    }
    // Shroud highlight
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx + 4, 24 + by, 4, 22);

    // === Muzzle ===
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 1, 14 + by, 10, 10);
    ctx.fillStyle = GUN3;
    ctx.fillRect(cx + 3, 12 + by, 6, 4);
    // Bore
    ctx.fillStyle = '#101014';
    ctx.fillRect(cx + 4, 10 + by, 4, 4);
    // Front sight
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 5, 8 + by, 2, 4);

    // === Trigger guard ===
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 2, 70 + by, 14, 3);
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 4, 66 + by, 3, 6);

    if (firing) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx + 2, 0, 8, 10);
        ctx.fillStyle = '#FCFC54';
        ctx.fillRect(cx - 6, 0, 24, 12);
        ctx.fillStyle = '#FC5400';
        ctx.fillRect(cx - 12, 0, 36, 6);
        ctx.fillStyle = '#FCFC54';
        ctx.fillRect(cx - 4, 8, 20, 4);
        ctx.fillStyle = '#FCFC98';
        ctx.fillRect(cx - 16, 2, 5, 3);
        ctx.fillRect(cx + 26, 4, 5, 3);
        ctx.fillRect(cx - 10, 6, 3, 3);
        ctx.fillRect(cx + 22, 0, 3, 3);
    }
}

function drawChaingun(ctx: CanvasRenderingContext2D, cx: number, by: number, firing: boolean): void {
    // Wolf3D gatling gun: massive, 4 barrels, ammo belt, two-handed

    // === Sleeves ===
    ctx.fillStyle = UNI1;
    ctx.fillRect(cx - 26, 108 + by, 30, 20);
    ctx.fillRect(cx + 10, 108 + by, 30, 20);
    ctx.fillStyle = UNI0;
    ctx.fillRect(cx - 24, 106 + by, 26, 4);
    ctx.fillRect(cx + 12, 106 + by, 26, 4);

    // === Arms ===
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx - 22, 86 + by, 18, 24);
    ctx.fillRect(cx + 16, 86 + by, 18, 24);
    ctx.fillStyle = SKIN1;
    ctx.fillRect(cx - 24, 90 + by, 4, 16);
    ctx.fillRect(cx + 32, 90 + by, 4, 16);

    // === Left hand (supporting front) ===
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx - 18, 66 + by, 20, 16);
    ctx.fillStyle = SKIN1;
    ctx.fillRect(cx - 16, 68 + by, 4, 10);
    ctx.fillRect(cx - 10, 68 + by, 4, 10);
    ctx.fillRect(cx - 4, 68 + by, 4, 10);
    ctx.fillStyle = SKIN2;
    ctx.fillRect(cx - 18, 76 + by, 20, 2);

    // === Right hand (on grip) ===
    ctx.fillStyle = SKIN0;
    ctx.fillRect(cx + 10, 74 + by, 18, 14);
    ctx.fillStyle = SKIN1;
    ctx.fillRect(cx + 12, 76 + by, 4, 10);
    ctx.fillRect(cx + 18, 76 + by, 4, 10);

    // === Stock (heavy wood) ===
    ctx.fillStyle = '#6C4C10';
    ctx.fillRect(cx + 6, 90 + by, 18, 18);
    ctx.fillStyle = '#5C3C08';
    ctx.fillRect(cx + 8, 92 + by, 3, 14);
    ctx.fillRect(cx + 14, 92 + by, 3, 14);
    ctx.fillStyle = '#7C5C18';
    ctx.fillRect(cx + 11, 92 + by, 3, 14);

    // === Pistol grip ===
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 10, 76 + by, 8, 16);

    // === Massive receiver ===
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 14, 42 + by, 38, 32);
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx - 12, 42 + by, 34, 2);
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 22, 44 + by, 2, 28);

    // === Barrel cluster (4 barrels) ===
    // Barrel shroud
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 10, 20 + by, 30, 24);
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx - 8, 22 + by, 6, 20);
    ctx.fillRect(cx + 12, 22 + by, 6, 20);

    // 4 individual barrels
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx - 6, 6 + by, 6, 18);   // barrel 1
    ctx.fillRect(cx + 2, 6 + by, 6, 18);    // barrel 2
    ctx.fillRect(cx + 10, 6 + by, 6, 18);   // barrel 3
    ctx.fillStyle = GUN1;
    ctx.fillRect(cx - 2, 8 + by, 4, 16);    // barrel 4 (recessed)

    // Muzzles
    ctx.fillStyle = GUN3;
    ctx.fillRect(cx - 5, 4 + by, 4, 4);
    ctx.fillRect(cx + 3, 4 + by, 4, 4);
    ctx.fillRect(cx + 11, 4 + by, 4, 4);
    // Bores
    ctx.fillStyle = '#101014';
    ctx.fillRect(cx - 4, 2 + by, 2, 4);
    ctx.fillRect(cx + 4, 2 + by, 2, 4);
    ctx.fillRect(cx + 12, 2 + by, 2, 4);

    // Barrel clamp
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx - 8, 18 + by, 26, 3);

    // === Ammo belt (right side, hanging down) ===
    ctx.fillStyle = '#8C7020';
    ctx.fillRect(cx + 26, 48 + by, 14, 40);
    // Rounds
    for (let i = 0; i < 7; i++) {
        ctx.fillStyle = '#B8982C';
        ctx.fillRect(cx + 27, 50 + by + i * 5, 12, 3);
        ctx.fillStyle = '#D0B040';
        ctx.fillRect(cx + 28, 51 + by + i * 5, 10, 1);
    }
    // Belt feed (connecting to receiver)
    ctx.fillStyle = '#7C6018';
    ctx.fillRect(cx + 22, 52 + by, 6, 6);

    // === Crank / motor housing ===
    ctx.fillStyle = GUN2;
    ctx.fillRect(cx + 18, 46 + by, 6, 8);
    ctx.fillStyle = GUN0;
    ctx.fillRect(cx + 19, 48 + by, 4, 4);

    if (firing) {
        // MASSIVE muzzle flash (4 barrels = huge)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 4, 0, 18, 8);
        ctx.fillStyle = '#FCFC54';
        ctx.fillRect(cx - 14, 0, 38, 10);
        ctx.fillStyle = '#FC5400';
        ctx.fillRect(cx - 20, 0, 50, 6);
        ctx.fillStyle = '#FC0000';
        ctx.fillRect(cx - 8, 6, 26, 4);
        // Lots of sparks everywhere
        ctx.fillStyle = '#FCFC98';
        ctx.fillRect(cx - 24, 2, 6, 4);
        ctx.fillRect(cx + 32, 2, 6, 4);
        ctx.fillRect(cx - 18, 6, 4, 4);
        ctx.fillRect(cx + 28, 6, 4, 4);
        ctx.fillRect(cx, -2, 4, 4);
        ctx.fillRect(cx + 8, -2, 4, 4);
        ctx.fillRect(cx - 28, 4, 4, 3);
        ctx.fillRect(cx + 36, 4, 4, 3);
    }
}

// ───── Public API ─────

/**
 * Draw a single weapon frame onto a 128x128 canvas.
 * @param name - The weapon to draw
 * @param firing - Whether to draw the firing frame or idle frame
 * @returns A 128x128 HTMLCanvasElement with the weapon sprite
 */
export function drawWeaponSprite(name: WeaponName, firing: boolean): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;

    const cx = 64;
    const by = firing ? -6 : 0;  // bob offset when firing

    switch (name) {
        case 'knife':
            drawKnife(ctx, cx, by, firing);
            break;
        case 'pistol':
            drawPistol(ctx, cx, by, firing);
            break;
        case 'machinegun':
            drawMachineGun(ctx, cx, by, firing);
            break;
        case 'chaingun':
            drawChaingun(ctx, cx, by, firing);
            break;
    }

    return c;
}

/**
 * Generate all procedural weapon sprite frames for all weapons.
 * Each weapon gets an idle frame and attack frames (atk1-atk4).
 * For procedural sprites, atk1/atk2 use the firing frame and atk3/atk4 use idle.
 */
export function generateProceduralWeaponSprites(): WeaponSpriteSet {
    const weapons: WeaponName[] = ['knife', 'pistol', 'machinegun', 'chaingun'];
    const sprites = {} as WeaponSpriteSet;

    for (const name of weapons) {
        const idle = drawWeaponSprite(name, false);
        const fire = drawWeaponSprite(name, true);
        sprites[name] = {
            idle,
            atk1: fire,
            atk2: fire,
            atk3: idle,
            atk4: idle,
        };
    }

    return sprites;
}

import * as THREE from 'three';
import {
    WEAPON_KNIFE, WEAPON_PISTOL, WEAPON_MACHINE_GUN, WEAPON_CHAINGUN,
    WEAPON_DAMAGE_MIN, WEAPON_DAMAGE_MAX,
    WEAPON_FIRE_RATES, WEAPON_RANGE, TILE_SIZE
} from './constants.js';

const WEAPON_NAMES = ['knife', 'pistol', 'machinegun', 'chaingun'];

export class WeaponSystem {
    constructor(map, enemyManager) {
        this.map = map;
        this.enemyManager = enemyManager;
        this.cooldown = 0;
        this.firing = false;
        this.animFrame = 0;
        this.animTimer = 0;

        // Generate weapon sprite canvases
        this.weaponSprites = this.generateWeaponSprites();

        // Canvas overlay for weapon display — remove old one on restart
        const old = document.getElementById('weapon-overlay');
        if (old) old.remove();
        this.canvas = document.createElement('canvas');
        this.canvas.width = 320;
        this.canvas.height = 320;
        this.canvas.id = 'weapon-overlay';
        this.canvas.style.cssText = `
            position: absolute;
            bottom: clamp(48px, 6vh, 72px);
            left: 50%;
            transform: translateX(-50%);
            width: 50vw;
            height: 50vw;
            max-width: 640px;
            max-height: 640px;
            min-width: 280px;
            min-height: 280px;
            image-rendering: pixelated;
            pointer-events: none;
            z-index: 10;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }

    generateWeaponSprites() {
        // Try VSWAP weapon sprites first — each weapon has 5 frames: 1 idle + 4 attack
        const loader = window._vswapLoader;
        if (loader) {
            const WEAPON_VSWAP = {
                knife:      { base: 416 },
                pistol:     { base: 421 },
                machinegun: { base: 426 },
                chaingun:   { base: 431 },
            };
            const sprites = {};
            let allOk = true;
            for (const name of WEAPON_NAMES) {
                const base = WEAPON_VSWAP[name].base;
                const frames = [];
                for (let i = 0; i < 5; i++) {
                    const frame = loader.getSpriteTexture(base + i);
                    if (!frame) { allOk = false; break; }
                    frames.push(frame);
                }
                if (!allOk) break;
                sprites[name] = { idle: frames[0], atk1: frames[1], atk2: frames[2], atk3: frames[3], atk4: frames[4] };
            }
            if (allOk) return sprites;
        }

        // Fallback to procedural (2-frame only)
        const sprites = {};
        for (const name of WEAPON_NAMES) {
            const idle = this.drawWeapon(name, false);
            const fire = this.drawWeapon(name, true);
            sprites[name] = { idle, atk1: fire, atk2: fire, atk3: idle, atk4: idle };
        }
        return sprites;
    }

    drawWeapon(name, firing) {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d');

        const cx = 64;
        const by = firing ? -6 : 0;  // bob offset when firing

        if (name === 'knife') {
            this.drawKnife(ctx, cx, by, firing);
        } else if (name === 'pistol') {
            this.drawPistol(ctx, cx, by, firing);
        } else if (name === 'machinegun') {
            this.drawMachineGun(ctx, cx, by, firing);
        } else {
            this.drawChaingun(ctx, cx, by, firing);
        }

        return c;
    }

    // Wolf3D skin tones
    get skin0() { return '#D8A878'; }
    get skin1() { return '#C89868'; }
    get skin2() { return '#B08050'; }
    // Wolf3D brown uniform
    get uni0() { return '#8C6C2C'; }
    get uni1() { return '#7C5C1C'; }
    get uni2() { return '#6C4C0C'; }
    // Wolf3D gun metal
    get gun0() { return '#78787C'; }
    get gun1() { return '#585860'; }
    get gun2() { return '#3C3C44'; }
    get gun3() { return '#24242C'; }

    drawKnife(ctx, cx, by, firing) {
        // Wolf3D knife: arm from bottom-right, big combat knife
        // In original, the hand comes from lower right with knife pointing up-left

        if (firing) {
            // === Slash frame — arm swung across, blade horizontal ===
            // Sleeve
            ctx.fillStyle = this.uni1;
            ctx.fillRect(50, 100, 40, 28);
            ctx.fillStyle = this.uni2;
            ctx.fillRect(52, 98, 36, 4);

            // Forearm (rotated, going left)
            ctx.fillStyle = this.skin0;
            ctx.fillRect(30, 76, 38, 20);
            ctx.fillStyle = this.skin1;
            ctx.fillRect(32, 74, 34, 4);

            // Fist
            ctx.fillStyle = this.skin0;
            ctx.fillRect(18, 72, 18, 20);
            // Finger wraps
            ctx.fillStyle = this.skin1;
            ctx.fillRect(20, 74, 4, 14);
            ctx.fillRect(26, 74, 4, 14);
            ctx.fillStyle = this.skin2;
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
            ctx.fillStyle = this.uni1;
            ctx.fillRect(58, 104 + by, 36, 24);
            ctx.fillStyle = this.uni0;
            ctx.fillRect(60, 102 + by, 32, 4);
            ctx.fillStyle = this.uni2;
            ctx.fillRect(56, 104 + by, 4, 20);

            // Forearm
            ctx.fillStyle = this.skin0;
            ctx.fillRect(56, 84 + by, 28, 22);
            ctx.fillStyle = this.skin1;
            ctx.fillRect(54, 86 + by, 4, 16);
            // Wrist
            ctx.fillStyle = this.skin1;
            ctx.fillRect(58, 82 + by, 24, 4);

            // Fist gripping handle
            ctx.fillStyle = this.skin0;
            ctx.fillRect(54, 68 + by, 24, 16);
            // Fingers
            ctx.fillStyle = this.skin1;
            ctx.fillRect(56, 70 + by, 5, 10);
            ctx.fillRect(62, 70 + by, 5, 10);
            ctx.fillRect(68, 70 + by, 5, 10);
            ctx.fillStyle = this.skin2;
            ctx.fillRect(54, 76 + by, 24, 2);
            // Thumb
            ctx.fillStyle = this.skin0;
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

    drawPistol(ctx, cx, by, firing) {
        // Wolf3D Luger-style pistol, centered, held from below
        // In original W3D the barrel is very prominent — chrome rings visible at center screen

        // === Sleeve ===
        ctx.fillStyle = this.uni1;
        ctx.fillRect(cx - 14, 112 + by, 40, 16);
        ctx.fillStyle = this.uni0;
        ctx.fillRect(cx - 12, 110 + by, 36, 4);
        ctx.fillStyle = this.uni2;
        ctx.fillRect(cx + 24, 112 + by, 4, 12);

        // === Forearm ===
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx - 8, 90 + by, 28, 22);
        ctx.fillStyle = this.skin1;
        ctx.fillRect(cx - 6, 88 + by, 24, 4);
        ctx.fillStyle = this.skin2;
        ctx.fillRect(cx - 10, 94 + by, 4, 14);  // shadow side

        // === Hand ===
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx - 10, 72 + by, 32, 20);
        // Fingers wrapping around grip
        ctx.fillStyle = this.skin1;
        ctx.fillRect(cx - 8, 74 + by, 6, 14);   // finger 1
        ctx.fillRect(cx - 1, 74 + by, 6, 14);    // finger 2
        ctx.fillRect(cx + 6, 74 + by, 6, 14);    // finger 3
        ctx.fillRect(cx + 13, 74 + by, 6, 14);   // finger 4
        // Finger separation shadows
        ctx.fillStyle = this.skin2;
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
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx - 14, 68 + by, 7, 14);
        ctx.fillStyle = '#E0B888';
        ctx.fillRect(cx - 13, 69 + by, 5, 3);

        // === Pistol grip (angled back slightly) ===
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx - 1, 64 + by, 16, 22);
        // Grip panels (checkered texture)
        ctx.fillStyle = this.gun1;
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(cx + 1, 66 + by + i * 4, 12, 1);
        }
        ctx.fillStyle = '#2C2C34';
        ctx.fillRect(cx, 64 + by, 14, 1);  // top edge

        // === Receiver/frame ===
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 4, 40 + by, 22, 26);
        // Frame highlight
        ctx.fillStyle = this.gun0;
        ctx.fillRect(cx - 3, 40 + by, 20, 2);
        // Frame shadow
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 16, 42 + by, 2, 22);

        // === Slide ===
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx - 1, 34 + by, 16, 8);
        // Slide serrations
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx, 35 + by, 14, 1);
        ctx.fillRect(cx, 37 + by, 14, 1);
        ctx.fillRect(cx, 39 + by, 14, 1);

        // === Barrel (prominent chrome barrel with rings — key Wolf3D visual) ===
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx + 1, 18 + by, 12, 18);
        // Toggle mechanism (Luger feature)
        ctx.fillStyle = this.gun0;
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
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 6, 2 + by, 2, 3);

        // === Trigger guard ===
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 6, 62 + by, 20, 3);
        ctx.fillRect(cx - 6, 62 + by, 2, 8);
        // Trigger
        ctx.fillStyle = this.gun2;
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

    drawMachineGun(ctx, cx, by, firing) {
        // Wolf3D MP40: two hands, barrel shroud with holes, side magazine

        // === Right sleeve + arm ===
        ctx.fillStyle = this.uni1;
        ctx.fillRect(cx + 8, 108 + by, 26, 20);
        ctx.fillStyle = this.uni0;
        ctx.fillRect(cx + 10, 106 + by, 22, 4);
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx + 8, 88 + by, 20, 20);

        // === Left sleeve + arm ===
        ctx.fillStyle = this.uni1;
        ctx.fillRect(cx - 22, 108 + by, 26, 20);
        ctx.fillStyle = this.uni0;
        ctx.fillRect(cx - 20, 106 + by, 22, 4);
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx - 18, 78 + by, 18, 30);

        // === Right hand (on grip) ===
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx + 4, 76 + by, 18, 14);
        ctx.fillStyle = this.skin1;
        ctx.fillRect(cx + 6, 78 + by, 4, 10);
        ctx.fillRect(cx + 12, 78 + by, 4, 10);
        ctx.fillStyle = '#E0B888';
        ctx.fillRect(cx + 7, 80 + by, 3, 2);
        ctx.fillRect(cx + 13, 80 + by, 3, 2);

        // === Left hand (gripping barrel shroud) ===
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx - 14, 60 + by, 18, 14);
        ctx.fillStyle = this.skin1;
        ctx.fillRect(cx - 12, 62 + by, 4, 8);
        ctx.fillRect(cx - 6, 62 + by, 4, 8);
        ctx.fillStyle = this.skin2;
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
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 6, 72 + by, 10, 16);
        ctx.fillStyle = '#2C2C34';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(cx + 8, 74 + by + i * 4, 6, 1);
        }

        // === Receiver ===
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 6, 46 + by, 26, 28);
        ctx.fillStyle = this.gun0;
        ctx.fillRect(cx - 4, 46 + by, 22, 2);  // top highlight
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 18, 48 + by, 2, 24); // right shadow
        // Bolt handle (right side)
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 18, 54 + by, 6, 4);
        ctx.fillStyle = this.gun0;
        ctx.fillRect(cx + 22, 54 + by, 3, 3);  // knob

        // === Magazine (stick mag, below and right) ===
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 16, 62 + by, 6, 24);
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx + 17, 64 + by, 4, 1);
        ctx.fillRect(cx + 17, 70 + by, 4, 1);
        ctx.fillRect(cx + 17, 76 + by, 4, 1);

        // === Barrel shroud (perforated) ===
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 4, 22 + by, 20, 26);
        // Perforation holes (distinctive MP40 look)
        ctx.fillStyle = this.gun2;
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx - 2, 26 + by + i * 6, 4, 3);
            ctx.fillRect(cx + 8, 26 + by + i * 6, 4, 3);
        }
        // Shroud highlight
        ctx.fillStyle = this.gun0;
        ctx.fillRect(cx + 4, 24 + by, 4, 22);

        // === Muzzle ===
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 1, 14 + by, 10, 10);
        ctx.fillStyle = this.gun3;
        ctx.fillRect(cx + 3, 12 + by, 6, 4);
        // Bore
        ctx.fillStyle = '#101014';
        ctx.fillRect(cx + 4, 10 + by, 4, 4);
        // Front sight
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 5, 8 + by, 2, 4);

        // === Trigger guard ===
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 2, 70 + by, 14, 3);
        ctx.fillStyle = this.gun2;
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

    drawChaingun(ctx, cx, by, firing) {
        // Wolf3D gatling gun: massive, 4 barrels, ammo belt, two-handed

        // === Sleeves ===
        ctx.fillStyle = this.uni1;
        ctx.fillRect(cx - 26, 108 + by, 30, 20);
        ctx.fillRect(cx + 10, 108 + by, 30, 20);
        ctx.fillStyle = this.uni0;
        ctx.fillRect(cx - 24, 106 + by, 26, 4);
        ctx.fillRect(cx + 12, 106 + by, 26, 4);

        // === Arms ===
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx - 22, 86 + by, 18, 24);
        ctx.fillRect(cx + 16, 86 + by, 18, 24);
        ctx.fillStyle = this.skin1;
        ctx.fillRect(cx - 24, 90 + by, 4, 16);
        ctx.fillRect(cx + 32, 90 + by, 4, 16);

        // === Left hand (supporting front) ===
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx - 18, 66 + by, 20, 16);
        ctx.fillStyle = this.skin1;
        ctx.fillRect(cx - 16, 68 + by, 4, 10);
        ctx.fillRect(cx - 10, 68 + by, 4, 10);
        ctx.fillRect(cx - 4, 68 + by, 4, 10);
        ctx.fillStyle = this.skin2;
        ctx.fillRect(cx - 18, 76 + by, 20, 2);

        // === Right hand (on grip) ===
        ctx.fillStyle = this.skin0;
        ctx.fillRect(cx + 10, 74 + by, 18, 14);
        ctx.fillStyle = this.skin1;
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
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 10, 76 + by, 8, 16);

        // === Massive receiver ===
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 14, 42 + by, 38, 32);
        ctx.fillStyle = this.gun0;
        ctx.fillRect(cx - 12, 42 + by, 34, 2);
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 22, 44 + by, 2, 28);

        // === Barrel cluster (4 barrels) ===
        // Barrel shroud
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 10, 20 + by, 30, 24);
        ctx.fillStyle = this.gun0;
        ctx.fillRect(cx - 8, 22 + by, 6, 20);
        ctx.fillRect(cx + 12, 22 + by, 6, 20);

        // 4 individual barrels
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx - 6, 6 + by, 6, 18);   // barrel 1
        ctx.fillRect(cx + 2, 6 + by, 6, 18);    // barrel 2
        ctx.fillRect(cx + 10, 6 + by, 6, 18);   // barrel 3
        ctx.fillStyle = this.gun1;
        ctx.fillRect(cx - 2, 8 + by, 4, 16);    // barrel 4 (recessed)

        // Muzzles
        ctx.fillStyle = this.gun3;
        ctx.fillRect(cx - 5, 4 + by, 4, 4);
        ctx.fillRect(cx + 3, 4 + by, 4, 4);
        ctx.fillRect(cx + 11, 4 + by, 4, 4);
        // Bores
        ctx.fillStyle = '#101014';
        ctx.fillRect(cx - 4, 2 + by, 2, 4);
        ctx.fillRect(cx + 4, 2 + by, 2, 4);
        ctx.fillRect(cx + 12, 2 + by, 2, 4);

        // Barrel clamp
        ctx.fillStyle = this.gun0;
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
        ctx.fillStyle = this.gun2;
        ctx.fillRect(cx + 18, 46 + by, 6, 8);
        ctx.fillStyle = this.gun0;
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

    update(dt, player, input) {
        this.cooldown = Math.max(0, this.cooldown - dt);

        const switchTo = input.weaponSwitch();
        if (switchTo >= 0 && player.weapons[switchTo]) {
            player.currentWeapon = switchTo;
            this.animFrame = 0;
            this.animTimer = 0;
        }

        const wantsFire = input.isFiring();
        if (wantsFire && this.cooldown <= 0) {
            this.fire(player);
        }

        // 4-frame attack animation
        if (this.animFrame > 0) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) {
                this.animFrame++;
                if (this.animFrame > 4) {
                    this.animFrame = 0;
                } else {
                    this.animTimer = this.animFrameDuration;
                }
            }
        }

        this.updateOverlay(player);
    }

    fire(player) {
        const weapon = player.currentWeapon;
        const fireRate = WEAPON_FIRE_RATES[weapon];

        if (weapon !== WEAPON_KNIFE && player.ammo <= 0) return;
        if (weapon !== WEAPON_KNIFE) player.ammo--;

        this.cooldown = fireRate;
        this.animFrame = 1;
        this.animFrameDuration = fireRate / 4;
        this.animTimer = this.animFrameDuration;

        this.enemyManager.alertNearby(player.x, player.z);

        const range = WEAPON_RANGE[weapon];
        const dirX = -Math.sin(player.angle);
        const dirZ = -Math.cos(player.angle);

        let closestEnemy = null;
        let closestDist = range;

        for (const enemy of this.enemyManager.enemies) {
            if (!enemy.alive) continue;

            const dx = enemy.x - player.x;
            const dz = enemy.z - player.z;

            const dot = dx * dirX + dz * dirZ;
            if (dot < 0 || dot > range) continue;

            const perpX = dx - dirX * dot;
            const perpZ = dz - dirZ * dot;
            const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);

            if (perpDist < 0.5 && dot < closestDist) {
                if (this.hasLineOfSight(player.x, player.z, enemy.x, enemy.z)) {
                    closestDist = dot;
                    closestEnemy = enemy;
                }
            }
        }

        if (closestEnemy) {
            const damage = WEAPON_DAMAGE_MIN + Math.random() * (WEAPON_DAMAGE_MAX - WEAPON_DAMAGE_MIN);
            this.enemyManager.hitEnemy(closestEnemy, Math.round(damage), player);
        }

        return { hit: !!closestEnemy, weapon };
    }

    hasLineOfSight(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const steps = Math.ceil(dist / 0.5);

        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const cx = x1 + dx * t;
            const cz = z1 + dz * t;
            if (this.map.isSolid(Math.floor(cx / TILE_SIZE), Math.floor(cz / TILE_SIZE))) {
                return false;
            }
        }
        return true;
    }

    updateOverlay(player) {
        const name = WEAPON_NAMES[player.currentWeapon];
        const frameNames = ['idle', 'atk1', 'atk2', 'atk3', 'atk4'];
        const frameName = frameNames[this.animFrame] || 'idle';
        const sprite = this.weaponSprites[name]?.[frameName];
        this.ctx.clearRect(0, 0, 320, 320);
        if (sprite) {
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(sprite, 0, 0, 320, 320);
        }
    }
}

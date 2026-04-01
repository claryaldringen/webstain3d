import * as THREE from 'three';
import { TILE_SIZE, WALL_HEIGHT, DOOR_OPEN_TIME, DOOR_STAY_TIME, DOOR_CLOSE_TIME } from './constants.js';

const DOOR_STATE = { CLOSED: 0, OPENING: 1, OPEN: 2, CLOSING: 3 };

function createDoorTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');

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

    // Subtle noise for texture
    const imgData = ctx.getImageData(0, 0, 64, 64);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 6;
        imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
        imgData.data[i+1] = Math.max(0, Math.min(255, imgData.data[i+1] + n));
        imgData.data[i+2] = Math.max(0, Math.min(255, imgData.data[i+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    return c;
}

function createGoldDoorTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');

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

    // Subtle noise for texture
    const imgData = ctx.getImageData(0, 0, 64, 64);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 6;
        imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
        imgData.data[i+1] = Math.max(0, Math.min(255, imgData.data[i+1] + n));
        imgData.data[i+2] = Math.max(0, Math.min(255, imgData.data[i+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    return c;
}

function createSilverDoorTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');

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

    // Subtle noise for texture
    const imgData = ctx.getImageData(0, 0, 64, 64);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const n = (Math.random() - 0.5) * 6;
        imgData.data[i] = Math.max(0, Math.min(255, imgData.data[i] + n));
        imgData.data[i+1] = Math.max(0, Math.min(255, imgData.data[i+1] + n));
        imgData.data[i+2] = Math.max(0, Math.min(255, imgData.data[i+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    return c;
}

export class DoorManager {
    constructor(renderer, map) {
        this.renderer = renderer;
        this.map = map;
        this.doors = [];
        this.pushwalls = [];
    }

    init(doorData) {
        for (const d of doorData) {
            // Auto-detect orientation from neighboring walls
            // Count wall neighbors on each axis (including 2-tile range for longer walls)
            const n = this.map.getWallId(d.x, d.y - 1) > 0 ? 1 : 0;
            const s = this.map.getWallId(d.x, d.y + 1) > 0 ? 1 : 0;
            const w = this.map.getWallId(d.x - 1, d.y) > 0 ? 1 : 0;
            const e = this.map.getWallId(d.x + 1, d.y) > 0 ? 1 : 0;
            const nsScore = n + s;
            const ewScore = w + e;
            // If more walls on N/S axis, door is in a vertical wall (blocks E-W)
            // If equal, check 2nd neighbors to break tie
            let autoOrientation;
            if (nsScore > ewScore) {
                autoOrientation = 'vertical';
            } else if (ewScore > nsScore) {
                autoOrientation = 'horizontal';
            } else {
                // Tie-break: check 2nd-level neighbors
                const n2 = this.map.getWallId(d.x, d.y - 2) > 0 ? 1 : 0;
                const s2 = this.map.getWallId(d.x, d.y + 2) > 0 ? 1 : 0;
                const w2 = this.map.getWallId(d.x - 2, d.y) > 0 ? 1 : 0;
                const e2 = this.map.getWallId(d.x + 2, d.y) > 0 ? 1 : 0;
                autoOrientation = (n + s + n2 + s2) > (w + e + w2 + e2) ? 'vertical' : 'horizontal';
            }

            const door = {
                x: d.x,
                y: d.y,
                type: d.type || 'normal',
                orientation: autoOrientation,
                state: DOOR_STATE.CLOSED,
                progress: 0,
                stayTimer: 0,
                mesh: null,
            };

            const geo = new THREE.PlaneGeometry(TILE_SIZE, WALL_HEIGHT);
            let mat;
            if (door.type === 'gold') {
                const goldCanvas = createGoldDoorTexture();
                const goldTex = new THREE.CanvasTexture(goldCanvas);
                goldTex.magFilter = THREE.NearestFilter;
                goldTex.minFilter = THREE.NearestFilter;
                mat = new THREE.MeshBasicMaterial({ map: goldTex, side: THREE.DoubleSide });
            } else if (door.type === 'silver') {
                const silverCanvas = createSilverDoorTexture();
                const silverTex = new THREE.CanvasTexture(silverCanvas);
                silverTex.magFilter = THREE.NearestFilter;
                silverTex.minFilter = THREE.NearestFilter;
                mat = new THREE.MeshBasicMaterial({ map: silverTex, side: THREE.DoubleSide });
            } else {
                const doorCanvas = createDoorTexture();
                const doorTex = new THREE.CanvasTexture(doorCanvas);
                doorTex.magFilter = THREE.NearestFilter;
                doorTex.minFilter = THREE.NearestFilter;
                mat = new THREE.MeshBasicMaterial({ map: doorTex, side: THREE.DoubleSide });
            }

            door.mesh = new THREE.Mesh(geo, mat);
            door.mesh.position.set(
                d.x * TILE_SIZE + TILE_SIZE / 2,
                WALL_HEIGHT / 2,
                d.y * TILE_SIZE + TILE_SIZE / 2
            );

            if (autoOrientation === 'vertical') {
                door.mesh.rotation.y = Math.PI / 2;
            }

            door.closedPosition = door.mesh.position.clone();
            this.renderer.scene.add(door.mesh);
            this.doors.push(door);
        }
    }

    tryOpen(player) {
        const lookX = player.x + (-Math.sin(player.angle)) * 1.0;
        const lookZ = player.z + (-Math.cos(player.angle)) * 1.0;
        const tileX = Math.floor(lookX / TILE_SIZE);
        const tileZ = Math.floor(lookZ / TILE_SIZE);

        for (const door of this.doors) {
            if (door.x === tileX && door.y === tileZ && door.state === DOOR_STATE.CLOSED) {
                if (door.type === 'gold' && !player.hasKey('gold')) {
                    return 'locked_gold';
                }
                if (door.type === 'silver' && !player.hasKey('silver')) {
                    return 'locked_silver';
                }
                door.state = DOOR_STATE.OPENING;
                return 'opening';
            }
        }
        return null;
    }

    update(dt) {
        for (const door of this.doors) {
            if (door.state === DOOR_STATE.OPENING) {
                door.progress += dt / DOOR_OPEN_TIME;
                if (door.progress >= 1) {
                    door.progress = 1;
                    door.state = DOOR_STATE.OPEN;
                    door.stayTimer = DOOR_STAY_TIME;
                    this.map.walls[door.y][door.x] = 0;
                }
            } else if (door.state === DOOR_STATE.OPEN) {
                door.stayTimer -= dt;
                if (door.stayTimer <= 0) {
                    door.state = DOOR_STATE.CLOSING;
                }
            } else if (door.state === DOOR_STATE.CLOSING) {
                door.progress -= dt / DOOR_CLOSE_TIME;
                if (door.progress <= 0) {
                    door.progress = 0;
                    door.state = DOOR_STATE.CLOSED;
                    this.map.walls[door.y][door.x] = -1;
                }
            }

            if (door.mesh) {
                const offset = door.progress * TILE_SIZE;
                if (door.orientation === 'horizontal') {
                    door.mesh.position.x = door.closedPosition.x + offset;
                } else {
                    door.mesh.position.z = door.closedPosition.z + offset;
                }
            }
        }
    }

    isDoorTile(x, y) {
        return this.doors.some(d => d.x === x && d.y === y);
    }

    initPushwalls(pushwallData) {
        this.pushwalls = [];
        for (const pw of pushwallData) {
            this.pushwalls.push({
                x: pw.x,
                y: pw.y,
                textureId: pw.textureId,
                state: 'closed',
                progress: 0,
                mesh: null,
                dirX: 0,
                dirZ: 0,
            });
        }
    }

    tryPushWall(player) {
        const lookX = player.x + (-Math.sin(player.angle)) * 1.0;
        const lookZ = player.z + (-Math.cos(player.angle)) * 1.0;
        const tileX = Math.floor(lookX / TILE_SIZE);
        const tileZ = Math.floor(lookZ / TILE_SIZE);

        for (const pw of this.pushwalls) {
            if (pw.x === tileX && pw.y === tileZ && pw.state === 'closed') {
                const dx = tileX + 0.5 - player.x / TILE_SIZE;
                const dz = tileZ + 0.5 - player.z / TILE_SIZE;

                if (Math.abs(dx) > Math.abs(dz)) {
                    pw.dirX = dx > 0 ? 1 : -1;
                    pw.dirZ = 0;
                } else {
                    pw.dirX = 0;
                    pw.dirZ = dz > 0 ? 1 : -1;
                }

                pw.state = 'moving';
                return 'secret';
            }
        }
        return null;
    }

    updatePushwalls(dt) {
        for (const pw of this.pushwalls) {
            if (pw.state !== 'moving') continue;

            pw.progress += dt * 0.5;
            if (pw.progress >= 2.0) {
                pw.progress = 2.0;
                pw.state = 'open';
            }

            this.map.walls[pw.y][pw.x] = 0;
        }
    }
}

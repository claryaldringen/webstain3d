import * as THREE from 'three';
import { TILE_SIZE, WALL_HEIGHT, DOOR_OPEN_TIME, DOOR_STAY_TIME, DOOR_CLOSE_TIME } from './constants.js';

const DOOR_STATE = { CLOSED: 0, OPENING: 1, OPEN: 2, CLOSING: 3 };

export class DoorManager {
    constructor(renderer, map) {
        this.renderer = renderer;
        this.map = map;
        this.doors = [];
        this.pushwalls = [];
    }

    init(doorData) {
        for (const d of doorData) {
            const door = {
                x: d.x,
                y: d.y,
                type: d.type || 'normal',
                orientation: d.orientation,
                state: DOOR_STATE.CLOSED,
                progress: 0,
                stayTimer: 0,
                mesh: null,
            };

            const geo = new THREE.PlaneGeometry(TILE_SIZE, WALL_HEIGHT);
            let mat;
            const colors = { normal: 0x8B4513, gold: 0xFFD700, silver: 0xC0C0C0 };
            mat = new THREE.MeshBasicMaterial({ color: colors[door.type] || 0x8B4513, side: THREE.DoubleSide });

            door.mesh = new THREE.Mesh(geo, mat);
            door.mesh.position.set(
                d.x * TILE_SIZE + TILE_SIZE / 2,
                WALL_HEIGHT / 2,
                d.y * TILE_SIZE + TILE_SIZE / 2
            );

            if (d.orientation === 'horizontal') {
                door.mesh.rotation.y = Math.PI / 2;
            }

            door.closedPosition = door.mesh.position.clone();
            this.renderer.scene.add(door.mesh);
            this.doors.push(door);
        }
    }

    tryOpen(player) {
        const lookX = player.x + Math.cos(player.angle) * 1.5;
        const lookZ = player.z - Math.sin(player.angle) * 1.5;
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
                if (door.orientation === 'vertical') {
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
        const lookX = player.x + Math.cos(player.angle) * 1.5;
        const lookZ = player.z - Math.sin(player.angle) * 1.5;
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

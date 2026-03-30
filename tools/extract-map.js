#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const RLEW_TAG = 0xABCD;

function carmackDecompress(data) {
    const result = [];
    let i = 0;
    const decompressedSize = data[0] | (data[1] << 8);
    i = 2;

    while (result.length < decompressedSize && i < data.length) {
        const low = data[i++];
        const high = data[i++];

        if (high === 0xA7) {
            if (low === 0) {
                result.push(0xA7);
                result.push(data[i++]);
            } else {
                const offset = data[i++] | (data[i++] << 8);
                for (let j = 0; j < low; j++) {
                    result.push(result[offset * 2 + j * 2] || 0);
                    result.push(result[offset * 2 + j * 2 + 1] || 0);
                }
            }
        } else if (high === 0xA8) {
            if (low === 0) {
                result.push(0xA8);
                result.push(data[i++]);
            } else {
                const offset = result.length - (data[i++] * 2);
                for (let j = 0; j < low; j++) {
                    result.push(result[offset + j * 2] || 0);
                    result.push(result[offset + j * 2 + 1] || 0);
                }
            }
        } else {
            result.push(low);
            result.push(high);
        }
    }
    return Buffer.from(result);
}

function rlewDecompress(data, expectedSize) {
    const result = [];
    let i = 0;
    while (i < data.length - 1 && result.length < expectedSize) {
        const word = data[i] | (data[i + 1] << 8);
        i += 2;
        if (word === RLEW_TAG) {
            const count = data[i] | (data[i + 1] << 8);
            const value = data[i + 2] | (data[i + 3] << 8);
            i += 4;
            for (let j = 0; j < count; j++) {
                result.push(value);
            }
        } else {
            result.push(word);
        }
    }
    return result;
}

const [,, mapheadPath, gamemapsPath, levelStr, outPath] = process.argv;
if (!mapheadPath || !gamemapsPath || !outPath) {
    console.error('Usage: node extract-map.js <MAPHEAD.WL1> <GAMEMAPS.WL1> <level-number> <output.json>');
    process.exit(1);
}

const level = parseInt(levelStr || '0');
const headBuf = readFileSync(mapheadPath);
const mapsBuf = readFileSync(gamemapsPath);
const headView = new DataView(headBuf.buffer, headBuf.byteOffset, headBuf.byteLength);
const mapsView = new DataView(mapsBuf.buffer, mapsBuf.byteOffset, mapsBuf.byteLength);

const mapOffset = headView.getUint32(2 + level * 4, true);
console.log(`Level ${level} offset: ${mapOffset}`);

const plane0Offset = mapsView.getUint32(mapOffset, true);
const plane1Offset = mapsView.getUint32(mapOffset + 4, true);
const plane0Size = mapsView.getUint16(mapOffset + 12, true);
const plane1Size = mapsView.getUint16(mapOffset + 14, true);
const width = mapsView.getUint16(mapOffset + 18, true);
const height = mapsView.getUint16(mapOffset + 20, true);

console.log(`Map size: ${width}x${height}`);

const plane0Raw = mapsBuf.slice(plane0Offset, plane0Offset + plane0Size);
const plane0Carmack = carmackDecompress(plane0Raw);
const plane0 = rlewDecompress(plane0Carmack.slice(2), width * height);

const plane1Raw = mapsBuf.slice(plane1Offset, plane1Offset + plane1Size);
const plane1Carmack = carmackDecompress(plane1Raw);
const plane1 = rlewDecompress(plane1Carmack.slice(2), width * height);

const walls = [];
const entities = [];
const doors = [];
let playerStart = null;

for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
        const wallVal = plane0[y * width + x];

        if (wallVal >= 1 && wallVal <= 63) {
            row.push(wallVal);
        } else if (wallVal >= 90 && wallVal <= 101) {
            row.push(0);
            const isVertical = wallVal % 2 === 0;
            const doorType = wallVal >= 92 && wallVal <= 93 ? 'gold'
                           : wallVal >= 94 && wallVal <= 95 ? 'silver'
                           : 'normal';
            doors.push({ x, y, type: doorType, orientation: isVertical ? 'vertical' : 'horizontal' });
        } else {
            row.push(0);
        }

        const objVal = plane1[y * width + x];

        if (objVal >= 19 && objVal <= 22) {
            const angles = [90, 0, 270, 180];
            playerStart = { x: x, y: y, angle: angles[objVal - 19] };
        }

        if (objVal >= 108 && objVal <= 111) {
            const angles = [90, 0, 270, 180];
            entities.push({ type: 'guard', x: x + 0.5, y: y + 0.5, angle: angles[objVal - 108] });
        }

        if (objVal >= 126 && objVal <= 129) {
            const angles = [90, 0, 270, 180];
            entities.push({ type: 'ss', x: x + 0.5, y: y + 0.5, angle: angles[objVal - 126] });
        }

        if (objVal >= 138 && objVal <= 141) {
            const angles = [90, 0, 270, 180];
            entities.push({ type: 'dog', x: x + 0.5, y: y + 0.5, angle: angles[objVal - 138] });
        }

        const itemMap = {
            29: 'ammo_clip', 43: 'food', 44: 'medkit', 47: 'cross',
            48: 'chalice', 49: 'chest', 50: 'crown', 51: 'extra_life',
            52: 'first_aid', 53: 'key_gold', 54: 'key_silver',
            55: 'machine_gun', 56: 'chaingun',
        };
        if (itemMap[objVal]) {
            entities.push({ type: 'item', subtype: itemMap[objVal], x: x + 0.5, y: y + 0.5 });
        }
    }
    walls.push(row);
}

const levelData = {
    width, height, walls, doors,
    pushwalls: [],
    entities,
    playerStart: playerStart || { x: 1.5, y: 1.5, angle: 0 },
    exitTile: null,
};

writeFileSync(outPath, JSON.stringify(levelData, null, 2));
console.log(`Level ${level} exported to ${outPath}`);
console.log(`Entities: ${entities.length}, Doors: ${doors.length}`);

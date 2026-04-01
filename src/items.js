import { ITEM_EFFECTS, TILE_SIZE } from './constants.js';

export class ItemManager {
    constructor(spriteManager) {
        this.spriteManager = spriteManager;
        this.items = [];
    }

    init(entityData) {
        for (const e of entityData) {
            // Handle decorative lamps (non-collectible ceiling sprites)
            if (e.type === 'item' && e.subtype === 'lamp') {
                const x = (e.x + 0.5) * TILE_SIZE;
                const z = (e.y + 0.5) * TILE_SIZE;
                this.spriteManager.create('', x, z, {
                    width: 1.0,
                    height: 1.0,
                    anchorBottom: true,
                    label: e.subtype,
                    color: '#00CC44',
                });
                continue;
            }

            if (e.type !== 'item') continue;

            const texPath = `assets/sprites/item_${e.subtype}.png`;
            const x = (e.x + 0.5) * TILE_SIZE;
            const z = (e.y + 0.5) * TILE_SIZE;
            const itemColors = {
                ammo_clip: '#CCAA00', ammo_stack: '#CCAA00',
                medkit: '#FFFFFF', food: '#44AA44', first_aid: '#FF4444',
                cross: '#FFD700', chalice: '#FFD700', chest: '#FFD700', crown: '#FFD700',
                key_gold: '#FFD700', key_silver: '#C0C0C0',
                machine_gun: '#888888', chaingun: '#888888',
                extra_life: '#44FF44',
            };
            const sprite = this.spriteManager.create(texPath, x, z, {
                width: 1.0,
                height: 1.0,
                anchorBottom: true,
                label: e.subtype,
                color: itemColors[e.subtype] || '#FF00FF',
            });

            this.items.push({
                sprite,
                subtype: e.subtype,
                x,
                z,
                collected: false,
            });
        }
    }

    update(player) {
        const pickupRadius = 0.5;
        for (const item of this.items) {
            if (item.collected) continue;

            const dx = player.x - item.x;
            const dz = player.z - item.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < pickupRadius) {
                if (this.tryCollect(item, player)) {
                    item.collected = true;
                    this.spriteManager.remove(item.sprite);
                }
            }
        }
    }

    tryCollect(item, player) {
        const effect = ITEM_EFFECTS[item.subtype];
        if (!effect) return false;

        switch (effect.type) {
            case 'health':
                return player.heal(effect.value);
            case 'ammo':
                return player.addAmmo(effect.value);
            case 'score':
                player.addScore(effect.value);
                return true;
            case 'key':
                player.addKey(effect.value);
                return true;
            case 'life':
                player.lives += effect.value;
                return true;
            case 'weapon':
                player.addWeapon(effect.value);
                return true;
            default:
                return false;
        }
    }

    spawnDrop(subtype, x, z) {
        const itemColors = {
            ammo_clip: '#CCAA00', ammo_stack: '#CCAA00',
            machine_gun: '#888888', chaingun: '#888888',
        };
        const sprite = this.spriteManager.create('', x, z, {
            width: 0.6,
            height: 0.6,
            anchorBottom: true,
            label: subtype,
            color: itemColors[subtype] || '#FF00FF',
        });
        this.items.push({ sprite, subtype, x, z, collected: false });
    }

    get totalTreasures() {
        return this.items.filter(i => {
            const e = ITEM_EFFECTS[i.subtype];
            return e && e.type === 'score';
        }).length;
    }

    get collectedTreasures() {
        return this.items.filter(i => {
            const e = ITEM_EFFECTS[i.subtype];
            return e && e.type === 'score' && i.collected;
        }).length;
    }
}

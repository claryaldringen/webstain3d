import { ITEM_EFFECTS, TILE_SIZE } from './constants.js';

export class ItemManager {
    constructor(spriteManager) {
        this.spriteManager = spriteManager;
        this.items = [];
    }

    init(entityData) {
        for (const e of entityData) {
            if (e.type !== 'item') continue;

            const texPath = `assets/sprites/item_${e.subtype}.png`;
            const x = e.x * TILE_SIZE;
            const z = e.y * TILE_SIZE;
            const sprite = this.spriteManager.create(texPath, x, z, {
                width: 0.6,
                height: 0.6,
                anchorBottom: true,
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

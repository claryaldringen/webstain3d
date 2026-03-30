export class HUD {
    constructor() {
        this.els = {
            level: document.getElementById('hud-level'),
            score: document.getElementById('hud-score'),
            lives: document.getElementById('hud-lives'),
            health: document.getElementById('hud-health'),
            ammo: document.getElementById('hud-ammo'),
            face: document.getElementById('hud-face'),
            keyGold: document.getElementById('hud-key-gold'),
            keySilver: document.getElementById('hud-key-silver'),
        };
        this.lastHealth = -1;
    }

    update(player) {
        this.els.score.textContent = String(player.score).padStart(6, '0');
        this.els.lives.textContent = player.lives;
        this.els.health.textContent = player.health + '%';
        this.els.ammo.textContent = player.ammo;

        this.els.keyGold.classList.toggle('active', player.keys.gold);
        this.els.keySilver.classList.toggle('active', player.keys.silver);

        if (player.health !== this.lastHealth) {
            this.lastHealth = player.health;
            this.updateFace(player.health);
        }
    }

    updateFace(health) {
        let faceState;
        if (health > 75) faceState = 'healthy';
        else if (health > 50) faceState = 'hurt1';
        else if (health > 25) faceState = 'hurt2';
        else if (health > 0) faceState = 'hurt3';
        else faceState = 'dead';

        const facePath = `assets/sprites/face_${faceState}.png`;
        this.els.face.style.backgroundImage = `url(${facePath})`;

        const colors = { healthy: '#4a4', hurt1: '#aa4', hurt2: '#a84', hurt3: '#a44', dead: '#a22' };
        this.els.face.style.backgroundColor = colors[faceState] || '#888';
    }
}

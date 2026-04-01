export class Input {
    constructor() {
        this.keys = {};
        this.justPressed = {};

        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                 'Control', 'Alt', 'Shift', ' ', 'Escape',
                 '1', '2', '3', '4', 'z', 'Z'].includes(e.key)) {
                e.preventDefault();
            }
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    isDown(code) {
        return !!this.keys[code];
    }

    wasPressed(code) {
        return !!this.justPressed[code];
    }

    getMovement() {
        const forward = (this.isDown('ArrowUp') ? 1 : 0) - (this.isDown('ArrowDown') ? 1 : 0);
        const altHeld = this.isDown('AltLeft') || this.isDown('AltRight');
        let strafe = 0;
        let rotate = 0;

        if (altHeld) {
            strafe = (this.isDown('ArrowRight') ? 1 : 0) - (this.isDown('ArrowLeft') ? 1 : 0);
        } else {
            rotate = (this.isDown('ArrowLeft') ? 1 : 0) - (this.isDown('ArrowRight') ? 1 : 0);
        }

        const sprint = this.isDown('ShiftLeft') || this.isDown('ShiftRight');

        return { forward, strafe, rotate, sprint };
    }

    isFiring() {
        return this.isDown('ControlLeft') || this.isDown('ControlRight') || this.isDown('KeyZ');
    }

    isInteracting() {
        return this.wasPressed('Space');
    }

    weaponSwitch() {
        if (this.wasPressed('Digit1')) return 0;
        if (this.wasPressed('Digit2')) return 1;
        if (this.wasPressed('Digit3')) return 2;
        if (this.wasPressed('Digit4')) return 3;
        return -1;
    }

    isPausing() {
        return this.wasPressed('Escape');
    }

    anyKey() {
        return !!this.justPressed['Enter'] || !!this.justPressed['Space'];
    }

    endFrame() {
        this.justPressed = {};
    }
}

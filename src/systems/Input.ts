import type { MovementInput } from '../types/index.js';

const PREVENTED_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Control', 'Alt', 'Shift', ' ', 'Escape', 'Tab',
  '1', '2', '3', '4', 'z', 'Z',
]);

export class Input {
  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDown = (e: KeyboardEvent) => {
      if (PREVENTED_KEYS.has(e.key)) {
        e.preventDefault();
      }
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    };

    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  isDown(code: string): boolean {
    return !!this.keys[code];
  }

  wasPressed(code: string): boolean {
    return !!this.justPressed[code];
  }

  getMovement(): MovementInput {
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

  isFiring(): boolean {
    return this.isDown('ControlLeft') || this.isDown('ControlRight') || this.isDown('KeyZ');
  }

  isInteracting(): boolean {
    return this.wasPressed('Space');
  }

  weaponSwitch(): number {
    if (this.wasPressed('Digit1')) return 0;
    if (this.wasPressed('Digit2')) return 1;
    if (this.wasPressed('Digit3')) return 2;
    if (this.wasPressed('Digit4')) return 3;
    return -1;
  }

  isPausing(): boolean {
    return this.wasPressed('Escape');
  }

  anyKey(): boolean {
    return !!this.justPressed['Enter'] || !!this.justPressed['Space'];
  }

  isScoreboardHeld(): boolean {
    return this.isDown('Tab');
  }

  endFrame(): void {
    this.justPressed = {};
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.keys = {};
    this.justPressed = {};
  }
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Input } from '../../src/systems/Input.js';

describe('Input', () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
  });

  afterEach(() => {
    input.destroy();
  });

  it('tracks key press via wasPressed', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(input.wasPressed('Space')).toBe(true);
  });

  it('clears justPressed on endFrame', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    input.endFrame();
    expect(input.wasPressed('Space')).toBe(false);
  });

  it('reports isDown while key held', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    expect(input.isDown('ArrowUp')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));
    expect(input.isDown('ArrowUp')).toBe(false);
  });

  it('returns forward movement from ArrowUp', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    const m = input.getMovement();
    expect(m.forward).toBe(1);
    expect(m.strafe).toBe(0);
  });

  it('returns strafe when Alt+Arrow', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'AltLeft' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    const m = input.getMovement();
    expect(m.strafe).toBe(1);
    expect(m.rotate).toBe(0);
  });

  it('detects weapon switch', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3' }));
    expect(input.weaponSwitch()).toBe(2);
  });

  it('detects interaction (Space)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(input.isInteracting()).toBe(true);
  });

  it('detects firing (ControlLeft)', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ControlLeft' }));
    expect(input.isFiring()).toBe(true);
  });

  it('removes listeners on destroy', () => {
    input.destroy();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(input.wasPressed('Space')).toBe(false);
  });
});

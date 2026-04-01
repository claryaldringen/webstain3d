import type { PlayerSnapshot } from '../../shared/protocol.js';

export class Scoreboard {
  private container: HTMLDivElement;
  private visible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-family: monospace;
      font-size: 16px;
      padding: 20px;
      border: 2px solid #888;
      border-radius: 8px;
      z-index: 200;
      display: none;
      min-width: 300px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(players: PlayerSnapshot[], myId: string): void {
    this.visible = true;
    this.container.style.display = 'block';

    const sorted = [...players].sort((a, b) => b.score - a.score);
    const rows = sorted.map((p, i) => {
      const isMe = p.id === myId;
      const status = p.alive ? '' : ' [DEAD]';
      const style = isMe ? 'color: #FFD700; font-weight: bold;' : '';
      return `<div style="${style}">
        ${i + 1}. ${p.name} — ${p.score} pts (L${p.level})${status}
      </div>`;
    }).join('');

    this.container.innerHTML = `
      <div style="text-align: center; margin-bottom: 10px; font-size: 18px; color: #FFD700;">
        SCOREBOARD
      </div>
      ${rows}
    `;
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  get isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.container.remove();
  }
}

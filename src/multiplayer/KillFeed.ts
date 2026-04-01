interface KillEntry {
  text: string;
  time: number;
}

const FEED_DURATION = 5000;
const MAX_ENTRIES = 5;

export class KillFeed {
  private entries: KillEntry[] = [];
  private container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      pointer-events: none;
      z-index: 100;
      font-family: monospace;
      font-size: 14px;
    `;
    document.body.appendChild(this.container);
  }

  addKill(killer: string, victim: string): void {
    this.add(`${killer} killed ${victim}`);
  }

  addEnemyKill(player: string, enemyType: string): void {
    this.add(`${player} killed ${enemyType}`);
  }

  addMessage(text: string): void {
    this.add(text);
  }

  private add(text: string): void {
    this.entries.push({ text, time: Date.now() });
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift();
    }
    this.render();
  }

  update(): void {
    const now = Date.now();
    const before = this.entries.length;
    this.entries = this.entries.filter(e => now - e.time < FEED_DURATION);
    if (this.entries.length !== before) this.render();
  }

  private render(): void {
    const now = Date.now();
    this.container.innerHTML = this.entries.map(e => {
      const age = now - e.time;
      const opacity = Math.max(0, 1 - age / FEED_DURATION);
      return `<div style="
        background: rgba(0,0,0,0.7);
        color: #fff;
        padding: 4px 8px;
        border-radius: 3px;
        opacity: ${opacity};
        text-shadow: 1px 1px 2px #000;
      ">${e.text}</div>`;
    }).join('');
  }

  destroy(): void {
    this.container.remove();
  }
}

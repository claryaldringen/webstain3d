export class MultiplayerUI {
  private overlay: HTMLDivElement;
  private onJoin: ((name: string) => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 500;
      font-family: monospace;
      color: #fff;
    `;
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);
  }

  showJoinScreen(callback: (name: string) => void): void {
    this.onJoin = callback;
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = `
      <div style="text-align: center;">
        <h1 style="color: #CC0000; font-size: 36px; margin-bottom: 20px; text-shadow: 2px 2px #000;">
          WOLFENSTEIN 3D
        </h1>
        <h2 style="color: #FFD700; margin-bottom: 30px;">MULTIPLAYER</h2>
        <div style="margin-bottom: 20px;">
          <input id="mp-name" type="text" placeholder="Your name" maxlength="16"
            style="font-family: monospace; font-size: 18px; padding: 8px 16px;
                   background: #333; color: #fff; border: 2px solid #666;
                   text-align: center; width: 200px;" />
        </div>
        <button id="mp-join" style="
          font-family: monospace; font-size: 20px; padding: 10px 40px;
          background: #CC0000; color: #fff; border: 2px solid #FF4444;
          cursor: pointer;
        ">PLAY</button>
        <div style="margin-top: 15px; color: #888; font-size: 12px;">
          Press Enter to join
        </div>
      </div>
    `;

    const input = document.getElementById('mp-name') as HTMLInputElement;
    const btn = document.getElementById('mp-join') as HTMLButtonElement;
    input.focus();

    const doJoin = () => {
      const name = input.value.trim() || 'Player';
      this.overlay.style.display = 'none';
      this.onJoin?.(name);
    };

    btn.onclick = doJoin;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') doJoin();
    };
  }

  showConnecting(): void {
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = `
      <div style="text-align: center;">
        <h2 style="color: #FFD700;">Connecting...</h2>
      </div>
    `;
  }

  showGameOver(scores: { name: string; score: number }[]): void {
    this.overlay.style.display = 'flex';

    const rows = scores.map((s, i) => `
      <div style="display: flex; justify-content: space-between; padding: 4px 0;
                  ${i === 0 ? 'color: #FFD700; font-size: 20px;' : ''}">
        <span>${i + 1}. ${s.name}</span>
        <span>${s.score} pts</span>
      </div>
    `).join('');

    this.overlay.innerHTML = `
      <div style="text-align: center; min-width: 300px;">
        <h1 style="color: #CC0000; font-size: 32px; margin-bottom: 10px;">GAME OVER</h1>
        <h2 style="color: #FFD700; margin-bottom: 20px;">${scores[0]?.name || 'Nobody'} wins!</h2>
        <div style="text-align: left; margin-bottom: 20px;">${rows}</div>
        <button id="mp-again" style="
          font-family: monospace; font-size: 18px; padding: 8px 30px;
          background: #CC0000; color: #fff; border: 2px solid #FF4444;
          cursor: pointer;
        ">PLAY AGAIN</button>
      </div>
    `;

    document.getElementById('mp-again')!.onclick = () => {
      window.location.reload();
    };
  }

  showDisconnected(): void {
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = `
      <div style="text-align: center;">
        <h2 style="color: #FF4444;">Disconnected from server</h2>
        <button id="mp-reconnect" style="
          font-family: monospace; font-size: 16px; padding: 8px 24px;
          background: #666; color: #fff; border: 2px solid #888;
          cursor: pointer; margin-top: 15px;
        ">RECONNECT</button>
      </div>
    `;
    document.getElementById('mp-reconnect')!.onclick = () => {
      window.location.reload();
    };
  }

  hide(): void {
    this.overlay.style.display = 'none';
  }

  destroy(): void {
    this.overlay.remove();
  }
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const params = new URLSearchParams(window.location.search);
const isMultiplayer = params.has('mp');

if (isMultiplayer) {
  const defaultServer = window.location.hostname === 'localhost'
    ? 'ws://localhost:3001'
    : 'wss://ws.martinzadrazil.com';
  const serverUrl = params.get('server') || defaultServer;
  import('./multiplayer/MultiplayerGame.js').then(({ MultiplayerGame }) => {
    const game = new MultiplayerGame(canvas, serverUrl);
    game.start();
  });
} else {
  import('./core/Game.js').then(({ Game }) => {
    const game = new Game(canvas);
    (window as any).__game = game;
    game.start();
  });
}

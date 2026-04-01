import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from './GameRoom.js';
import { PlayerSession } from './PlayerSession.js';
import type { ClientMessage } from '../../shared/protocol.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const wss = new WebSocketServer({ port: PORT });
const rooms = new Map<string, GameRoom>();
let nextPlayerId = 1;

function findOrCreateRoom(): GameRoom {
  // Find a room with space
  for (const room of rooms.values()) {
    if (!room.isFull) return room;
  }
  // Create new room
  const id = `room_${Date.now()}`;
  const room = new GameRoom(id);
  rooms.set(id, room);
  console.log(`Created room ${id}`);
  return room;
}

function cleanupRooms(): void {
  for (const [id, room] of rooms) {
    if (room.isEmpty) {
      rooms.delete(id);
      console.log(`Cleaned up empty room ${id}`);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const playerId = `p${nextPlayerId++}`;
  let session: PlayerSession | null = null;
  let room: GameRoom | null = null;

  console.log(`Player ${playerId} connected`);

  ws.on('message', (data: Buffer) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'join': {
          if (session) break; // already joined
          room = findOrCreateRoom();
          session = new PlayerSession(playerId, ws);
          session.name = msg.name || 'Player';
          room.addPlayer(session);
          console.log(`Player ${playerId} (${session.name}) joined room ${room.id}`);
          break;
        }

        case 'input': {
          if (!session || !room) break;
          room.handleInput(playerId, msg);
          break;
        }
      }
    } catch (e) {
      console.error(`Error processing message from ${playerId}:`, e);
    }
  });

  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected`);
    if (room) {
      room.removePlayer(playerId);
      cleanupRooms();
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${playerId}:`, err.message);
  });
});

console.log(`Webstain3D server running on ws://localhost:${PORT}`);

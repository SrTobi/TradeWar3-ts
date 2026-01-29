import { WebSocketServer, WebSocket } from 'ws';
import type { ServerMessage } from '../src/network/messages';
import type { ClientMessage } from '../src/network/messages';
import { GameEngine, GameClient, GameRoom, GameTransport } from '../src/game/engine';
import { GAME } from '../src/game/constants';

interface ConnectedClient extends GameClient {
  ws: WebSocket;
}

/**
 * WebSocket Transport - implements GameTransport for the WebSocket server
 */
class WebSocketTransport implements GameTransport {
  private clients: Map<string, ConnectedClient>;

  constructor(clients: Map<string, ConnectedClient>, _games: Map<string, GameRoom>) {
    this.clients = clients;
    // games parameter kept for interface consistency but not used directly here
    void _games;
  }

  send(playerId: string, msg: ServerMessage): void {
    const client = this.clients.get(playerId);
    if (client?.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
    }
  }

  broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  broadcastToGame(room: GameRoom, msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const playerId of room.clients) {
      const client = this.clients.get(playerId);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  getClient(playerId: string): GameClient | undefined {
    return this.clients.get(playerId);
  }
}

class GameServer {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map();
  private wsToPlayer: Map<WebSocket, string> = new Map();
  private games: Map<string, GameRoom> = new Map();
  private engine: GameEngine;
  private transport: WebSocketTransport;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`Game server started on port ${port}`);

    // Create transport and engine
    this.transport = new WebSocketTransport(this.clients, this.games);
    this.engine = new GameEngine(
      this.transport,
      this.clients as Map<string, GameClient>,
      this.games,
      { playerCounter: 0, gameCounter: 0, aiCounter: 0 }
    );

    // Set up game list broadcast callback
    this.engine.setOnGameListChanged(() => {
      this.broadcastGameList();
    });

    this.wss.on('connection', (ws) => {
      const playerId = this.engine.getNextPlayerId();
      console.log(`Client connected: ${playerId}`);

      const client: ConnectedClient = {
        ws,
        playerId,
        playerName: null,
        currentGameId: null,
      };

      this.clients.set(playerId, client);
      this.wsToPlayer.set(ws, playerId);

      // Send welcome with player ID
      this.transport.send(playerId, { type: 'welcome', playerId });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        this.engine.handleMessage(playerId, msg);
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${playerId}`);
        this.engine.handleDisconnect(playerId);
        this.wsToPlayer.delete(ws);
      });
    });
  }

  private broadcastGameList(): void {
    const games = this.engine.getGameList();
    const msg: ServerMessage = { type: 'gameList', games };
    const data = JSON.stringify(msg);

    // Send to all connected clients not in a game
    for (const client of this.clients.values()) {
      if (!client.currentGameId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
}

const port = parseInt(process.argv[2]) || GAME.SERVER_PORT;
new GameServer(port);

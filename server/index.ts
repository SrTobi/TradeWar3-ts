import { WebSocketServer, WebSocket } from 'ws';
import type { GameState, Player, Country, Company, Faction, HexCoord } from '../src/types/game';
import type { ClientMessage, ServerMessage, GameInfo } from '../src/network/messages';
import { generateHexGrid } from '../src/game/hex';
import { processBattle, calculateUnitCost, canPlaceUnits, checkWinner } from '../src/game/battle';
import { createCompanies, updateStockPrice } from '../src/game/stock';
import { GAME } from '../src/game/constants';

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  playerName: string | null;
  currentGameId: string | null;
}

interface GameRoom {
  id: string;
  hostId: string;
  gameState: GameState | null;
  clients: Set<string>; // playerIds
  factionCounter: number;
  gameLoop: NodeJS.Timeout | null;
}

class GameServer {
  private wss: WebSocketServer;
  private clients: Map<string, ConnectedClient> = new Map(); // playerId -> client
  private wsToPlayer: Map<WebSocket, string> = new Map(); // ws -> playerId
  private games: Map<string, GameRoom> = new Map();
  private playerCounter = 0;
  private gameCounter = 0;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    console.log(`Game server started on port ${port}`);

    this.wss.on('connection', (ws) => {
      const playerId = `player${++this.playerCounter}`;
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
      this.send(ws, { type: 'welcome', playerId });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(playerId, msg);
      });

      ws.on('close', () => {
        console.log(`Client disconnected: ${playerId}`);
        this.handleDisconnect(playerId);
      });
    });
  }

  private handleMessage(playerId: string, msg: ClientMessage): void {
    const client = this.clients.get(playerId);
    if (!client) return;

    switch (msg.type) {
      case 'setName':
        client.playerName = msg.playerName;
        break;
      case 'listGames':
        this.handleListGames(client);
        break;
      case 'createGame':
        this.handleCreateGame(client);
        break;
      case 'joinGame':
        this.handleJoinGame(client, msg.gameId);
        break;
      case 'leaveGame':
        this.handleLeaveGame(client);
        break;
      case 'startGame':
        this.handleStartGame(client);
        break;
      case 'placeUnits':
        this.handlePlaceUnits(client, msg.coords);
        break;
    }
  }

  private handleDisconnect(playerId: string): void {
    const client = this.clients.get(playerId);
    if (client?.currentGameId) {
      this.handleLeaveGame(client);
    }
    this.wsToPlayer.delete(client?.ws as WebSocket);
    this.clients.delete(playerId);
  }

  private handleListGames(client: ConnectedClient): void {
    const games: GameInfo[] = [];
    for (const [id, room] of this.games) {
      const host = this.clients.get(room.hostId);
      const players = this.getGamePlayers(room);
      games.push({
        id,
        hostName: host?.playerName ?? 'Unknown',
        playerCount: players.length,
        maxPlayers: 6,
        phase: room.gameState?.phase ?? 'lobby',
        players: players.map((p) => p.name),
      });
    }
    this.send(client.ws, { type: 'gameList', games });
  }

  private handleCreateGame(client: ConnectedClient): void {
    if (!client.playerName) {
      this.send(client.ws, { type: 'error', message: 'Set your name first' });
      return;
    }

    if (client.currentGameId) {
      this.handleLeaveGame(client);
    }

    const gameId = `game${++this.gameCounter}`;
    const room: GameRoom = {
      id: gameId,
      hostId: client.playerId,
      gameState: null,
      clients: new Set([client.playerId]),
      factionCounter: 0,
      gameLoop: null,
    };

    this.games.set(gameId, room);
    client.currentGameId = gameId;

    const factionId = `faction${room.factionCounter++}`;
    this.send(client.ws, { type: 'joinedGame', gameId, factionId });
    this.broadcastLobbyUpdate(room);
    this.broadcastGameList();

    console.log(`Game ${gameId} created by ${client.playerName}`);
  }

  private handleJoinGame(client: ConnectedClient, gameId: string): void {
    if (!client.playerName) {
      this.send(client.ws, { type: 'error', message: 'Set your name first' });
      return;
    }

    const room = this.games.get(gameId);
    if (!room) {
      this.send(client.ws, { type: 'error', message: 'Game not found' });
      return;
    }

    if (room.gameState?.phase === 'playing') {
      this.send(client.ws, { type: 'error', message: 'Game already in progress' });
      return;
    }

    if (client.currentGameId) {
      this.handleLeaveGame(client);
    }

    room.clients.add(client.playerId);
    client.currentGameId = gameId;

    const factionId = `faction${room.factionCounter++}`;
    this.send(client.ws, { type: 'joinedGame', gameId, factionId });
    this.broadcastLobbyUpdate(room);
    this.broadcastGameList();

    console.log(`${client.playerName} joined game ${gameId}`);
  }

  private handleLeaveGame(client: ConnectedClient): void {
    if (!client.currentGameId) return;

    const room = this.games.get(client.currentGameId);
    if (!room) {
      client.currentGameId = null;
      return;
    }

    room.clients.delete(client.playerId);
    this.send(client.ws, { type: 'leftGame' });

    // If game is in progress, remove player from game and neutralize their countries
    if (room.gameState && room.gameState.phase === 'playing') {
      const playerEntry = room.gameState.players.find((p) => p.id === client.playerId);
      if (playerEntry) {
        const factionId = playerEntry.factionId;

        for (let i = 0; i < room.gameState.countries.length; i++) {
          const country = room.gameState.countries[i];
          const units = country.units;
          const remainingUnits = units[factionId] || 0;
          if (remainingUnits > 0) {
            // Remove any lingering units of the departed faction and add them to neutral
            delete units[factionId];
            units.neutral = (units.neutral || 0) + remainingUnits;
          }
        }

        // Recalculate unit cost and broadcast updated state
        room.gameState.unitCost = calculateUnitCost(room.gameState.countries);
      }
    }

    // If room is empty or host left, clean up
    if (room.clients.size === 0 || room.hostId === client.playerId) {
      this.destroyGame(room);
    } else {
      this.broadcastLobbyUpdate(room);
    }

    client.currentGameId = null;
    this.broadcastGameList();

    console.log(`${client.playerName} left game ${room.id}`);
  }

  private destroyGame(room: GameRoom): void {
    if (room.gameLoop) {
      clearInterval(room.gameLoop);
    }

    // Notify remaining clients
    for (const playerId of room.clients) {
      const c = this.clients.get(playerId);
      if (c) {
        c.currentGameId = null;
        this.send(c.ws, { type: 'leftGame' });
      }
    }

    this.games.delete(room.id);
    console.log(`Game ${room.id} destroyed`);
  }

  private handleStartGame(client: ConnectedClient): void {
    if (!client.currentGameId) return;

    const room = this.games.get(client.currentGameId);
    if (!room) return;

    // Only host can start
    if (room.hostId !== client.playerId) {
      this.send(client.ws, { type: 'error', message: 'Only host can start the game' });
      return;
    }

    if (room.gameState?.phase === 'playing') return;

    const players = this.getGamePlayers(room);
    if (players.length === 0) return;

    const factions: Faction[] = [
      { id: 'neutral', name: 'Neutral' },
      ...players.map((p) => ({ id: p.factionId, name: p.name })),
    ];

    const startingPositions: HexCoord[] = [
      { q: GAME.MAP_RADIUS, r: 0 },
      { q: -GAME.MAP_RADIUS, r: 0 },
      { q: 0, r: GAME.MAP_RADIUS },
      { q: 0, r: -GAME.MAP_RADIUS },
      { q: GAME.MAP_RADIUS, r: -GAME.MAP_RADIUS },
      { q: -GAME.MAP_RADIUS, r: GAME.MAP_RADIUS },
    ];

    const hexCoords = generateHexGrid(GAME.MAP_RADIUS);
    const countries: Country[] = hexCoords.map((coords) => {
      const playerIndex = startingPositions.findIndex(
        (pos) => pos.q === coords.q && pos.r === coords.r
      );

      if (playerIndex !== -1 && playerIndex < players.length) {
        return {
          coords,
          units: { [players[playerIndex].factionId]: 10 },
          nextBattleTime: Date.now() + Math.random() * GAME.BATTLE_MAX_INTERVAL,
        };
      }

      return {
        coords,
        units: {
          neutral:
            GAME.NEUTRAL_UNITS_MIN +
            Math.floor(Math.random() * (GAME.NEUTRAL_UNITS_MAX - GAME.NEUTRAL_UNITS_MIN)),
        },
        nextBattleTime: Date.now() + Math.random() * GAME.BATTLE_MAX_INTERVAL,
      };
    });

    const companies = createCompanies(GAME.STOCK_COUNT);

    room.gameState = {
      phase: 'playing',
      countries,
      companies,
      factions,
      players,
      unitCost: calculateUnitCost(countries),
      winner: null,
    };

    this.broadcastToGame(room, { type: 'gameStarted' });
    this.startGameLoop(room);
    this.broadcastGameList();

    console.log(`Game ${room.id} started with ${players.length} players`);
  }

  private handlePlaceUnits(client: ConnectedClient, coords: HexCoord): void {
    if (!client.currentGameId) return;

    const room = this.games.get(client.currentGameId);
    if (!room?.gameState || room.gameState.phase !== 'playing') return;

    const player = this.getGamePlayers(room).find((p) => p.id === client.playerId);
    if (!player) return;

    const factionId = player.factionId;
    const countryIndex = room.gameState.countries.findIndex(
      (c: Country) => c.coords.q === coords.q && c.coords.r === coords.r
    );

    if (countryIndex === -1) return;

    const country = room.gameState.countries[countryIndex];
    if (!canPlaceUnits(country, room.gameState.countries, factionId)) return;

    const newUnits = { ...country.units };
    newUnits[factionId] = (newUnits[factionId] || 0) + 1;

    // Reset battle timer when placing units (grace period)
    room.gameState.countries[countryIndex] = {
      ...country,
      units: newUnits,
      nextBattleTime: Date.now() + GAME.PLACEMENT_GRACE_PERIOD,
    };

    room.gameState.unitCost = calculateUnitCost(room.gameState.countries);
  }

  private startGameLoop(room: GameRoom): void {
    room.gameLoop = setInterval(() => {
      if (!room.gameState || room.gameState.phase !== 'playing') return;

      const now = Date.now();

      room.gameState.countries = room.gameState.countries.map((country: Country) => {
        if (now >= country.nextBattleTime) {
          return processBattle(country, room.gameState!.countries, now);
        }
        return country;
      });

      room.gameState.companies = room.gameState.companies.map((company: Company) => {
        if (now >= company.nextUpdateTime) {
          return updateStockPrice(company, now);
        }
        return company;
      });

      room.gameState.unitCost = calculateUnitCost(room.gameState.countries);

      const winner = checkWinner(room.gameState.countries, room.gameState.factions);
      if (winner) {
        room.gameState.winner = winner;
        room.gameState.phase = 'ended';
        if (room.gameLoop) {
          clearInterval(room.gameLoop);
          room.gameLoop = null;
        }
        this.broadcastGameList();
      }

      this.broadcastToGame(room, { type: 'gameState', state: room.gameState });
    }, GAME.SERVER_TICK_RATE);
  }

  private getGamePlayers(room: GameRoom): Player[] {
    const players: Player[] = [];
    let factionIndex = 0;

    for (const playerId of room.clients) {
      const client = this.clients.get(playerId);
      if (client?.playerName) {
        players.push({
          id: client.playerId,
          name: client.playerName,
          factionId: `faction${factionIndex++}`,
        });
      }
    }

    return players;
  }

  private broadcastLobbyUpdate(room: GameRoom): void {
    const players = this.getGamePlayers(room);
    this.broadcastToGame(room, { type: 'lobbyUpdate', players });
  }

  private broadcastToGame(room: GameRoom, msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const playerId of room.clients) {
      const client = this.clients.get(playerId);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private broadcastGameList(): void {
    const games: GameInfo[] = [];
    for (const [id, room] of this.games) {
      const host = this.clients.get(room.hostId);
      const players = this.getGamePlayers(room);
      games.push({
        id,
        hostName: host?.playerName ?? 'Unknown',
        playerCount: players.length,
        maxPlayers: 6,
        phase: room.gameState?.phase ?? 'lobby',
        players: players.map((p) => p.name),
      });
    }

    const msg: ServerMessage = { type: 'gameList', games };
    const data = JSON.stringify(msg);

    // Send to all connected clients not in a game
    for (const client of this.clients.values()) {
      if (!client.currentGameId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

const port = parseInt(process.argv[2]) || GAME.SERVER_PORT;
new GameServer(port);

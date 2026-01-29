import type { GameState, Player, HexCoord } from '@/types/game';

export interface GameInfo {
  id: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: 'lobby' | 'playing' | 'ended';
  players: string[];
}

export type ClientMessage =
  | { type: 'setName'; playerName: string }
  | { type: 'listGames' }
  | { type: 'createGame' }
  | { type: 'joinGame'; gameId: string }
  | { type: 'leaveGame' }
  | { type: 'startGame' }
  | { type: 'placeUnits'; coords: HexCoord }
  | { type: 'ping'; timestamp: number };

export type ServerMessage =
  | { type: 'welcome'; playerId: string }
  | { type: 'gameList'; games: GameInfo[] }
  | { type: 'joinedGame'; gameId: string; factionId: string }
  | { type: 'leftGame' }
  | { type: 'lobbyUpdate'; players: Player[] }
  | { type: 'gameStarted' }
  | { type: 'gameState'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'pong'; timestamp: number };

export function serialize(msg: ClientMessage | ServerMessage): string {
  return JSON.stringify(msg);
}

export function deserialize<T>(data: string): T {
  return JSON.parse(data) as T;
}

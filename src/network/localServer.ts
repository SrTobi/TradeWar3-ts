/**
 * Local Game Server - Runs game logic in the browser for P2P mode
 * Uses the shared GameEngine for game logic
 */

import type { ServerMessage } from './messages';
import type { ClientMessage } from './messages';
import { GameEngine, GameClient, GameRoom, GameTransport } from '@/game/engine';
import { WebRTCHost } from './webrtc';

interface LocalClient extends GameClient {
  isLocal: boolean;
  peerId?: string; // For remote peers
}

type LocalMessageHandler = (msg: ServerMessage) => void;

/**
 * WebRTC Transport - implements GameTransport for P2P host mode
 */
class WebRTCTransport implements GameTransport {
  private clients: Map<string, LocalClient>;
  private rtcHost: WebRTCHost;
  private localMessageHandler: LocalMessageHandler | null = null;

  constructor(clients: Map<string, LocalClient>, rtcHost: WebRTCHost) {
    this.clients = clients;
    this.rtcHost = rtcHost;
  }

  setLocalMessageHandler(handler: LocalMessageHandler | null): void {
    this.localMessageHandler = handler;
  }

  send(playerId: string, msg: ServerMessage): void {
    const client = this.clients.get(playerId);
    if (!client) return;

    if (client.isLocal && this.localMessageHandler) {
      this.localMessageHandler(msg);
    } else if (client.peerId) {
      this.rtcHost.send(client.peerId, msg);
    }
  }

  broadcast(msg: ServerMessage): void {
    // Send to local player
    if (this.localMessageHandler) {
      this.localMessageHandler(msg);
    }
    // Send to all remote peers
    this.rtcHost.broadcast(msg);
  }

  broadcastToGame(room: GameRoom, msg: ServerMessage): void {
    for (const playerId of room.clients) {
      this.send(playerId, msg);
    }
  }

  getClient(playerId: string): GameClient | undefined {
    return this.clients.get(playerId);
  }
}

export class LocalGameServer {
  private rtcHost: WebRTCHost;
  private clients: Map<string, LocalClient> = new Map();
  private peerIdToPlayerId: Map<string, string> = new Map(); // For O(1) lookups
  private games: Map<string, GameRoom> = new Map();
  private engine: GameEngine;
  private transport: WebRTCTransport;
  private localPlayerId: string;
  private isRunning = false;

  constructor() {
    this.rtcHost = new WebRTCHost();

    // Create transport and engine
    this.transport = new WebRTCTransport(this.clients, this.rtcHost);
    this.engine = new GameEngine(
      this.transport,
      this.clients as Map<string, GameClient>,
      this.games,
      { playerCounter: 0, gameCounter: 0, aiCounter: 0 }
    );

    // Get the local player ID
    this.localPlayerId = this.engine.getNextPlayerId();

    // Create local host client
    const localClient: LocalClient = {
      playerId: this.localPlayerId,
      playerName: null,
      currentGameId: null,
      isLocal: true,
    };
    this.clients.set(this.localPlayerId, localClient);

    // Handle messages from remote peers
    this.rtcHost.onMessage((msg, peerId) => {
      // O(1) lookup using reverse map
      const playerId = this.peerIdToPlayerId.get(peerId);
      if (playerId) {
        this.engine.handleMessage(playerId, msg);
      }
    });

    // Handle peer connections
    this.rtcHost.onPeerConnected((peerId) => {
      console.log(`[LocalServer] Peer connected: ${peerId}`);
      // Create client for the peer
      const newPlayerId = this.engine.getNextPlayerId();
      const client: LocalClient = {
        playerId: newPlayerId,
        playerName: null,
        currentGameId: null,
        isLocal: false,
        peerId,
      };
      this.clients.set(newPlayerId, client);
      this.peerIdToPlayerId.set(peerId, newPlayerId);

      // Send welcome message
      this.transport.send(newPlayerId, { type: 'welcome', playerId: newPlayerId });
    });

    this.rtcHost.onPeerDisconnected((peerId) => {
      console.log(`[LocalServer] Peer disconnected: ${peerId}`);
      // O(1) lookup using reverse map
      const playerId = this.peerIdToPlayerId.get(peerId);
      if (playerId) {
        this.engine.handleDisconnect(playerId);
        this.clients.delete(playerId);
        this.peerIdToPlayerId.delete(peerId);
      }
    });

    this.isRunning = true;
  }

  /**
   * Get the local player's ID
   */
  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  /**
   * Create an offer for a remote peer to connect
   */
  async createOffer(): Promise<{ peerId: string; offer: string }> {
    return this.rtcHost.createOffer();
  }

  /**
   * Accept an answer from a remote peer
   */
  async acceptAnswer(peerId: string, answer: string): Promise<void> {
    return this.rtcHost.acceptAnswer(peerId, answer);
  }

  /**
   * Handle messages from the local player
   */
  handleLocalMessage(msg: ClientMessage): void {
    this.engine.handleMessage(this.localPlayerId, msg);
  }

  /**
   * Set handler for messages to local player
   */
  onLocalMessage(handler: LocalMessageHandler): () => void {
    this.transport.setLocalMessageHandler(handler);
    // Send welcome immediately
    handler({ type: 'welcome', playerId: this.localPlayerId });
    return () => {
      this.transport.setLocalMessageHandler(null);
    };
  }

  stop(): void {
    this.isRunning = false;
    this.engine.destroyAllGames();
    this.rtcHost.close();
    this.clients.clear();
    this.peerIdToPlayerId.clear();
    this.games.clear();
  }

  get running(): boolean {
    return this.isRunning;
  }
}

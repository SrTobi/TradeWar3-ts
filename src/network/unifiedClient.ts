/**
 * Unified Game Client - Supports both WebSocket server and WebRTC P2P connections
 */

import type { ClientMessage, ServerMessage } from './messages';
import { serialize, deserialize } from './messages';
import { WebRTCClient } from './webrtc';
import { LocalGameServer } from './localServer';

type MessageHandler = (msg: ServerMessage) => void;
type LatencyHandler = (latency: number | null) => void;
type DisconnectHandler = () => void;

export type ConnectionMode = 'websocket' | 'p2p-host' | 'p2p-client';

export class UnifiedGameClient {
  private mode: ConnectionMode | null = null;

  // WebSocket mode
  private ws: WebSocket | null = null;
  private wsPingInterval: ReturnType<typeof setInterval> | null = null;

  // P2P Host mode
  private localServer: LocalGameServer | null = null;

  // P2P Client mode
  private rtcClient: WebRTCClient | null = null;

  // Common handlers
  private handlers: Set<MessageHandler> = new Set();
  private latencyHandlers: Set<LatencyHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();

  /**
   * Connect to a WebSocket server
   */
  async connectToServer(address: string, port: number): Promise<void> {
    this.disconnect();
    this.mode = 'websocket';

    console.log(`[UnifiedClient] Connecting to WebSocket server ws://${address}:${port}`);

    return new Promise((resolve, reject) => {
      const url = `ws://${address}:${port}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.startWsPingLoop();
        resolve();
      };

      this.ws.onerror = () => {
        reject(new Error('Failed to connect'));
      };

      this.ws.onmessage = (event) => {
        const msg = deserialize<ServerMessage>(event.data);
        if (msg.type === 'pong') {
          const latency = Date.now() - msg.timestamp;
          this.latencyHandlers.forEach((h) => h(latency));
        } else {
          this.handlers.forEach((h) => h(msg));
        }
      };

      this.ws.onclose = () => {
        this.stopWsPingLoop();
        this.latencyHandlers.forEach((h) => h(null));
        this.disconnectHandlers.forEach((h) => h());
        this.ws = null;
      };
    });
  }

  /**
   * Start as a P2P host (runs local game server)
   */
  startAsHost(): void {
    this.disconnect();
    this.mode = 'p2p-host';

    console.log('[UnifiedClient] Starting as P2P host');

    this.localServer = new LocalGameServer();

    // Forward messages from local server
    this.localServer.onLocalMessage((msg) => {
      if (msg.type === 'pong') {
        // Local latency is essentially 0
        this.latencyHandlers.forEach((h) => h(0));
      } else {
        this.handlers.forEach((h) => h(msg));
      }
    });
  }

  /**
   * Create an offer for a peer to connect (host mode only)
   */
  async createPeerOffer(): Promise<{ peerId: string; offer: string }> {
    if (this.mode !== 'p2p-host' || !this.localServer) {
      throw new Error('Must be in host mode to create peer offers');
    }
    return this.localServer.createOffer();
  }

  /**
   * Accept a peer's answer (host mode only)
   */
  async acceptPeerAnswer(peerId: string, answer: string): Promise<void> {
    if (this.mode !== 'p2p-host' || !this.localServer) {
      throw new Error('Must be in host mode to accept peer answers');
    }
    return this.localServer.acceptAnswer(peerId, answer);
  }

  /**
   * Connect to a P2P host using their offer
   */
  async connectToHost(offer: string): Promise<string> {
    this.disconnect();
    this.mode = 'p2p-client';

    console.log('[UnifiedClient] Connecting to P2P host');

    this.rtcClient = new WebRTCClient();

    // Set up handlers
    this.rtcClient.onMessage((msg) => {
      this.handlers.forEach((h) => h(msg));
    });

    this.rtcClient.onLatency((latency) => {
      this.latencyHandlers.forEach((h) => h(latency));
    });

    this.rtcClient.onDisconnect(() => {
      this.disconnectHandlers.forEach((h) => h());
    });

    // Connect and return answer
    return this.rtcClient.connect(offer);
  }

  /**
   * Send a message
   */
  send(msg: ClientMessage): void {
    switch (this.mode) {
      case 'websocket':
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(serialize(msg));
        }
        break;

      case 'p2p-host':
        if (this.localServer) {
          this.localServer.handleLocalMessage(msg);
        }
        break;

      case 'p2p-client':
        if (this.rtcClient) {
          this.rtcClient.send(msg);
        }
        break;
    }
  }

  /**
   * Disconnect from current connection
   */
  disconnect(): void {
    this.stopWsPingLoop();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.localServer) {
      this.localServer.stop();
      this.localServer = null;
    }

    if (this.rtcClient) {
      this.rtcClient.disconnect();
      this.rtcClient = null;
    }

    // Clear all handlers to prevent stale callbacks
    this.handlers.clear();
    this.latencyHandlers.clear();
    this.disconnectHandlers.clear();

    this.mode = null;
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onLatency(handler: LatencyHandler): () => void {
    this.latencyHandlers.add(handler);
    return () => this.latencyHandlers.delete(handler);
  }

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  get isConnected(): boolean {
    switch (this.mode) {
      case 'websocket':
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
      case 'p2p-host':
        return this.localServer?.running ?? false;
      case 'p2p-client':
        return this.rtcClient?.isConnected ?? false;
      default:
        return false;
    }
  }

  get connectionMode(): ConnectionMode | null {
    return this.mode;
  }

  // WebSocket ping loop (not needed for P2P as it's handled internally)
  private startWsPingLoop(): void {
    if (this.wsPingInterval) {
      this.stopWsPingLoop();
    }
    this.sendWsPing();
    this.wsPingInterval = setInterval(() => {
      this.sendWsPing();
    }, 5000);
  }

  private stopWsPingLoop(): void {
    if (this.wsPingInterval) {
      clearInterval(this.wsPingInterval);
      this.wsPingInterval = null;
    }
  }

  private sendWsPing(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialize({ type: 'ping', timestamp: Date.now() }));
    }
  }
}

// Export singleton instance
export const unifiedGameClient = new UnifiedGameClient();

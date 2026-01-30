import type { ClientMessage, ServerMessage } from './messages';
import { serialize, deserialize } from './messages';

type MessageHandler = (msg: ServerMessage) => void;
type LatencyHandler = (latency: number | null) => void;
type DisconnectHandler = () => void;

export interface ServerConfig {
  address: string;
  port?: number;
  path?: string;
}

export class GameClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private latencyHandlers: Set<LatencyHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect(config: ServerConfig): Promise<void> {
    // Use wss:// for secure connections (HTTPS pages), ws:// for local development
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

    let url: string;
    if (config.path) {
      // Path-based connection (e.g., wss://example.com/ws) for Caddy proxy
      url = `${protocol}://${config.address}${config.path}`;
    } else if (config.port) {
      // Port-based connection (e.g., ws://localhost:12346) for direct connection
      url = `${protocol}://${config.address}:${config.port}`;
    } else {
      throw new Error('Either port or path must be specified');
    }

    console.log(`Connecting to ${url}`);
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.startPingLoop();
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
        this.stopPingLoop();
        this.latencyHandlers.forEach((h) => h(null)); // Reset latency on disconnect
        this.disconnectHandlers.forEach((h) => h());
        this.ws = null;
      };
    });
  }

  disconnect(): void {
    this.stopPingLoop();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serialize(msg));
    }
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
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private startPingLoop(): void {
    // Ensure we don't create multiple ping intervals
    if (this.pingInterval) {
      this.stopPingLoop();
    }
    // Send initial ping immediately
    this.sendPing();
    // Then send ping every 5 seconds
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 5000);
  }

  private stopPingLoop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendPing(): void {
    this.send({ type: 'ping', timestamp: Date.now() });
  }
}

export const gameClient = new GameClient();

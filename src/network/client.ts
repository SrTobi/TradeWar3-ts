import type { ClientMessage, ServerMessage } from './messages';
import { serialize, deserialize } from './messages';

type MessageHandler = (msg: ServerMessage) => void;

export class GameClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();

  connect(address: string, port: number): Promise<void> {
    console.log(`Connecting to ws://${address}:${port}`);
    return new Promise((resolve, reject) => {
      const url = `ws://${address}:${port}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onerror = () => {
        reject(new Error('Failed to connect'));
      };

      this.ws.onmessage = (event) => {
        const msg = deserialize<ServerMessage>(event.data);
        this.handlers.forEach((h) => h(msg));
      };

      this.ws.onclose = () => {
        this.ws = null;
      };
    });
  }

  disconnect(): void {
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

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const gameClient = new GameClient();

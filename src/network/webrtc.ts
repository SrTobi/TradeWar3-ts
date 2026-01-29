/**
 * WebRTC P2P connection module
 * Uses public STUN servers for NAT traversal
 */

import type { ClientMessage, ServerMessage } from './messages';
import { serialize, deserialize } from './messages';

// Public STUN servers for NAT traversal
// From: https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

const RTC_CONFIG: RTCConfiguration = {
  iceServers: STUN_SERVERS,
};

export type SignalingData = {
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: string;
  candidate?: RTCIceCandidateInit;
};

type MessageHandler = (msg: ServerMessage, peerId: string) => void;
type ClientMessageHandler = (msg: ClientMessage, peerId: string) => void;
type PeerConnectedHandler = (peerId: string) => void;
type PeerDisconnectedHandler = (peerId: string) => void;

interface PeerConnection {
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  peerId: string;
  isConnected: boolean;
}

/**
 * WebRTC Host - Creates offer and waits for peers to connect
 */
export class WebRTCHost {
  private peers: Map<string, PeerConnection> = new Map();
  private peerCounter = 0;
  private messageHandlers: Set<ClientMessageHandler> = new Set();
  private peerConnectedHandlers: Set<PeerConnectedHandler> = new Set();
  private peerDisconnectedHandlers: Set<PeerDisconnectedHandler> = new Set();
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  /**
   * Create an offer for a new peer to connect
   */
  async createOffer(): Promise<{ peerId: string; offer: string }> {
    const peerId = `peer${++this.peerCounter}`;
    const connection = new RTCPeerConnection(RTC_CONFIG);

    const dataChannel = connection.createDataChannel('game', {
      ordered: true,
    });

    const peer: PeerConnection = {
      connection,
      dataChannel,
      peerId,
      isConnected: false,
    };

    this.setupDataChannel(dataChannel, peer);
    this.setupConnectionHandlers(connection, peer);

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await this.waitForIceGathering(connection);

    this.peers.set(peerId, peer);
    this.pendingIceCandidates.set(peerId, []);

    return {
      peerId,
      offer: JSON.stringify({
        type: 'offer',
        sdp: connection.localDescription?.sdp,
      }),
    };
  }

  /**
   * Accept an answer from a peer
   */
  async acceptAnswer(peerId: string, answerData: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error(`Unknown peer: ${peerId}`);

    const answer = JSON.parse(answerData) as SignalingData;
    if (answer.type !== 'answer') throw new Error('Expected answer');

    await peer.connection.setRemoteDescription({
      type: 'answer',
      sdp: answer.sdp,
    });

    // Process any pending ICE candidates
    const pendingCandidates = this.pendingIceCandidates.get(peerId) || [];
    for (const candidate of pendingCandidates) {
      await peer.connection.addIceCandidate(candidate);
    }
    this.pendingIceCandidates.delete(peerId);
  }

  /**
   * Add ICE candidate from peer
   */
  async addIceCandidate(peerId: string, candidateData: string): Promise<void> {
    const peer = this.peers.get(peerId);
    const candidate = JSON.parse(candidateData) as SignalingData;

    if (candidate.type !== 'ice-candidate' || !candidate.candidate) return;

    if (peer && peer.connection.remoteDescription) {
      await peer.connection.addIceCandidate(candidate.candidate);
    } else {
      // Queue candidates until remote description is set
      const pending = this.pendingIceCandidates.get(peerId) || [];
      pending.push(candidate.candidate);
      this.pendingIceCandidates.set(peerId, pending);
    }
  }

  private waitForIceGathering(connection: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (connection.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (connection.iceGatheringState === 'complete') {
          connection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      connection.addEventListener('icegatheringstatechange', checkState);

      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  }

  private setupDataChannel(channel: RTCDataChannel, peer: PeerConnection): void {
    channel.onopen = () => {
      console.log(`[WebRTC Host] Data channel opened for ${peer.peerId}`);
      peer.isConnected = true;
      this.peerConnectedHandlers.forEach((h) => h(peer.peerId));
    };

    channel.onclose = () => {
      console.log(`[WebRTC Host] Data channel closed for ${peer.peerId}`);
      peer.isConnected = false;
      this.peerDisconnectedHandlers.forEach((h) => h(peer.peerId));
      this.peers.delete(peer.peerId);
    };

    channel.onmessage = (event) => {
      const msg = deserialize<ClientMessage>(event.data);
      this.messageHandlers.forEach((h) => h(msg, peer.peerId));
    };
  }

  private setupConnectionHandlers(connection: RTCPeerConnection, peer: PeerConnection): void {
    connection.oniceconnectionstatechange = () => {
      console.log(
        `[WebRTC Host] ICE connection state for ${peer.peerId}:`,
        connection.iceConnectionState
      );
      if (
        connection.iceConnectionState === 'failed' ||
        connection.iceConnectionState === 'disconnected'
      ) {
        peer.isConnected = false;
        this.peerDisconnectedHandlers.forEach((h) => h(peer.peerId));
        this.peers.delete(peer.peerId);
      }
    };
  }

  /**
   * Send a message to a specific peer
   */
  send(peerId: string, msg: ServerMessage): void {
    const peer = this.peers.get(peerId);
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(serialize(msg));
    }
  }

  /**
   * Broadcast a message to all connected peers
   */
  broadcast(msg: ServerMessage): void {
    const data = serialize(msg);
    for (const peer of this.peers.values()) {
      if (peer.dataChannel?.readyState === 'open') {
        peer.dataChannel.send(data);
      }
    }
  }

  onMessage(handler: ClientMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onPeerConnected(handler: PeerConnectedHandler): () => void {
    this.peerConnectedHandlers.add(handler);
    return () => this.peerConnectedHandlers.delete(handler);
  }

  onPeerDisconnected(handler: PeerDisconnectedHandler): () => void {
    this.peerDisconnectedHandlers.add(handler);
    return () => this.peerDisconnectedHandlers.delete(handler);
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.peers.values())
      .filter((p) => p.isConnected)
      .map((p) => p.peerId);
  }

  close(): void {
    for (const peer of this.peers.values()) {
      peer.dataChannel?.close();
      peer.connection.close();
    }
    this.peers.clear();
    this.messageHandlers.clear();
    this.peerConnectedHandlers.clear();
    this.peerDisconnectedHandlers.clear();
  }
}

/**
 * WebRTC Client - Connects to a host using their offer
 */
export class WebRTCClient {
  private connection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private disconnectHandlers: Set<() => void> = new Set();
  private latencyHandlers: Set<(latency: number | null) => void> = new Set();
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Connect to a host using their offer
   * Returns the answer to send back to the host
   */
  async connect(offerData: string): Promise<string> {
    const offer = JSON.parse(offerData) as SignalingData;
    if (offer.type !== 'offer') throw new Error('Expected offer');

    this.connection = new RTCPeerConnection(RTC_CONFIG);

    this.setupConnectionHandlers();

    // Handle incoming data channel from host
    this.connection.ondatachannel = (event) => {
      console.log('[WebRTC Client] Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    await this.connection.setRemoteDescription({
      type: 'offer',
      sdp: offer.sdp,
    });

    // Process any pending ICE candidates
    for (const candidate of this.pendingIceCandidates) {
      await this.connection.addIceCandidate(candidate);
    }
    this.pendingIceCandidates = [];

    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);

    // Wait for ICE gathering to complete
    await this.waitForIceGathering();

    return JSON.stringify({
      type: 'answer',
      sdp: this.connection.localDescription?.sdp,
    });
  }

  /**
   * Add ICE candidate from host
   */
  async addIceCandidate(candidateData: string): Promise<void> {
    const candidate = JSON.parse(candidateData) as SignalingData;
    if (candidate.type !== 'ice-candidate' || !candidate.candidate) return;

    if (this.connection?.remoteDescription) {
      await this.connection.addIceCandidate(candidate.candidate);
    } else {
      this.pendingIceCandidates.push(candidate.candidate);
    }
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.connection) {
        resolve();
        return;
      }

      if (this.connection.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.connection?.iceGatheringState === 'complete') {
          this.connection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.connection.addEventListener('icegatheringstatechange', checkState);

      // Timeout after 5 seconds
      setTimeout(resolve, 5000);
    });
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('[WebRTC Client] Data channel opened');
      this.startPingLoop();
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC Client] Data channel closed');
      this.stopPingLoop();
      this.latencyHandlers.forEach((h) => h(null));
      this.disconnectHandlers.forEach((h) => h());
    };

    this.dataChannel.onmessage = (event) => {
      const msg = deserialize<ServerMessage>(event.data);
      if (msg.type === 'pong') {
        const latency = Date.now() - msg.timestamp;
        this.latencyHandlers.forEach((h) => h(latency));
      } else {
        this.messageHandlers.forEach((h) => h(msg, 'host'));
      }
    };
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.oniceconnectionstatechange = () => {
      console.log('[WebRTC Client] ICE connection state:', this.connection?.iceConnectionState);
      if (
        this.connection?.iceConnectionState === 'failed' ||
        this.connection?.iceConnectionState === 'disconnected'
      ) {
        this.stopPingLoop();
        this.latencyHandlers.forEach((h) => h(null));
        this.disconnectHandlers.forEach((h) => h());
      }
    };
  }

  private startPingLoop(): void {
    if (this.pingInterval) {
      this.stopPingLoop();
    }
    this.sendPing();
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

  send(msg: ClientMessage): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(serialize(msg));
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onLatency(handler: (latency: number | null) => void): () => void {
    this.latencyHandlers.add(handler);
    return () => this.latencyHandlers.delete(handler);
  }

  onDisconnect(handler: () => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  disconnect(): void {
    this.stopPingLoop();
    this.dataChannel?.close();
    this.connection?.close();
    this.dataChannel = null;
    this.connection = null;
    this.messageHandlers.clear();
    this.disconnectHandlers.clear();
    this.latencyHandlers.clear();
  }
}

import { observableValue, autorun } from '@vscode/observables';
import { ViewModel, viewWithModel } from '@vscode/observables-react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { uiStore } from '@/store/uiStore';
import { gameStore } from '@/store/gameStore';
import { gameClient, ServerConfig } from '@/network/client';
import { GAME } from '@/game/constants';
import { Starfield } from '@/components/three/Starfield';
import type { GameInfo } from '@/network/messages';
import { playClick, resumeAudio } from '@/audio/sounds';

const containerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const canvasContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
};

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(36px, 10vw, 72px)',
  fontWeight: 'bold',
  color: '#88bbee',
  marginBottom: '0',
  textShadow: '0 0 30px rgba(136, 187, 238, 0.5), 0 4px 8px rgba(0,0,0,0.8)',
  letterSpacing: 'clamp(2px, 1vw, 8px)',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 'clamp(24px, 6vw, 42px)',
  fontWeight: 'bold',
  color: '#ddaa44',
  marginBottom: 'clamp(15px, 4vw, 30px)',
  textShadow: '0 0 20px rgba(221, 170, 68, 0.4), 0 3px 6px rgba(0,0,0,0.6)',
  letterSpacing: 'clamp(4px, 2vw, 12px)',
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(15, 20, 30, 0.9)',
  border: '2px solid rgba(77, 102, 128, 0.5)',
  borderRadius: '12px',
  padding: 'clamp(12px, 3vw, 24px)',
  width: '90vw',
  maxWidth: '480px',
  display: 'flex',
  flexDirection: 'column',
  gap: 'clamp(10px, 2vw, 16px)',
};

const inputStyle: React.CSSProperties = {
  padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2vw, 16px)',
  fontSize: 'clamp(14px, 3vw, 15px)',
  background: 'rgba(30, 38, 56, 0.9)',
  border: '2px solid rgba(77, 102, 128, 0.5)',
  borderRadius: '8px',
  color: '#e0e8f0',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 20px)',
  fontSize: 'clamp(13px, 3vw, 15px)',
  fontWeight: 'bold',
  background: 'linear-gradient(180deg, rgba(51, 64, 89, 1) 0%, rgba(35, 45, 65, 1) 100%)',
  border: '2px solid rgba(85, 119, 153, 0.6)',
  borderRadius: '8px',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  letterSpacing: '1px',
};

const hostButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: 'clamp(10px, 2vw, 14px) clamp(16px, 4vw, 24px)',
  fontSize: 'clamp(14px, 3vw, 16px)',
  background: 'linear-gradient(180deg, rgba(51, 85, 51, 1) 0%, rgba(35, 65, 35, 1) 100%)',
  border: '2px solid rgba(85, 153, 85, 0.6)',
  letterSpacing: '2px',
};

const joinButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: '8px 16px',
  fontSize: '13px',
  background: 'linear-gradient(180deg, rgba(51, 68, 102, 1) 0%, rgba(35, 50, 75, 1) 100%)',
};

const gameListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  maxHeight: 'clamp(150px, 30vh, 250px)',
  overflowY: 'auto',
};

const gameItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'clamp(8px, 2vw, 12px) clamp(10px, 2vw, 16px)',
  background: 'rgba(30, 40, 55, 0.8)',
  borderRadius: '8px',
  border: '1px solid rgba(60, 80, 100, 0.5)',
  gap: '8px',
};

const gameInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const gameNameStyle: React.CSSProperties = {
  fontSize: 'clamp(13px, 3vw, 15px)',
  fontWeight: 'bold',
  color: '#e0e8f0',
};

const gameDetailsStyle: React.CSSProperties = {
  fontSize: 'clamp(10px, 2.5vw, 12px)',
  color: '#8899aa',
};

const statusDotStyle = (phase: string): React.CSSProperties => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  display: 'inline-block',
  marginRight: '8px',
  background: phase === 'lobby' ? '#44dd66' : phase === 'playing' ? '#ddaa44' : '#666666',
  boxShadow:
    phase === 'lobby' ? '0 0 6px #44dd66' : phase === 'playing' ? '0 0 6px #ddaa44' : 'none',
});

const errorStyle: React.CSSProperties = {
  color: '#ff6666',
  fontSize: '14px',
  textAlign: 'center',
  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
};

const statusStyle: React.CSSProperties = {
  color: '#6699bb',
  fontSize: '14px',
  textAlign: 'center',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#8899aa',
  marginBottom: '4px',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '30px 20px',
  color: '#667788',
  fontSize: '14px',
};

// Get server configuration from URL param or use smart defaults
// For HTTPS pages (production), use path-based websocket (/ws) with Caddy proxy
// For HTTP pages (local dev), use direct port connection
function getServerConfig(): ServerConfig {
  const params = new URLSearchParams(window.location.search);
  const server = params.get('server');

  if (server) {
    // Explicit server specified in URL - parse it
    // Supports: "host:port", "host/path", or just "host"
    if (server.includes('/')) {
      // Path-based: "example.com/ws" or "example.com:8443/ws"
      const slashIndex = server.indexOf('/');
      const address = server.substring(0, slashIndex);
      const path = server.substring(slashIndex);
      return { address, path };
    } else if (server.includes(':')) {
      // Port-based: "example.com:12346"
      const parts = server.split(':');
      return {
        address: parts[0],
        port: parseInt(parts[1]),
      };
    } else {
      // Just hostname - use default port
      return { address: server, port: GAME.SERVER_PORT };
    }
  }

  // Auto-detect based on protocol
  if (window.location.protocol === 'https:') {
    // HTTPS: Use path-based websocket connection via Caddy proxy
    // Use configured default server if available, otherwise fall back to current hostname
    const defaultServer = import.meta.env.VITE_DEFAULT_SERVER;
    if (defaultServer) {
      return { address: defaultServer, path: '/ws' };
    }
    return { address: window.location.hostname, path: '/ws' };
  }

  // HTTP (local dev): Use direct port connection
  return { address: window.location.hostname, port: GAME.SERVER_PORT };
}

// Format server config for display
function formatServerConfig(config: ServerConfig): string {
  if (config.path) {
    return `${config.address}${config.path}`;
  }
  return `${config.address}:${config.port}`;
}

class MainMenuModel extends ViewModel() {
  public readonly error = observableValue<string>(this, '');
  public readonly connected = observableValue<boolean>(this, false);
  public readonly connecting = observableValue<boolean>(this, false);
  public readonly games = observableValue<GameInfo[]>(this, []);
  private hasConnected = false;
  public readonly server = getServerConfig();

  constructor() {
    super({});
    this.initConnection();

    // Set up autorun to sync player name with server
    const disposeAutorun = autorun((reader) => {
      const playerName = uiStore.playerName.read(reader);
      const isConnected = this.connected.read(reader);
      if (isConnected && playerName.trim()) {
        gameClient.send({ type: 'setName', playerName: playerName.trim() });
      }
    });
    this._store.add(disposeAutorun);
  }

  private async initConnection() {
    if (this.hasConnected) return;
    this.hasConnected = true;

    this.connecting.set(true, undefined);
    try {
      await gameClient.connect(this.server);
      this.connected.set(true, undefined);
      this.error.set('', undefined);

      // Register latency handler
      gameClient.onLatency((latency) => {
        uiStore.setPingLatency(latency);
      });

      gameClient.onMessage((msg) => {
        switch (msg.type) {
          case 'welcome':
            gameStore.setLocalPlayer(msg.playerId, '');
            // Request game list
            gameClient.send({ type: 'listGames' });
            break;
          case 'gameList':
            this.games.set(msg.games, undefined);
            break;
          case 'joinedGame':
            gameStore.setLocalPlayer('', msg.factionId);
            uiStore.setScreen('lobby');
            break;
          case 'leftGame':
            gameClient.send({ type: 'listGames' });
            break;
          case 'lobbyUpdate':
            gameStore.setGameState({
              phase: 'lobby',
              countries: [],
              companies: [],
              factions: [],
              players: msg.players,
              unitCost: 0,
              winner: null,
            });
            break;
          case 'gameStarted':
            uiStore.setScreen('game');
            break;
          case 'gameState':
            gameStore.setGameState(msg.state);
            if (msg.state.phase === 'playing') {
              uiStore.setScreen('game');
            }
            break;
          case 'error':
            this.error.set(msg.message, undefined);
            break;
        }
      });
    } catch {
      this.error.set(`Failed to connect to ${formatServerConfig(this.server)}`, undefined);
    } finally {
      this.connecting.set(false, undefined);
    }
  }

  handleHost = () => {
    resumeAudio();
    playClick();
    const playerName = uiStore.playerName.get();
    if (!playerName.trim()) {
      this.error.set('Please enter your commander name', undefined);
      return;
    }
    this.error.set('', undefined);
    gameClient.send({ type: 'createGame' });
  };

  handleJoin = (gameId: string) => {
    resumeAudio();
    playClick();
    const playerName = uiStore.playerName.get();
    if (!playerName.trim()) {
      this.error.set('Please enter your commander name', undefined);
      return;
    }
    this.error.set('', undefined);
    gameClient.send({ type: 'joinGame', gameId });
  };

  handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    uiStore.setPlayerName(e.target.value);
  };
}

export const MainMenu = viewWithModel(MainMenuModel, (reader, model) => {
  const playerName = uiStore.playerName.read(reader);
  const error = model.error.read(reader);
  const connected = model.connected.read(reader);
  const connecting = model.connecting.read(reader);
  const games = model.games.read(reader);

  const lobbyGames = games.filter((g) => g.phase === 'lobby');

  return (
    <div style={containerStyle}>
      <div style={canvasContainerStyle}>
        <Canvas gl={{ antialias: true, alpha: false }}>
          <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} near={0.1} far={100} />
          <color attach="background" args={['#050508']} />
          <Starfield />
        </Canvas>
      </div>

      <div style={contentStyle}>
        <h1 style={titleStyle}>TRADEWAR</h1>
        <p style={subtitleStyle}>GALAXY</p>

        <div style={panelStyle}>
          {connecting ? (
            <div style={statusStyle}>Connecting to {formatServerConfig(model.server)}...</div>
          ) : !connected ? (
            <div style={errorStyle}>{error || 'Not connected'}</div>
          ) : (
            <>
              <div>
                <div style={labelStyle}>Commander Name</div>
                <input
                  style={inputStyle}
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={model.handlePlayerNameChange}
                  autoFocus
                />
              </div>

              <div>
                <div style={labelStyle}>Available Games</div>
                <div style={gameListStyle}>
                  {lobbyGames.length === 0 ? (
                    <div style={emptyStyle}>
                      No games available.
                      <br />
                      Create one with the button below!
                    </div>
                  ) : (
                    lobbyGames.map((game) => (
                      <div key={game.id} style={gameItemStyle}>
                        <div style={gameInfoStyle}>
                          <div style={gameNameStyle}>
                            <span style={statusDotStyle(game.phase)} />
                            {game.hostName}'s Game
                          </div>
                          <div style={gameDetailsStyle}>
                            {game.playerCount}/{game.maxPlayers} players
                            {game.players.length > 0 && <> - {game.players.join(', ')}</>}
                          </div>
                        </div>
                        <button style={joinButtonStyle} onClick={() => model.handleJoin(game.id)}>
                          JOIN
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {error && <p style={errorStyle}>{error}</p>}

              <button style={hostButtonStyle} onClick={model.handleHost}>
                HOST NEW GAME
              </button>
            </>
          )}
        </div>

        <p style={{ marginTop: '30px', color: '#445566', fontSize: '13px' }}>
          Server: {formatServerConfig(model.server)}
        </p>
      </div>
    </div>
  );
});

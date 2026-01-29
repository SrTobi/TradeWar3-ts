import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { useUIStore } from '@/store/uiStore';
import { useGameStore } from '@/store/gameStore';
import { unifiedGameClient } from '@/network/unifiedClient';
import { GAME } from '@/game/constants';
import { Starfield } from '@/components/three/Starfield';
import type { GameInfo, ServerMessage } from '@/network/messages';
import { playClick, resumeAudio } from '@/audio/sounds';

// Mode for connection type selection
type UIConnectionMode = 'select' | 'server' | 'p2p-host' | 'p2p-join';

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
  fontSize: '72px',
  fontWeight: 'bold',
  color: '#88bbee',
  marginBottom: '0',
  textShadow: '0 0 30px rgba(136, 187, 238, 0.5), 0 4px 8px rgba(0,0,0,0.8)',
  letterSpacing: '8px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '42px',
  fontWeight: 'bold',
  color: '#ddaa44',
  marginBottom: '30px',
  textShadow: '0 0 20px rgba(221, 170, 68, 0.4), 0 3px 6px rgba(0,0,0,0.6)',
  letterSpacing: '12px',
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(15, 20, 30, 0.9)',
  border: '2px solid rgba(77, 102, 128, 0.5)',
  borderRadius: '12px',
  padding: '24px',
  width: '480px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const inputStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '15px',
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
  padding: '12px 20px',
  fontSize: '15px',
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
  padding: '14px 24px',
  fontSize: '16px',
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
  maxHeight: '250px',
  overflowY: 'auto',
};

const gameItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  background: 'rgba(30, 40, 55, 0.8)',
  borderRadius: '8px',
  border: '1px solid rgba(60, 80, 100, 0.5)',
};

const gameInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const gameNameStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#e0e8f0',
};

const gameDetailsStyle: React.CSSProperties = {
  fontSize: '12px',
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

// Get server from URL param or default to localhost
function getServerAddress(): { address: string; port: number } {
  const params = new URLSearchParams(window.location.search);
  const server = params.get('server');
  if (server) {
    const parts = server.split(':');
    return {
      address: parts[0],
      port: parts[1] ? parseInt(parts[1]) : GAME.SERVER_PORT,
    };
  }
  // Use the current website's hostname as the default address
  return { address: window.location.hostname, port: GAME.SERVER_PORT };
}

// Additional styles for P2P mode
const modeButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: '16px 24px',
  fontSize: '14px',
  marginBottom: '8px',
  width: '100%',
};

const p2pHostButtonStyle: React.CSSProperties = {
  ...modeButtonStyle,
  background: 'linear-gradient(180deg, rgba(68, 102, 68, 1) 0%, rgba(45, 75, 45, 1) 100%)',
  border: '2px solid rgba(102, 153, 102, 0.6)',
};

const p2pJoinButtonStyle: React.CSSProperties = {
  ...modeButtonStyle,
  background: 'linear-gradient(180deg, rgba(68, 85, 119, 1) 0%, rgba(45, 60, 90, 1) 100%)',
  border: '2px solid rgba(102, 136, 170, 0.6)',
};

const backButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: '10px 20px',
  fontSize: '13px',
  background: 'linear-gradient(180deg, rgba(85, 68, 68, 1) 0%, rgba(60, 45, 45, 1) 100%)',
  border: '2px solid rgba(136, 102, 102, 0.6)',
  marginTop: '16px',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: '80px',
  resize: 'vertical' as const,
  fontFamily: 'monospace',
  fontSize: '12px',
};

const copyButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: '8px 16px',
  fontSize: '12px',
};

export function MainMenu() {
  const { playerName, setPlayerName, setScreen, setPingLatency, setIsHost } = useUIStore();
  const { setLocalPlayer, setGameState } = useGameStore();
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [connectionMode, setConnectionMode] = useState<UIConnectionMode>('select');
  const [p2pOffer, setP2pOffer] = useState('');
  const [p2pAnswer, setP2pAnswer] = useState('');
  const [peerOffer, setPeerOffer] = useState('');
  const [currentPeerId, setCurrentPeerId] = useState<string>('');
  const hasConnected = useRef(false);
  const server = getServerAddress();

  // Message handler for the unified client
  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'welcome':
          setLocalPlayer(msg.playerId, '');
          unifiedGameClient.send({ type: 'listGames' });
          break;
        case 'gameList':
          setGames(msg.games);
          break;
        case 'joinedGame':
          setLocalPlayer('', msg.factionId);
          setScreen('lobby');
          break;
        case 'leftGame':
          unifiedGameClient.send({ type: 'listGames' });
          break;
        case 'lobbyUpdate':
          setGameState({
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
          setScreen('game');
          break;
        case 'gameState':
          setGameState(msg.state);
          if (msg.state.phase === 'playing') {
            setScreen('game');
          }
          break;
        case 'error':
          setError(msg.message);
          break;
      }
    },
    [setLocalPlayer, setScreen, setGameState]
  );

  // Connect to server mode
  const connectToServer = useCallback(async () => {
    if (hasConnected.current) return;
    hasConnected.current = true;

    setConnecting(true);
    try {
      await unifiedGameClient.connectToServer(server.address, server.port);
      setConnected(true);
      setError('');

      unifiedGameClient.onLatency((latency) => {
        setPingLatency(latency);
      });

      unifiedGameClient.onMessage(handleMessage);
    } catch {
      setError(`Failed to connect to ${server.address}:${server.port}`);
      hasConnected.current = false;
    } finally {
      setConnecting(false);
    }
  }, [server.address, server.port, handleMessage, setPingLatency]);

  // Start P2P host mode
  const startP2PHost = useCallback(async () => {
    setConnecting(true);
    try {
      unifiedGameClient.startAsHost();
      setConnected(true);
      setIsHost(true);
      setError('');

      unifiedGameClient.onLatency((latency) => {
        setPingLatency(latency);
      });

      unifiedGameClient.onMessage(handleMessage);

      // Create initial offer for peers
      const { peerId, offer } = await unifiedGameClient.createPeerOffer();
      setCurrentPeerId(peerId);
      setP2pOffer(offer);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Failed to start P2P host: ${errorMessage}`);
    } finally {
      setConnecting(false);
    }
  }, [handleMessage, setPingLatency, setIsHost]);

  // Connect as P2P client
  const connectToP2PHost = useCallback(async () => {
    if (!peerOffer.trim()) {
      setError('Please paste the host offer');
      return;
    }

    setConnecting(true);
    try {
      const answer = await unifiedGameClient.connectToHost(peerOffer.trim());
      setP2pAnswer(answer);
      setConnected(true);
      setError('');

      unifiedGameClient.onLatency((latency) => {
        setPingLatency(latency);
      });

      unifiedGameClient.onMessage(handleMessage);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Failed to connect: ${errorMessage}`);
    } finally {
      setConnecting(false);
    }
  }, [peerOffer, handleMessage, setPingLatency]);

  // Accept peer's answer (for host)
  const acceptPeerAnswer = useCallback(async () => {
    if (!p2pAnswer.trim()) {
      setError('Please paste the peer answer');
      return;
    }

    if (!currentPeerId) {
      setError('No peer offer was created');
      return;
    }

    try {
      await unifiedGameClient.acceptPeerAnswer(currentPeerId, p2pAnswer.trim());
      setError('');
      setP2pAnswer('');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(`Failed to accept answer: ${errorMessage}`);
    }
  }, [p2pAnswer, currentPeerId]);

  // Handle mode selection
  const selectMode = (mode: UIConnectionMode) => {
    resumeAudio();
    playClick();
    setConnectionMode(mode);

    if (mode === 'server') {
      connectToServer();
    } else if (mode === 'p2p-host') {
      startP2PHost();
    }
  };

  const goBack = () => {
    playClick();
    unifiedGameClient.disconnect();
    setConnected(false);
    setConnecting(false);
    setError('');
    setP2pOffer('');
    setP2pAnswer('');
    setPeerOffer('');
    setCurrentPeerId('');
    hasConnected.current = false;
    setIsHost(false);
    setConnectionMode('select');
  };

  // Update name when it changes
  useEffect(() => {
    if (connected && playerName.trim()) {
      unifiedGameClient.send({ type: 'setName', playerName: playerName.trim() });
    }
  }, [playerName, connected]);

  const handleHost = () => {
    resumeAudio();
    playClick();
    if (!playerName.trim()) {
      setError('Please enter your commander name');
      return;
    }
    setError('');
    setIsHost(true);
    unifiedGameClient.send({ type: 'createGame' });
  };

  const handleJoin = (gameId: string) => {
    resumeAudio();
    playClick();
    if (!playerName.trim()) {
      setError('Please enter your commander name');
      return;
    }
    setError('');
    unifiedGameClient.send({ type: 'joinGame', gameId });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const lobbyGames = games.filter((g) => g.phase === 'lobby');

  // Render mode selection screen
  const renderModeSelection = () => (
    <>
      <div style={labelStyle}>Choose Connection Mode</div>
      <button style={modeButtonStyle} onClick={() => selectMode('server')}>
        🌐 CONNECT TO SERVER
        <div style={{ fontSize: '11px', color: '#8899aa', marginTop: '4px' }}>
          Join games hosted on a central server
        </div>
      </button>
      <button style={p2pHostButtonStyle} onClick={() => selectMode('p2p-host')}>
        🎮 HOST P2P GAME
        <div style={{ fontSize: '11px', color: '#8899aa', marginTop: '4px' }}>
          Host a game directly from your browser
        </div>
      </button>
      <button style={p2pJoinButtonStyle} onClick={() => selectMode('p2p-join')}>
        🔗 JOIN P2P GAME
        <div style={{ fontSize: '11px', color: '#8899aa', marginTop: '4px' }}>
          Connect directly to another player
        </div>
      </button>
    </>
  );

  // Render server mode
  const renderServerMode = () => (
    <>
      {connecting ? (
        <div style={statusStyle}>
          Connecting to {server.address}:{server.port}...
        </div>
      ) : !connected ? (
        <>
          <div style={errorStyle}>{error || 'Not connected'}</div>
          <button style={backButtonStyle} onClick={goBack}>
            ← BACK
          </button>
        </>
      ) : (
        <>
          <div>
            <div style={labelStyle}>Commander Name</div>
            <input
              style={inputStyle}
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
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
                    <button style={joinButtonStyle} onClick={() => handleJoin(game.id)}>
                      JOIN
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button style={hostButtonStyle} onClick={handleHost}>
            HOST NEW GAME
          </button>
          <button style={backButtonStyle} onClick={goBack}>
            ← BACK
          </button>
        </>
      )}
    </>
  );

  // Render P2P host mode
  const renderP2PHostMode = () => (
    <>
      {connecting ? (
        <div style={statusStyle}>Setting up P2P host...</div>
      ) : !connected ? (
        <>
          <div style={errorStyle}>{error || 'Failed to start host'}</div>
          <button style={backButtonStyle} onClick={goBack}>
            ← BACK
          </button>
        </>
      ) : (
        <>
          <div>
            <div style={labelStyle}>Commander Name</div>
            <input
              style={inputStyle}
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <div style={labelStyle}>Share this offer with your friend:</div>
            <textarea style={textareaStyle} value={p2pOffer} readOnly />
            <button style={copyButtonStyle} onClick={() => copyToClipboard(p2pOffer)}>
              📋 COPY OFFER
            </button>
          </div>

          <div>
            <div style={labelStyle}>Paste their answer here:</div>
            <textarea
              style={textareaStyle}
              value={p2pAnswer}
              onChange={(e) => setP2pAnswer(e.target.value)}
              placeholder="Paste the answer from your friend..."
            />
            <button style={copyButtonStyle} onClick={acceptPeerAnswer}>
              ✓ ACCEPT ANSWER
            </button>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button style={hostButtonStyle} onClick={handleHost}>
            START GAME
          </button>
          <button style={backButtonStyle} onClick={goBack}>
            ← BACK
          </button>
        </>
      )}
    </>
  );

  // Render P2P join mode
  const renderP2PJoinMode = () => (
    <>
      {connecting ? (
        <div style={statusStyle}>Connecting to host...</div>
      ) : !connected ? (
        <>
          <div>
            <div style={labelStyle}>Commander Name</div>
            <input
              style={inputStyle}
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <div style={labelStyle}>Paste the host's offer:</div>
            <textarea
              style={textareaStyle}
              value={peerOffer}
              onChange={(e) => setPeerOffer(e.target.value)}
              placeholder="Paste the offer from the host..."
            />
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button style={hostButtonStyle} onClick={connectToP2PHost}>
            CONNECT TO HOST
          </button>
          <button style={backButtonStyle} onClick={goBack}>
            ← BACK
          </button>
        </>
      ) : (
        <>
          <div>
            <div style={labelStyle}>Share this answer with the host:</div>
            <textarea style={textareaStyle} value={p2pAnswer} readOnly />
            <button style={copyButtonStyle} onClick={() => copyToClipboard(p2pAnswer)}>
              📋 COPY ANSWER
            </button>
          </div>

          <div style={statusStyle}>
            Waiting for host to accept your connection...
            <br />
            Once connected, the host will start the game.
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button style={backButtonStyle} onClick={goBack}>
            ← BACK
          </button>
        </>
      )}
    </>
  );

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
          {connectionMode === 'select' && renderModeSelection()}
          {connectionMode === 'server' && renderServerMode()}
          {connectionMode === 'p2p-host' && renderP2PHostMode()}
          {connectionMode === 'p2p-join' && renderP2PJoinMode()}
        </div>

        {connectionMode === 'server' && connected && (
          <p style={{ marginTop: '30px', color: '#445566', fontSize: '13px' }}>
            Server: {server.address}:{server.port}
          </p>
        )}
        {(connectionMode === 'p2p-host' || connectionMode === 'p2p-join') && (
          <p style={{ marginTop: '30px', color: '#448866', fontSize: '13px' }}>
            🔗 Peer-to-Peer Mode (No Server Required)
          </p>
        )}
      </div>
    </div>
  );
}

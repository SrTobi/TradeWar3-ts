import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { view } from '@vscode/observables-react';
import { gameStore } from '@/store/gameStore';
import { uiStore } from '@/store/uiStore';
import { gameClient } from '@/network/client';
import { FACTION_COLORS, getConnectionStatusColor } from '@/types/game';
import { Starfield } from '@/components/three/Starfield';
import { playClick, playGameStart } from '@/audio/sounds';

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
  fontSize: 'clamp(28px, 8vw, 52px)',
  fontWeight: 'bold',
  color: '#88bbee',
  marginBottom: '8px',
  textShadow: '0 0 30px rgba(136, 187, 238, 0.5), 0 4px 8px rgba(0,0,0,0.8)',
  letterSpacing: 'clamp(2px, 1vw, 4px)',
  textAlign: 'center',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 'clamp(14px, 3vw, 18px)',
  color: '#667788',
  marginBottom: 'clamp(16px, 4vw, 32px)',
  fontStyle: 'italic',
};

const playerContainerStyle: React.CSSProperties = {
  background: 'rgba(15, 20, 30, 0.9)',
  borderRadius: '12px',
  border: '2px solid rgba(77, 102, 128, 0.4)',
  padding: 'clamp(12px, 3vw, 20px)',
  width: '90vw',
  maxWidth: '400px',
  minHeight: '150px',
  marginBottom: 'clamp(16px, 4vw, 32px)',
};

const playerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(6px, 2vw, 12px)',
  padding: 'clamp(6px, 2vw, 10px) clamp(8px, 2vw, 16px)',
  borderRadius: '6px',
  marginBottom: '8px',
  flexWrap: 'wrap',
};

const colorBoxStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '4px',
  border: '2px solid rgba(255,255,255,0.3)',
};

const buttonStyle: React.CSSProperties = {
  padding: 'clamp(10px, 2vw, 16px) clamp(20px, 5vw, 40px)',
  fontSize: 'clamp(14px, 3vw, 18px)',
  fontWeight: 'bold',
  background: 'linear-gradient(180deg, rgba(51, 85, 51, 1) 0%, rgba(35, 65, 35, 1) 100%)',
  border: '2px solid rgba(85, 153, 85, 0.6)',
  borderRadius: '8px',
  color: '#fff',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  letterSpacing: '2px',
};

const leaveButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 28px)',
  fontSize: 'clamp(12px, 2.5vw, 14px)',
  background: 'linear-gradient(180deg, rgba(85, 51, 51, 1) 0%, rgba(65, 35, 35, 1) 100%)',
  border: '2px solid rgba(153, 85, 85, 0.6)',
  marginTop: '16px',
};

const addAiButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  padding: 'clamp(6px, 1.5vw, 10px) clamp(12px, 3vw, 20px)',
  fontSize: 'clamp(11px, 2.5vw, 13px)',
  background: 'linear-gradient(180deg, rgba(68, 85, 102, 1) 0%, rgba(51, 65, 80, 1) 100%)',
  border: '2px solid rgba(102, 136, 170, 0.6)',
  marginTop: '8px',
};

const waitingStyle: React.CSSProperties = {
  color: '#778899',
  fontSize: 'clamp(13px, 3vw, 16px)',
  fontStyle: 'italic',
};

export const Lobby = view({}, (reader) => {
  const gameState = gameStore.gameState.read(reader);
  const local = gameStore.local.read(reader);
  const isHost = uiStore.isHost.read(reader);
  const pingLatency = uiStore.pingLatency.read(reader);

  const getStatusDotStyle = (latency: number | null): React.CSSProperties => {
    const color = getConnectionStatusColor(latency);
    return {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: color,
      boxShadow: latency !== null ? `0 0 4px ${color}` : 'none',
      display: 'inline-block',
    };
  };

  const handleStartGame = () => {
    playGameStart();
    gameClient.send({ type: 'startGame' });
  };

  const handleLeave = () => {
    playClick();
    gameClient.send({ type: 'leaveGame' });
    uiStore.setScreen('menu');
  };

  const handleAddAi = () => {
    playClick();
    gameClient.send({ type: 'addAi' });
  };

  const players = gameState?.players || [];

  // Determine if current player is host (first player in list)
  const isFirstPlayer = players.length > 0 && players[0].factionId === local.factionId;
  const canStart = isHost || isFirstPlayer;

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
        <h1 style={titleStyle}>BATTLE STATIONS</h1>
        <p style={subtitleStyle}>Waiting for commanders...</p>

        <div style={playerContainerStyle}>
          <p
            style={{
              color: '#667788',
              marginBottom: '12px',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            COMMANDERS READY ({players.length})
          </p>
          {players.map((player, index) => {
            const color = FACTION_COLORS[player.factionId] || FACTION_COLORS.faction1;
            const isLocal = player.factionId === local.factionId;
            const isPlayerHost = index === 0;
            return (
              <div
                key={player.id}
                style={{
                  ...playerRowStyle,
                  background: isLocal ? 'rgba(68, 136, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                  border: isLocal ? '1px solid rgba(68, 136, 255, 0.5)' : '1px solid transparent',
                }}
              >
                <div style={{ ...colorBoxStyle, background: color }} />
                <span style={{ color: '#dde', fontWeight: 'bold', flex: 1 }}>{player.name}</span>
                {player.isAi && <span style={{ color: '#aa88dd', fontSize: '12px' }}>AI</span>}
                {isPlayerHost && <span style={{ color: '#ddaa44', fontSize: '12px' }}>HOST</span>}
                {isLocal && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginLeft: '8px',
                    }}
                  >
                    <span style={getStatusDotStyle(pingLatency)} />
                    <span style={{ color: '#88aaff', fontSize: '12px' }}>
                      {pingLatency !== null ? `${pingLatency}ms` : '--'}
                    </span>
                    <span style={{ color: '#88aaff', fontSize: '12px' }}>(YOU)</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {canStart ? (
          <>
            <button style={buttonStyle} onClick={handleStartGame} disabled={players.length < 1}>
              LAUNCH BATTLE
            </button>
            {players.length < 6 && (
              <button style={addAiButtonStyle} onClick={handleAddAi}>
                + ADD AI PLAYER
              </button>
            )}
          </>
        ) : (
          <p style={waitingStyle}>Awaiting host command...</p>
        )}

        <button style={leaveButtonStyle} onClick={handleLeave}>
          LEAVE GAME
        </button>
      </div>
    </div>
  );
});

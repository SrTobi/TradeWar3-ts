import { view } from '@vscode/observables-react';
import { gameStore } from '@/store/gameStore';
import { uiStore } from '@/store/uiStore';
import { getFactionColor, getConnectionStatusColor } from '@/types/game';

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'clamp(8px, 2vw, 16px)',
  right: 'clamp(8px, 2vw, 16px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  maxWidth: 'calc(100vw - 16px)',
};

const playerStyle: React.CSSProperties = {
  padding: 'clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 12px)',
  borderRadius: '4px',
  fontSize: 'clamp(10px, 2.5vw, 14px)',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'clamp(4px, 1vw, 8px)',
};

const pingContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(2px, 0.5vw, 4px)',
  fontSize: 'clamp(9px, 2vw, 11px)',
  fontWeight: 'normal',
  opacity: 0.9,
};

const statusDotStyle = (latency: number | null): React.CSSProperties => {
  const color = getConnectionStatusColor(latency);
  return {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    boxShadow: latency !== null ? `0 0 4px ${color}` : 'none',
  };
};

export const PlayerList = view({}, (reader) => {
  const gameState = gameStore.gameState.read(reader);
  const local = gameStore.local.read(reader);
  const localFactionId = local.factionId;
  const pingLatency = uiStore.pingLatency.read(reader);

  if (!gameState) return null;

  return (
    <div style={containerStyle}>
      {gameState.players.map((player) => {
        const color = getFactionColor(player.factionId);
        const isLocal = player.factionId === localFactionId;

        return (
          <div
            key={player.id}
            style={{
              ...playerStyle,
              background: color,
              border: isLocal ? '2px solid white' : 'none',
            }}
          >
            <span>
              {player.name} {isLocal ? '(You)' : ''}
            </span>
            {isLocal && (
              <div style={pingContainerStyle}>
                <div style={statusDotStyle(pingLatency)} />
                <span>{pingLatency !== null ? `${pingLatency}ms` : '--'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

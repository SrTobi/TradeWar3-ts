import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { getFactionColor, getConnectionStatusColor } from '@/types/game';

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const playerStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
};

const pingContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
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

export function PlayerList() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);
  const pingLatency = useUIStore((s) => s.pingLatency);

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
}

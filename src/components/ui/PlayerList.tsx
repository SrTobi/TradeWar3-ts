import { useGameStore } from '@/store/gameStore';
import { getFactionColor } from '@/types/game';

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
};

export function PlayerList() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);

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
            {player.name} {isLocal ? '(You)' : ''}
          </div>
        );
      })}
    </div>
  );
}

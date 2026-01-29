import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { StockPanel } from './StockPanel';
import { PlayerList } from './PlayerList';
import { playVictory, playDefeat, playClick } from '@/audio/sounds';

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

const interactiveStyle: React.CSSProperties = {
  pointerEvents: 'auto',
};

const winnerOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(0, 0, 0, 0.9)',
  padding: '40px 60px',
  borderRadius: '12px',
  border: '3px solid #4af',
  textAlign: 'center',
  pointerEvents: 'auto',
};

export function GameOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);
  const setScreen = useUIStore((s) => s.setScreen);
  const reset = useGameStore((s) => s.reset);
  const prevPhaseRef = useRef<string | null>(null);

  const isWinner = gameState?.winner?.id === localFactionId;

  // Play victory/defeat sound when game ends
  useEffect(() => {
    if (gameState?.phase === 'ended' && prevPhaseRef.current !== 'ended') {
      if (isWinner) {
        playVictory();
      } else {
        playDefeat();
      }
    }
    prevPhaseRef.current = gameState?.phase ?? null;
  }, [gameState?.phase, isWinner]);

  const handleReturnToMenu = () => {
    playClick();
    reset();
    setScreen('menu');
  };

  return (
    <div style={overlayStyle}>
      <div style={interactiveStyle}>
        <StockPanel />
        <PlayerList />
      </div>

      {gameState?.phase === 'ended' && (
        <div style={winnerOverlayStyle}>
          <h1 style={{ color: isWinner ? '#4f8' : '#f44', marginBottom: '16px' }}>
            {isWinner ? 'VICTORY!' : 'DEFEAT'}
          </h1>
          <p style={{ color: '#aaa', marginBottom: '24px' }}>
            {gameState.winner?.name} has conquered the galaxy!
          </p>
          <button
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#335',
              border: '2px solid #557',
              color: '#fff',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
            onClick={handleReturnToMenu}
          >
            Return to Menu
          </button>
        </div>
      )}
    </div>
  );
}

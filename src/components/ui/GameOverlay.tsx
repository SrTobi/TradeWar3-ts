import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { StockPanel } from './StockPanel';
import { PlayerList } from './PlayerList';
import { playVictory, playDefeat, playClick } from '@/audio/sounds';
import { usePlaceUnits } from '@/hooks/usePlaceUnits';

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
  const lastPlacedCoords = useUIStore((s) => s.lastPlacedCoords);
  const prevPhaseRef = useRef<string | null>(null);
  const placeUnitsButtonRef = useRef<HTMLButtonElement>(null);
  const { placeUnits } = usePlaceUnits();

  const isWinner = gameState?.winner?.id === localFactionId;

  // Focus the hidden button when lastPlacedCoords changes (after placing units)
  useEffect(() => {
    if (lastPlacedCoords && placeUnitsButtonRef.current) {
      placeUnitsButtonRef.current.focus();
    }
  }, [lastPlacedCoords]);

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

  // Handler to repeat the last unit placement (for spacebar)
  const handleRepeatPlaceUnits = () => {
    if (lastPlacedCoords) {
      placeUnits(lastPlacedCoords);
    }
  };

  return (
    <div style={overlayStyle}>
      {/* Hidden button for spacebar to repeat unit placement */}
      <button
        ref={placeUnitsButtonRef}
        onClick={handleRepeatPlaceUnits}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          padding: 0,
          border: 'none',
        }}
        aria-label="Place units"
        tabIndex={-1}
      />

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

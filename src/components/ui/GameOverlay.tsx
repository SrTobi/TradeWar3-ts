import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { StockPanel } from './StockPanel';
import { PlayerList } from './PlayerList';
import { playVictory, playDefeat, playClick, playPlaceUnit, playError } from '@/audio/sounds';
import { canPlaceUnits } from '@/game/battle';
import { unifiedGameClient } from '@/network/unifiedClient';

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

const hiddenButtonStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
  pointerEvents: 'auto',
};

export function GameOverlay() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);
  const spendMoney = useGameStore((s) => s.spendMoney);
  const setScreen = useUIStore((s) => s.setScreen);
  const reset = useGameStore((s) => s.reset);
  const lastClickedHex = useUIStore((s) => s.lastClickedHex);
  const prevPhaseRef = useRef<string | null>(null);
  const troopButtonRef = useRef<HTMLButtonElement>(null);

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

  // Focus the hidden troop button when a hex is clicked to enable spacebar repeat
  useEffect(() => {
    if (lastClickedHex && troopButtonRef.current) {
      troopButtonRef.current.focus();
    }
  }, [lastClickedHex]);

  // Handle repeating troop placement via the hidden button
  const handleRepeatTroopPlacement = () => {
    if (!gameState || !localFactionId || !lastClickedHex) return;
    if (gameState.phase !== 'playing') return;

    const country = gameState.countries.find(
      (c) => c.coords.q === lastClickedHex.q && c.coords.r === lastClickedHex.r
    );
    if (!country) return;

    if (!canPlaceUnits(country, gameState.countries, localFactionId)) {
      playError();
      return;
    }

    if (spendMoney(gameState.unitCost)) {
      playPlaceUnit();
      unifiedGameClient.send({ type: 'placeUnits', coords: lastClickedHex });
    } else {
      playError();
    }
  };

  const handleReturnToMenu = () => {
    playClick();
    reset();
    setScreen('menu');
  };

  return (
    <div style={overlayStyle}>
      {/* Hidden button for spacebar repeat of troop placement */}
      <button
        ref={troopButtonRef}
        style={hiddenButtonStyle}
        onClick={handleRepeatTroopPlacement}
        aria-label="Repeat troop placement"
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

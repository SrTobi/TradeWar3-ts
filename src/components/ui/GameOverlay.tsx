import React from 'react';
import { autorun } from '@vscode/observables';
import { ViewModel, viewWithModel } from '@vscode/observables-react';
import { gameStore } from '@/store/gameStore';
import { uiStore } from '@/store/uiStore';
import { StockPanel } from './StockPanel';
import { PlayerList } from './PlayerList';
import { playVictory, playDefeat, playClick, playPlaceUnit, playError } from '@/audio/sounds';
import { canPlaceUnits } from '@/game/battle';
import { gameClient } from '@/network/client';
import { getEffectiveUnitCost } from '@/game/constants';

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

class GameOverlayModel extends ViewModel() {
  private prevPhase: string | null = null;
  public troopButtonRef: React.RefObject<HTMLButtonElement | null> = { current: null };

  constructor() {
    super({});

    // Set up autorun to play victory/defeat sound when game ends
    const disposeAutorun = autorun((reader) => {
      const gameState = gameStore.gameState.read(reader);
      const local = gameStore.local.read(reader);
      const localFactionId = local.factionId;
      const isWinner = gameState?.winner?.id === localFactionId;

      if (gameState?.phase === 'ended' && this.prevPhase !== 'ended') {
        if (isWinner) {
          playVictory();
        } else {
          playDefeat();
        }
      }
      this.prevPhase = gameState?.phase ?? null;
    });
    this._store.add(disposeAutorun);

    // Set up autorun to focus troop button when hex is clicked
    const disposeFocusAutorun = autorun((reader) => {
      const lastClickedHex = uiStore.lastClickedHex.read(reader);
      if (lastClickedHex && this.troopButtonRef.current) {
        this.troopButtonRef.current.focus();
      }
    });
    this._store.add(disposeFocusAutorun);
  }

  handleRepeatTroopPlacement = () => {
    const gameState = gameStore.gameState.get();
    const local = gameStore.local.get();
    const localFactionId = local.factionId;
    const lastClickedHex = uiStore.lastClickedHex.get();
    const playerName = uiStore.playerName.get();

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

    const effectiveCost = getEffectiveUnitCost(gameState.unitCost, playerName);
    if (gameStore.spendMoney(effectiveCost)) {
      playPlaceUnit();
      gameClient.send({ type: 'placeUnits', coords: lastClickedHex });
    } else {
      playError();
    }
  };

  handleReturnToMenu = () => {
    playClick();
    gameStore.reset();
    uiStore.setScreen('menu');
  };
}

export const GameOverlay = viewWithModel(GameOverlayModel, (reader, model) => {
  const gameState = gameStore.gameState.read(reader);
  const local = gameStore.local.read(reader);
  const localFactionId = local.factionId;
  const isWinner = gameState?.winner?.id === localFactionId;

  return (
    <div style={overlayStyle}>
      {/* Hidden button for spacebar repeat of troop placement */}
      <button
        ref={model.troopButtonRef}
        style={hiddenButtonStyle}
        onClick={model.handleRepeatTroopPlacement}
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
            onClick={model.handleReturnToMenu}
          >
            Return to Menu
          </button>
        </div>
      )}
    </div>
  );
});

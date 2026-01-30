import { view } from '@vscode/observables-react';
import { gameStore } from '@/store/gameStore';
import { uiStore } from '@/store/uiStore';
import { GameScene } from '@/components/three/GameScene';
import { GameOverlay } from '@/components/ui/GameOverlay';

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

// Game component reads observable state and passes it as props to GameScene
// This bridges the reactive observable system with React Three Fiber
export const Game = view({}, (reader) => {
  const gameState = gameStore.gameState.read(reader);
  const local = gameStore.local.read(reader);
  const hoveredHex = uiStore.hoveredHex.read(reader);

  return (
    <div style={containerStyle}>
      <GameScene gameState={gameState} local={local} hoveredHex={hoveredHex} />
      <GameOverlay />
    </div>
  );
});

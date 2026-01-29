import { GameScene } from '@/components/three/GameScene';
import { GameOverlay } from '@/components/ui/GameOverlay';

const containerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

export function Game() {
  return (
    <div style={containerStyle}>
      <GameScene />
      <GameOverlay />
    </div>
  );
}

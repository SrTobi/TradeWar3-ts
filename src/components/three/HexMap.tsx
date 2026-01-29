import { useGameStore } from '@/store/gameStore';
import { Hex } from './Hex';
import { Connections } from './Connections';
import { Particles } from './Particles';
import type { HexCoord } from '@/types/game';
import { usePlaceUnits } from '@/hooks/usePlaceUnits';

const HEX_SIZE = 1;

export function HexMap() {
  const gameState = useGameStore((s) => s.gameState);
  const { placeUnits } = usePlaceUnits();

  if (!gameState) return null;

  const handleHexClick = (coords: HexCoord) => {
    placeUnits(coords);
  };

  return (
    <group>
      {/* Connection bridges between allied territories */}
      <Connections countries={gameState.countries} size={HEX_SIZE} />

      {/* Hex tiles */}
      {gameState.countries.map((country) => (
        <Hex
          key={`${country.coords.q},${country.coords.r}`}
          country={country}
          size={HEX_SIZE}
          onClick={() => handleHexClick(country.coords)}
        />
      ))}

      {/* Battle particles */}
      <Particles countries={gameState.countries} size={HEX_SIZE} />
    </group>
  );
}

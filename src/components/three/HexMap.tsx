import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { gameClient } from '@/network/client';
import { Hex } from './Hex';
import { Connections } from './Connections';
import { Particles } from './Particles';
import type { HexCoord } from '@/types/game';
import { canPlaceUnits } from '@/game/battle';
import { playPlaceUnit, playError } from '@/audio/sounds';

const HEX_SIZE = 1;

export function HexMap() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);
  const spendMoney = useGameStore((s) => s.spendMoney);
  const setLastClickedHex = useUIStore((s) => s.setLastClickedHex);

  if (!gameState) return null;

  const handleHexClick = (coords: HexCoord) => {
    if (!localFactionId) return;
    if (gameState.phase !== 'playing') return;

    // Find the country at these coordinates
    const country = gameState.countries.find(
      (c) => c.coords.q === coords.q && c.coords.r === coords.r
    );
    if (!country) return;

    // Check if we can place units here
    if (!canPlaceUnits(country, gameState.countries, localFactionId)) {
      playError();
      return;
    }

    // Now try to spend money
    if (spendMoney(gameState.unitCost)) {
      playPlaceUnit();
      gameClient.send({ type: 'placeUnits', coords });
      // Store the last clicked hex so spacebar can repeat the action
      setLastClickedHex(coords);
    } else {
      playError();
    }
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
          countries={gameState.countries}
          size={HEX_SIZE}
          onClick={() => handleHexClick(country.coords)}
        />
      ))}

      {/* Battle particles */}
      <Particles countries={gameState.countries} size={HEX_SIZE} />
    </group>
  );
}

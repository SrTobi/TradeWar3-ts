import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { gameClient } from '@/network/client';
import { canPlaceUnits } from '@/game/battle';
import { playPlaceUnit, playError } from '@/audio/sounds';
import type { HexCoord } from '@/types/game';

export function usePlaceUnits() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);
  const spendMoney = useGameStore((s) => s.spendMoney);
  const setLastPlacedCoords = useUIStore((s) => s.setLastPlacedCoords);

  /**
   * Try to place units at the given coordinates.
   * Returns true if successful, false otherwise.
   */
  const placeUnits = (coords: HexCoord): boolean => {
    if (!localFactionId || !gameState) return false;
    if (gameState.phase !== 'playing') return false;

    // Find the country at these coordinates
    const country = gameState.countries.find(
      (c) => c.coords.q === coords.q && c.coords.r === coords.r
    );
    if (!country) return false;

    // Check if we can place units here
    if (!canPlaceUnits(country, gameState.countries, localFactionId)) {
      playError();
      return false;
    }

    // Try to spend money and place units
    if (spendMoney(gameState.unitCost)) {
      playPlaceUnit();
      gameClient.send({ type: 'placeUnits', coords });
      setLastPlacedCoords(coords);
      return true;
    } else {
      playError();
      return false;
    }
  };

  return { placeUnits };
}

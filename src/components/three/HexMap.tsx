import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { gameClient } from '@/network/client';
import { Hex } from './Hex';
import { Connections } from './Connections';
import { Particles } from './Particles';
import type { HexCoord } from '@/types/game';
import { canPlaceUnits, countControlledNeighbors } from '@/game/battle';
import { hexKey } from '@/game/hex';
import { GAME, getEffectiveUnitCost } from '@/game/constants';
import { playPlaceUnit, playError } from '@/audio/sounds';

const HEX_SIZE = 1;

export function HexMap() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);
  const spendMoney = useGameStore((s) => s.spendMoney);
  const setLastClickedHex = useUIStore((s) => s.setLastClickedHex);
  const playerName = useUIStore((s) => s.playerName);

  // Pre-compute defense bonuses for all hexes to avoid recalculating in each Hex component
  // Only show defense bonus for the local player in territories that are at war (contested)
  const defenseBonusMap = useMemo(() => {
    if (!gameState || !localFactionId) return new Map<string, number>();

    const bonusMap = new Map<string, number>();
    for (const country of gameState.countries) {
      // Check if the local player has units in this country
      const localUnits = country.units[localFactionId] ?? 0;
      if (localUnits <= 0) {
        bonusMap.set(hexKey(country.coords), 0);
        continue;
      }

      // Check if the country is at war (multiple factions with units)
      const factionsInCountry = Object.keys(country.units).filter((id) => country.units[id] > 0);
      const isAtWar = factionsInCountry.length > 1;
      if (!isAtWar) {
        bonusMap.set(hexKey(country.coords), 0);
        continue;
      }

      // Calculate the local player's territorial advantage
      const controlledNeighbors = countControlledNeighbors(
        country,
        gameState.countries,
        localFactionId
      );
      const bonus = Math.min(
        controlledNeighbors * GAME.TERRITORIAL_ADVANTAGE_PER_NEIGHBOR,
        GAME.MAX_TERRITORIAL_ADVANTAGE
      );
      bonusMap.set(hexKey(country.coords), bonus);
    }
    return bonusMap;
  }, [gameState, localFactionId]);

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
    const effectiveCost = getEffectiveUnitCost(gameState.unitCost, playerName);
    if (spendMoney(effectiveCost)) {
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
          defenseBonus={defenseBonusMap.get(hexKey(country.coords)) ?? 0}
          localFactionId={localFactionId}
          size={HEX_SIZE}
          onClick={() => handleHexClick(country.coords)}
        />
      ))}

      {/* Battle particles */}
      <Particles countries={gameState.countries} size={HEX_SIZE} />
    </group>
  );
}

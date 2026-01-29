import type { Country, Faction } from '@/types/game';
import { GAME } from './constants';
import { hexNeighbors, hexKey } from './hex';

export function getCountryOwner(country: Country): string {
  let maxUnits = 0;
  let owner = 'neutral';
  for (const [factionId, units] of Object.entries(country.units)) {
    if (units > maxUnits) {
      maxUnits = units;
      owner = factionId;
    }
  }
  return owner;
}

export function getTotalUnits(country: Country): number {
  return Object.values(country.units).reduce((sum, n) => sum + n, 0);
}

export function getNonNeutralUnitCount(countries: Country[]): number {
  let total = 0;
  for (const country of countries) {
    for (const [factionId, units] of Object.entries(country.units)) {
      if (factionId !== 'neutral') {
        total += units;
      }
    }
  }
  return total;
}

export function calculateUnitCost(countries: Country[]): number {
  const nonNeutralUnits = getNonNeutralUnitCount(countries);
  return GAME.BASE_UNIT_COST + nonNeutralUnits * GAME.UNIT_COST_INCREASE;
}

export function countControlledNeighbors(
  country: Country,
  countries: Country[],
  factionId: string
): number {
  const countryMap = new Map(countries.map((c) => [hexKey(c.coords), c]));
  const neighbors = hexNeighbors(country.coords);
  let controlled = 0;
  for (const neighborCoord of neighbors) {
    const neighbor = countryMap.get(hexKey(neighborCoord));
    if (neighbor && getCountryOwner(neighbor) === factionId) {
      controlled++;
    }
  }
  return controlled;
}

export function processBattle(country: Country, countries: Country[], now: number): Country {
  const factionIds = Object.keys(country.units).filter((id) => country.units[id] > 0);
  if (factionIds.length <= 1) {
    return {
      ...country,
      nextBattleTime: now + randomBattleInterval(),
    };
  }

  const newUnits = { ...country.units };
  const casualtyRate =
    GAME.BATTLE_CASUALTY_MIN +
    Math.random() * (GAME.BATTLE_CASUALTY_MAX - GAME.BATTLE_CASUALTY_MIN);

  for (const factionId of factionIds) {
    const enemyUnits = factionIds
      .filter((id) => id !== factionId)
      .reduce((sum, id) => sum + country.units[id], 0);

    const controlledNeighbors = countControlledNeighbors(country, countries, factionId);
    const territorialAdvantage = Math.min(
      controlledNeighbors * GAME.TERRITORIAL_ADVANTAGE_PER_NEIGHBOR,
      GAME.MAX_TERRITORIAL_ADVANTAGE
    );

    const effectiveCasualtyRate = Math.max(0, casualtyRate - territorialAdvantage);
    const casualties = Math.floor(enemyUnits * effectiveCasualtyRate * Math.random());
    newUnits[factionId] = Math.max(0, country.units[factionId] - casualties);
  }

  for (const factionId of Object.keys(newUnits)) {
    if (newUnits[factionId] <= 0) {
      delete newUnits[factionId];
    }
  }

  return {
    ...country,
    units: newUnits,
    nextBattleTime: now + randomBattleInterval(),
  };
}

export function canPlaceUnits(
  targetCountry: Country,
  countries: Country[],
  factionId: string
): boolean {
  // Can always reinforce where you already have units
  if (targetCountry.units[factionId] > 0) {
    return true;
  }

  // Can expand from adjacent territory where you have dominant force
  const countryMap = new Map(countries.map((c) => [hexKey(c.coords), c]));
  const neighbors = hexNeighbors(targetCountry.coords);

  for (const neighborCoord of neighbors) {
    const neighbor = countryMap.get(hexKey(neighborCoord));
    if (!neighbor) continue;

    const myUnits = neighbor.units[factionId] || 0;
    if (myUnits === 0) continue;

    // Count ALL other units (including neutrals)
    const otherUnits = Object.entries(neighbor.units)
      .filter(([id]) => id !== factionId)
      .reduce((sum, [, n]) => sum + n, 0);

    // Need MORE than 2x other units to expand (strict >)
    if (myUnits > GAME.EXPANSION_THRESHOLD * otherUnits) {
      return true;
    }
  }

  return false;
}

function randomBattleInterval(): number {
  return (
    GAME.BATTLE_MIN_INTERVAL + Math.random() * (GAME.BATTLE_MAX_INTERVAL - GAME.BATTLE_MIN_INTERVAL)
  );
}

export function checkWinner(countries: Country[], factions: Faction[]): Faction | null {
  // find the one faction that has units on the map
  let factionWithUnits: string | null = null;

  for (const country of countries) {
    for (const [factionId, units] of Object.entries(country.units)) {
      if (units > 0 && factionId !== 'neutral') {
        if (factionWithUnits === null) {
          factionWithUnits = factionId;
        } else if (factionWithUnits !== factionId) {
          return null; // More than one faction has units
        }
      }
    }
  }
  
  return factions.find((f) => f.id === factionWithUnits) || null;
}

export interface HexCoord {
  q: number;
  r: number;
}

export interface Faction {
  id: string;
  name: string;
}

export interface Country {
  coords: HexCoord;
  units: Record<string, number>;
  nextBattleTime: number;
}

export interface Company {
  id: string;
  name: string;
  price: number;
  previousPrice: number;
  nextUpdateTime: number;
}

export interface Player {
  id: string;
  name: string;
  factionId: string;
  isAi?: boolean;
}

export interface GameState {
  phase: 'lobby' | 'playing' | 'ended';
  countries: Country[];
  companies: Company[];
  factions: Faction[];
  players: Player[];
  unitCost: number;
  winner: Faction | null;
}

export interface LocalPlayerState {
  playerId: string | null;
  factionId: string | null;
  money: number;
  holdings: Record<string, number>;
  bulkAmount: number;
}

export const NEUTRAL_FACTION: Faction = {
  id: 'neutral',
  name: 'Neutral',
};

export const FACTION_COLORS: Record<string, string> = {
  neutral: '#666666',
  faction0: '#4488ff', // Blue
  faction1: '#ff4444', // Red
  faction2: '#ffaa00', // Orange
  faction3: '#44ff88', // Green
  faction4: '#ff44ff', // Magenta
  faction5: '#44ffff', // Cyan
};

export function getFactionColor(factionId: string): string {
  if (factionId === 'neutral') return FACTION_COLORS.neutral;
  return FACTION_COLORS[factionId] || FACTION_COLORS.faction0;
}

export function getConnectionStatusColor(latency: number | null): string {
  if (latency === null) {
    return '#666666'; // Gray - unknown/disconnected
  } else if (latency < 100) {
    return '#44dd66'; // Green - good connection
  } else if (latency < 200) {
    return '#ddaa44'; // Yellow - moderate connection
  } else {
    return '#ff4444'; // Red - poor connection
  }
}

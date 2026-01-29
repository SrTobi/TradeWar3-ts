import { create } from 'zustand';
import type { HexCoord } from '@/types/game';

type Screen = 'menu' | 'lobby' | 'game';

interface BattleParticle {
  id: string;
  coords: HexCoord;
  startTime: number;
}

interface UIStore {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  hoveredHex: HexCoord | null;
  setHoveredHex: (hex: HexCoord | null) => void;
  lastClickedHex: HexCoord | null;
  setLastClickedHex: (hex: HexCoord | null) => void;
  battleParticles: BattleParticle[];
  addBattleParticle: (coords: HexCoord) => void;
  removeBattleParticle: (id: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  isHost: boolean;
  setIsHost: (isHost: boolean) => void;
}

let particleId = 0;

// Load commander name from localStorage
function loadPlayerName(): string {
  try {
    return localStorage.getItem('tradewar-commander-name') || '';
  } catch {
    return '';
  }
}

// Save commander name to localStorage
function savePlayerName(name: string): void {
  try {
    localStorage.setItem('tradewar-commander-name', name);
  } catch {
    // Ignore localStorage errors
  }
}

export const useUIStore = create<UIStore>((set) => ({
  screen: 'menu',
  setScreen: (screen) => set({ screen }),

  hoveredHex: null,
  setHoveredHex: (hex) => set({ hoveredHex: hex }),

  lastClickedHex: null,
  setLastClickedHex: (hex) => set({ lastClickedHex: hex }),

  battleParticles: [],
  addBattleParticle: (coords) => {
    const id = `particle-${particleId++}`;
    set((s) => ({
      battleParticles: [...s.battleParticles, { id, coords, startTime: Date.now() }],
    }));
    setTimeout(() => {
      set((s) => ({
        battleParticles: s.battleParticles.filter((p) => p.id !== id),
      }));
    }, 1000);
  },

  playerName: loadPlayerName(),
  setPlayerName: (name) => {
    savePlayerName(name);
    set({ playerName: name });
  },

  isHost: false,
  setIsHost: (isHost) => set({ isHost }),

  removeBattleParticle: (id) =>
    set((s) => ({
      battleParticles: s.battleParticles.filter((p) => p.id !== id),
    })),
}));

import { create } from 'zustand';
import type { HexCoord } from '@/types/game';

type Screen = 'menu' | 'lobby' | 'game';

interface BattleParticle {
  id: string;
  coords: HexCoord;
  startTime: number;
}

interface VolumeSettings {
  musicVolume: number; // 0.0 - 1.0
  soundVolume: number; // 0.0 - 1.0
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
  pingLatency: number | null;
  setPingLatency: (latency: number | null) => void;
  volumeSettings: VolumeSettings;
  setMusicVolume: (volume: number) => void;
  setSoundVolume: (volume: number) => void;
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

const DEFAULT_VOLUME_SETTINGS: VolumeSettings = {
  musicVolume: 0.7,
  soundVolume: 0.5,
};

// Load volume settings from localStorage
function loadVolumeSettings(): VolumeSettings {
  try {
    const stored = localStorage.getItem('tradewar-volume-settings');
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<VolumeSettings>;
      return {
        musicVolume:
          typeof parsed.musicVolume === 'number' ? parsed.musicVolume : DEFAULT_VOLUME_SETTINGS.musicVolume,
        soundVolume:
          typeof parsed.soundVolume === 'number' ? parsed.soundVolume : DEFAULT_VOLUME_SETTINGS.soundVolume,
      };
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_VOLUME_SETTINGS;
}

// Save volume settings to localStorage
function saveVolumeSettings(settings: VolumeSettings): void {
  try {
    localStorage.setItem('tradewar-volume-settings', JSON.stringify(settings));
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

  pingLatency: null,
  setPingLatency: (latency) => set({ pingLatency: latency }),

  removeBattleParticle: (id) =>
    set((s) => ({
      battleParticles: s.battleParticles.filter((p) => p.id !== id),
    })),

  volumeSettings: loadVolumeSettings(),
  setMusicVolume: (volume) =>
    set((s) => {
      const newSettings = { ...s.volumeSettings, musicVolume: volume };
      saveVolumeSettings(newSettings);
      return { volumeSettings: newSettings };
    }),
  setSoundVolume: (volume) =>
    set((s) => {
      const newSettings = { ...s.volumeSettings, soundVolume: volume };
      saveVolumeSettings(newSettings);
      return { volumeSettings: newSettings };
    }),
}));

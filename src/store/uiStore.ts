import { observableValue } from '@vscode/observables';
import type { HexCoord } from '@/types/game';

export type Screen = 'menu' | 'lobby' | 'game';

interface BattleParticle {
  id: string;
  coords: HexCoord;
  startTime: number;
}

interface VolumeSettings {
  musicVolume: number; // 0.0 - 1.0
  soundVolume: number; // 0.0 - 1.0
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

// UI Store using observables
class UIStoreClass {
  readonly screen = observableValue<Screen>('uiStore.screen', 'menu');
  readonly hoveredHex = observableValue<HexCoord | null>('uiStore.hoveredHex', null);
  readonly lastClickedHex = observableValue<HexCoord | null>('uiStore.lastClickedHex', null);
  readonly battleParticles = observableValue<BattleParticle[]>('uiStore.battleParticles', []);
  readonly playerName = observableValue<string>('uiStore.playerName', loadPlayerName());
  readonly isHost = observableValue<boolean>('uiStore.isHost', false);
  readonly pingLatency = observableValue<number | null>('uiStore.pingLatency', null);
  readonly volumeSettings = observableValue<VolumeSettings>('uiStore.volumeSettings', loadVolumeSettings());

  setScreen = (screen: Screen) => {
    this.screen.set(screen, undefined);
  };

  setHoveredHex = (hex: HexCoord | null) => {
    this.hoveredHex.set(hex, undefined);
  };

  setLastClickedHex = (hex: HexCoord | null) => {
    this.lastClickedHex.set(hex, undefined);
  };

  addBattleParticle = (coords: HexCoord) => {
    const id = `particle-${particleId++}`;
    const current = this.battleParticles.get();
    this.battleParticles.set([...current, { id, coords, startTime: Date.now() }], undefined);
    setTimeout(() => {
      this.removeBattleParticle(id);
    }, 1000);
  };

  removeBattleParticle = (id: string) => {
    const current = this.battleParticles.get();
    this.battleParticles.set(current.filter((p) => p.id !== id), undefined);
  };

  setPlayerName = (name: string) => {
    savePlayerName(name);
    this.playerName.set(name, undefined);
  };

  setIsHost = (isHost: boolean) => {
    this.isHost.set(isHost, undefined);
  };

  setPingLatency = (latency: number | null) => {
    this.pingLatency.set(latency, undefined);
  };

  setMusicVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const current = this.volumeSettings.get();
    const newSettings = { ...current, musicVolume: clampedVolume };
    saveVolumeSettings(newSettings);
    this.volumeSettings.set(newSettings, undefined);
  };

  setSoundVolume = (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const current = this.volumeSettings.get();
    const newSettings = { ...current, soundVolume: clampedVolume };
    saveVolumeSettings(newSettings);
    this.volumeSettings.set(newSettings, undefined);
  };
}

// Singleton instance
export const uiStore = new UIStoreClass();

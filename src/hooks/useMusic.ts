import { gameStore } from '@/store/gameStore';
import { autorun, IDisposable } from '@vscode/observables';
import { getCountryOwner } from '@/game/battle';

export type MusicTrack = 'menu' | 'game' | 'battle' | 'victory' | 'danger';

const DEFAULT_MUSIC_VOLUME = 0.7;
const MUSIC_UPDATE_INTERVAL = 2000; // ms

const BASE_PATH = import.meta.env.BASE_URL;

// Music file paths - place your audio files in public/music/
const MUSIC_PATHS: Record<MusicTrack, string> = {
  menu: `${BASE_PATH}music/menu.mp3`,
  game: `${BASE_PATH}music/game.mp3`,
  battle: `${BASE_PATH}music/battle.mp3`,
  victory: `${BASE_PATH}music/victory.mp3`,
  danger: `${BASE_PATH}music/danger.mp3`,
};

class MusicManager {
  private currentTrack: MusicTrack | null = null;
  private audio: HTMLAudioElement | null = null;
  private loaded: Map<MusicTrack, HTMLAudioElement> = new Map();
  private currentVolume: number = DEFAULT_MUSIC_VOLUME;
  private disposeAutorun: IDisposable | null = null;
  private lastUpdateTime: number = 0;

  private getAudio(track: MusicTrack): HTMLAudioElement | null {
    if (this.loaded.has(track)) {
      return this.loaded.get(track)!;
    }

    try {
      const audio = new Audio(MUSIC_PATHS[track]);
      audio.loop = true;
      audio.volume = this.currentVolume;
      this.loaded.set(track, audio);
      return audio;
    } catch (e) {
      console.warn(`Failed to load music track: ${track} (${e})`);
      return null;
    }
  }

  play(track: MusicTrack): void {
    if (this.currentTrack === track && this.audio?.paused === false) {
      return;
    }

    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    const newAudio = this.getAudio(track);
    if (newAudio) {
      newAudio.play().catch(() => {
        // Audio autoplay blocked - user hasn't interacted yet
      });
      this.audio = newAudio;
      this.currentTrack = track;
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.currentTrack = null;
  }

  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.loaded.forEach((audio) => {
      audio.volume = this.currentVolume;
    });
  }

  getVolume(): number {
    return this.currentVolume;
  }

  private updateMusicBasedOnState(): void {
    const gameState = gameStore.gameState.get();
    const local = gameStore.local.get();
    const localFactionId = local.factionId;

    if (!gameState || !localFactionId) {
      this.play('menu');
      return;
    }

    if (gameState.phase === 'lobby') {
      this.play('menu');
      return;
    }

    if (gameState.phase === 'ended') {
      const isWinner = gameState.winner?.id === localFactionId;
      this.play(isWinner ? 'victory' : 'danger');
      return;
    }

    // Game is playing - update music based on game state periodically
    const now = Date.now();
    if (now - this.lastUpdateTime < MUSIC_UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTime = now;

    // Calculate player's territory share
    const totalTerritories = gameState.countries.length;
    let playerTerritories = 0;
    let playerUnits = 0;
    let activeBattles = 0;
    let threatenedBorders = 0;

    const playerCountryCoords = new Set<string>();

    for (const country of gameState.countries) {
      const owner = getCountryOwner(country);
      if (owner === localFactionId) {
        playerTerritories++;
        playerCountryCoords.add(`${country.coords.q},${country.coords.r}`);
      }

      const playerUnitsInCountry = country.units[localFactionId] || 0;
      playerUnits += playerUnitsInCountry;

      // Check for active battles (multiple factions present)
      const factionsPresent = Object.keys(country.units).filter(
        (id) => country.units[id] > 0 && id !== 'neutral'
      );
      if (factionsPresent.length > 1) {
        activeBattles++;
      }
    }

    // Count threatened borders (enemy hexes adjacent to player hexes)
    for (const country of gameState.countries) {
      const owner = getCountryOwner(country);
      if (owner !== localFactionId && owner !== 'neutral') {
        // Check if adjacent to player territory
        const neighbors = [
          { q: country.coords.q + 1, r: country.coords.r },
          { q: country.coords.q - 1, r: country.coords.r },
          { q: country.coords.q, r: country.coords.r + 1 },
          { q: country.coords.q, r: country.coords.r - 1 },
          { q: country.coords.q + 1, r: country.coords.r - 1 },
          { q: country.coords.q - 1, r: country.coords.r + 1 },
        ];
        for (const n of neighbors) {
          if (playerCountryCoords.has(`${n.q},${n.r}`)) {
            threatenedBorders++;
            break;
          }
        }
      }
    }

    const playerShare = playerTerritories / totalTerritories;

    // Determine music track based on game state
    let track: MusicTrack = 'game';

    if (playerTerritories === 0) {
      // Player eliminated
      track = 'danger';
    } else if (playerShare > 0.6) {
      // Dominating
      track = 'victory';
    } else if (playerShare < 0.15 || playerUnits < 5) {
      // In danger
      track = 'danger';
    } else if (activeBattles > 3 || threatenedBorders > 2) {
      // Active combat
      track = 'battle';
    }

    this.play(track);
  }

  init(): void {
    if (this.disposeAutorun) return; // Already initialized

    // Use autorun to react to observable changes
    this.disposeAutorun = autorun((reader) => {
      // Read observables to track them
      gameStore.gameState.read(reader);
      gameStore.local.read(reader);
      // Update music based on state
      this.updateMusicBasedOnState();
    });
  }

  dispose(): void {
    if (this.disposeAutorun) {
      this.disposeAutorun.dispose();
      this.disposeAutorun = null;
    }
    this.stop();
  }
}

const musicManager = new MusicManager();

// Export function to initialize the music system
export function initMusicSystem(): void {
  musicManager.init();
}

// Export function to set music volume from outside
export function setMusicVolume(volume: number): void {
  musicManager.setVolume(volume);
}

// Export function to get current music volume
export function getMusicVolume(): number {
  return musicManager.getVolume();
}

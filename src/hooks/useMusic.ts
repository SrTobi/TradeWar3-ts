import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
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
}

const musicManager = new MusicManager();

// Export function to set music volume from outside the hook
export function setMusicVolume(volume: number): void {
  musicManager.setVolume(volume);
}

// Export function to get current music volume
export function getMusicVolume(): number {
  return musicManager.getVolume();
}

export function useMusic() {
  const gameState = useGameStore((s) => s.gameState);
  const localFactionId = useGameStore((s) => s.local.factionId);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!gameState || !localFactionId) {
      musicManager.play('menu');
      return;
    }

    if (gameState.phase === 'lobby') {
      musicManager.play('menu');
      return;
    }

    if (gameState.phase === 'ended') {
      const isWinner = gameState.winner?.id === localFactionId;
      musicManager.play(isWinner ? 'victory' : 'danger');
      return;
    }

    // Game is playing - update music based on game state periodically
    const now = Date.now();
    if (now - lastUpdateRef.current < MUSIC_UPDATE_INTERVAL) {
      return;
    }
    lastUpdateRef.current = now;

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

    musicManager.play(track);
  }, [gameState, localFactionId]);

  return musicManager;
}

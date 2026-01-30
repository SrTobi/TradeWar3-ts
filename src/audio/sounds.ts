// Sound effects using pre-generated MP3 files with preloading

const BASE_PATH = import.meta.env.BASE_URL;

const SOUNDS = {
  click: `${BASE_PATH}sfx/click.mp3`,
  buy: `${BASE_PATH}sfx/buy.mp3`,
  sell: `${BASE_PATH}sfx/sell.mp3`,
  place: `${BASE_PATH}sfx/place.mp3`,
  battle: `${BASE_PATH}sfx/battle.mp3`,
  upgrade: `${BASE_PATH}sfx/upgrade.mp3`,
  victory: `${BASE_PATH}sfx/victory.mp3`,
  defeat: `${BASE_PATH}sfx/defeat.mp3`,
  gamestart: `${BASE_PATH}sfx/gamestart.mp3`,
  error: `${BASE_PATH}sfx/error.mp3`,
} as const;

type SoundName = keyof typeof SOUNDS;

// Preloaded audio elements
const preloadedAudio = new Map<SoundName, HTMLAudioElement>();

// Global sound volume multiplier (0.0 - 1.0)
let globalSoundVolume = 0.5;

// Set global sound volume
export function setSoundVolume(volume: number): void {
  globalSoundVolume = Math.max(0, Math.min(1, volume));
}

// Get current sound volume
export function getSoundVolume(): number {
  return globalSoundVolume;
}

// Preload all sounds immediately
for (const [name, path] of Object.entries(SOUNDS)) {
  const audio = new Audio(path);
  audio.preload = 'auto';
  audio.load(); // Force load
  preloadedAudio.set(name as SoundName, audio);
}

// Play a sound by cloning the preloaded audio (instant playback)
function playSound(name: SoundName, baseVolume: number = 0.5): void {
  const source = preloadedAudio.get(name);
  if (!source) return;

  try {
    // Clone the preloaded audio for overlapping sounds
    const audio = source.cloneNode(true) as HTMLAudioElement;
    // Apply global volume multiplier to base volume
    audio.volume = baseVolume * globalSoundVolume;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Ignore errors
  }
}

// Resume audio context on user interaction
export function resumeAudio(): void {
  // Trigger a silent play to unlock audio on mobile
  const audio = preloadedAudio.get('click');
  if (audio) {
    const clone = audio.cloneNode(true) as HTMLAudioElement;
    clone.volume = 0;
    clone.play().catch(() => {});
  }
}

// Sound effect functions
export function playClick(): void {
  playSound('click', 0.4);
}

export function playHover(): void {
  playSound('click', 0.2);
}

export function playBuy(): void {
  playSound('buy', 0.5);
}

export function playSell(): void {
  playSound('sell', 0.5);
}

export function playPlaceUnit(): void {
  playSound('place', 0.6);
}

export function playBattle(): void {
  playSound('battle', 0.5);
}

export function playUpgrade(): void {
  playSound('upgrade', 0.5);
}

export function playVictory(): void {
  playSound('victory', 0.6);
}

export function playDefeat(): void {
  playSound('defeat', 0.5);
}

export function playError(): void {
  playSound('error', 0.4);
}

export function playGameStart(): void {
  playSound('gamestart', 0.5);
}

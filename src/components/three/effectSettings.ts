// Shared visual effect constants for consistent experience across screens

export const EFFECT_SETTINGS = {
  bloom: {
    intensity: 0.9,
    luminanceThreshold: 0.55,
    luminanceSmoothing: 0.9,
  },
  vignette: {
    offset: 0.12,
    darkness: 0.45,
  },
} as const;

import { useEffect, useState, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { setMusicVolume } from '@/hooks/useMusic';
import { setSoundVolume, playClick } from '@/audio/sounds';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const panelStyle: React.CSSProperties = {
  background: 'rgba(15, 20, 30, 0.95)',
  border: '2px solid rgba(77, 102, 128, 0.6)',
  borderRadius: '12px',
  padding: '24px 32px',
  minWidth: '320px',
  maxWidth: '400px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#88bbee',
  marginBottom: '24px',
  textAlign: 'center',
  textShadow: '0 0 10px rgba(136, 187, 238, 0.4)',
  letterSpacing: '2px',
};

const sliderContainerStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
  color: '#aabbcc',
  fontSize: '14px',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  appearance: 'none',
  background: 'rgba(60, 80, 100, 0.6)',
  borderRadius: '3px',
  outline: 'none',
  cursor: 'pointer',
};

const closeButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 20px',
  marginTop: '16px',
  fontSize: '14px',
  fontWeight: 'bold',
  background: 'linear-gradient(180deg, rgba(51, 64, 89, 1) 0%, rgba(35, 45, 65, 1) 100%)',
  border: '2px solid rgba(85, 119, 153, 0.6)',
  borderRadius: '8px',
  color: '#fff',
  cursor: 'pointer',
  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  letterSpacing: '1px',
};

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const volumeSettings = useUIStore((s) => s.volumeSettings);
  const setMusicVolumeStore = useUIStore((s) => s.setMusicVolume);
  const setSoundVolumeStore = useUIStore((s) => s.setSoundVolume);

  // Local state for smooth slider interaction
  const [musicVol, setMusicVol] = useState(volumeSettings.musicVolume);
  const [soundVol, setSoundVol] = useState(volumeSettings.soundVolume);

  // Sync local state if volumeSettings changes externally
  useEffect(() => {
    setMusicVol(volumeSettings.musicVolume);
    setSoundVol(volumeSettings.soundVolume);
  }, [volumeSettings.musicVolume, volumeSettings.soundVolume]);

  const handleClose = useCallback(() => {
    playClick();
    onClose();
  }, [onClose]);

  // Handle Escape key to close the panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setMusicVol(value);
    setMusicVolume(value);
    setMusicVolumeStore(value);
  };

  const handleSoundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSoundVol(value);
    setSoundVolume(value);
    setSoundVolumeStore(value);
  };

  const handleSoundMouseUp = () => {
    // Play a click sound when releasing the slider so user can hear the volume
    playClick();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={panelStyle} role="dialog" aria-labelledby="settings-title">
        <h2 id="settings-title" style={titleStyle}>⚙ SETTINGS</h2>

        <div style={sliderContainerStyle}>
          <div style={labelStyle}>
            <span id="music-label">🎵 Music Volume</span>
            <span>{Math.round(musicVol * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={musicVol}
            onChange={handleMusicChange}
            style={sliderStyle}
            aria-labelledby="music-label"
            aria-valuenow={Math.round(musicVol * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <div style={sliderContainerStyle}>
          <div style={labelStyle}>
            <span id="sound-label">🔊 Sound Effects</span>
            <span>{Math.round(soundVol * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={soundVol}
            onChange={handleSoundChange}
            onMouseUp={handleSoundMouseUp}
            onTouchEnd={handleSoundMouseUp}
            style={sliderStyle}
            aria-labelledby="sound-label"
            aria-valuenow={Math.round(soundVol * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <button style={closeButtonStyle} onClick={handleClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}

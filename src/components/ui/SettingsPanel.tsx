import { observableValue } from '@vscode/observables';
import { ViewModel, viewWithModel, prop } from '@vscode/observables-react';
import { uiStore } from '@/store/uiStore';
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

class SettingsPanelModel extends ViewModel({ onClose: prop.const<() => void>() }) {
  private readonly initialVolumeSettings = uiStore.volumeSettings.get();

  public readonly musicVol = observableValue(this, this.initialVolumeSettings.musicVolume);
  public readonly soundVol = observableValue(this, this.initialVolumeSettings.soundVolume);

  constructor(props: { onClose: () => void }) {
    super(props);

    // Set up keyboard listener for Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    this._store.add({ dispose: () => window.removeEventListener('keydown', handleKeyDown) });
  }

  handleClose = () => {
    playClick();
    this.props.onClose();
  };

  handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    this.musicVol.set(value, undefined);
    setMusicVolume(value);
    uiStore.setMusicVolume(value);
  };

  handleSoundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    this.soundVol.set(value, undefined);
    setSoundVolume(value);
    uiStore.setSoundVolume(value);
  };

  handleSoundMouseUp = () => {
    playClick();
  };

  handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      this.handleClose();
    }
  };
}

export const SettingsPanel = viewWithModel(SettingsPanelModel, (reader, model) => {
  const musicVol = model.musicVol.read(reader);
  const soundVol = model.soundVol.read(reader);

  return (
    <div style={overlayStyle} onClick={model.handleOverlayClick}>
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
            onChange={model.handleMusicChange}
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
            onChange={model.handleSoundChange}
            onMouseUp={model.handleSoundMouseUp}
            onTouchEnd={model.handleSoundMouseUp}
            style={sliderStyle}
            aria-labelledby="sound-label"
            aria-valuenow={Math.round(soundVol * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <button style={closeButtonStyle} onClick={model.handleClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
});

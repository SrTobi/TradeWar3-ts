import { observableValue } from '@vscode/observables';
import { ViewModel, viewWithModel } from '@vscode/observables-react';
import { playClick } from '@/audio/sounds';
import { SettingsPanel } from './SettingsPanel';

const buttonStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  right: '20px',
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  background: 'rgba(30, 40, 55, 0.9)',
  border: '2px solid rgba(77, 102, 128, 0.6)',
  color: '#88bbee',
  fontSize: '22px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s',
  zIndex: 100,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
};

const buttonHoverStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(50, 65, 85, 0.95)',
  borderColor: 'rgba(100, 140, 180, 0.8)',
  transform: 'scale(1.05)',
};

class SettingsButtonModel extends ViewModel() {
  public readonly isOpen = observableValue(this, false);
  public readonly isHovered = observableValue(this, false);

  handleClick = () => {
    playClick();
    this.isOpen.set(true, undefined);
  };

  handleClose = () => {
    this.isOpen.set(false, undefined);
  };

  setHovered = (hovered: boolean) => {
    this.isHovered.set(hovered, undefined);
  };
}

export const SettingsButton = viewWithModel(SettingsButtonModel, (reader, model) => {
  const isOpen = model.isOpen.read(reader);
  const isHovered = model.isHovered.read(reader);

  return (
    <>
      <button
        style={isHovered ? buttonHoverStyle : buttonStyle}
        onClick={model.handleClick}
        onMouseEnter={() => model.setHovered(true)}
        onMouseLeave={() => model.setHovered(false)}
        title="Settings"
        aria-label="Open settings"
      >
        ⚙
      </button>
      {isOpen && <SettingsPanel onClose={model.handleClose} />}
    </>
  );
});

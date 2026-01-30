import { useState } from 'react';
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

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    playClick();
    setIsOpen(true);
  };

  return (
    <>
      <button
        style={isHovered ? buttonHoverStyle : buttonStyle}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Settings"
        aria-label="Open settings"
      >
        ⚙
      </button>
      {isOpen && <SettingsPanel onClose={() => setIsOpen(false)} />}
    </>
  );
}

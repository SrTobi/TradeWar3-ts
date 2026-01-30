import { useEffect, useRef } from 'react';
import { useUIStore } from '@/store/uiStore';
import { MainMenu } from '@/components/screens/MainMenu';
import { Lobby } from '@/components/screens/Lobby';
import { Game } from '@/components/screens/Game';
import { useMusic, setMusicVolume } from '@/hooks/useMusic';
import { setSoundVolume } from '@/audio/sounds';
import { SettingsButton } from '@/components/ui/SettingsButton';

export function App() {
  const screen = useUIStore((s) => s.screen);
  const volumeSettings = useUIStore((s) => s.volumeSettings);
  const initializedRef = useRef(false);

  // Initialize music system
  useMusic();

  // Initialize volume settings from store on mount only
  useEffect(() => {
    if (!initializedRef.current) {
      setMusicVolume(volumeSettings.musicVolume);
      setSoundVolume(volumeSettings.soundVolume);
      initializedRef.current = true;
    }
  }, [volumeSettings.musicVolume, volumeSettings.soundVolume]);

  const renderScreen = () => {
    switch (screen) {
      case 'menu':
        return <MainMenu />;
      case 'lobby':
        return <Lobby />;
      case 'game':
        return <Game />;
    }
  };

  return (
    <>
      {renderScreen()}
      <SettingsButton />
    </>
  );
}

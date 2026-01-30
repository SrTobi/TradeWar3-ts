import { ViewModel, viewWithModel } from '@vscode/observables-react';
import { uiStore } from '@/store/uiStore';
import { MainMenu } from '@/components/screens/MainMenu';
import { Lobby } from '@/components/screens/Lobby';
import { Game } from '@/components/screens/Game';
import { setMusicVolume, initMusicSystem } from '@/hooks/useMusic';
import { setSoundVolume } from '@/audio/sounds';
import { SettingsButton } from '@/components/ui/SettingsButton';

class AppModel extends ViewModel() {
  constructor() {
    super({});

    // Initialize music system
    initMusicSystem();

    // Initialize volume settings from store
    const volumeSettings = uiStore.volumeSettings.get();
    setMusicVolume(volumeSettings.musicVolume);
    setSoundVolume(volumeSettings.soundVolume);
  }
}

export const App = viewWithModel(AppModel, (reader) => {
  const screen = uiStore.screen.read(reader);

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
});

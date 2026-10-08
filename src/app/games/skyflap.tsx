import { useTranslation } from 'react-i18next';
import { Screen, TopBar } from '../../components/ui/primitives';
import { SkyFlapGame } from '../../games/skyflap/SkyFlapGame';

export default function SkyFlapScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title="Sky Flap" subtitle={t('JUEGOS')} back />
      <SkyFlapGame />
    </Screen>
  );
}

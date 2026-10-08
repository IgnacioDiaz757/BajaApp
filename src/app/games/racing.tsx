import { useTranslation } from 'react-i18next';
import { Screen, TopBar } from '../../components/ui/primitives';
import { RacingGame } from '../../games/racing/RacingGame';

export default function RacingScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title={t('Carrera')} subtitle={t('JUEGOS')} back />
      <RacingGame />
    </Screen>
  );
}

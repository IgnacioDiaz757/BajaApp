import { useTranslation } from 'react-i18next';
import { Screen, TopBar } from '../../components/ui/primitives';
import { NightChaseGame } from '../../games/nightchase/NightChaseGame';

export default function NightChaseScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title="Night Chase" subtitle={t('JUEGOS')} back />
      <NightChaseGame />
    </Screen>
  );
}

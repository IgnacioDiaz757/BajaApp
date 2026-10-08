import { useTranslation } from 'react-i18next';
import { Screen, TopBar } from '../../components/ui/primitives';
import { DreamCatGame } from '../../games/dreamcat/DreamCatGame';

export default function DreamCatScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title={t('Gato Soñador')} subtitle={t('JUEGOS')} back />
      <DreamCatGame />
    </Screen>
  );
}

import { useTranslation } from 'react-i18next';
import { Screen, TopBar } from '../../components/ui/primitives';
import { SnakeGame } from '../../games/snake/SnakeGame';

export default function SnakeScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title="Snake" subtitle={t('JUEGOS')} back />
      <SnakeGame />
    </Screen>
  );
}

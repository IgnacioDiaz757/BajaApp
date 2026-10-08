import { useTranslation } from 'react-i18next';
import { Screen, TopBar } from '../../components/ui/primitives';
import { BlockRunnerGame } from '../../games/blockrunner/BlockRunnerGame';

export default function BlockRunnerScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <TopBar title="Block Runner" subtitle={t('JUEGOS')} back />
      <BlockRunnerGame />
    </Screen>
  );
}

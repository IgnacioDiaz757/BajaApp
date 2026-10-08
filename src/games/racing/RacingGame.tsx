import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GameView } from '../GameView';
import { racingHtmlTemplate } from './html';

const BEST_KEY = 'baja-racing-best';

type GameMessage = { type: 'ready' } | { type: 'crash' } | { type: 'finish'; seconds: number; rank: number };

/** Carrera de autitos vertical. */
export function RacingGame() {
  const { t } = useTranslation();
  const [best, setBest] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY)
      .then((value) => setBest(value ? Number(value) : null))
      .catch(() => setBest(null));
  }, []);

  const html = useMemo(() => {
    if (best === undefined) return null;
    const config = {
      lap: t('Vuelta'),
      pos: t('Puesto'),
      time: t('Tiempo'),
      best: t('Mejor tiempo'),
      title: t('Carrera'),
      tapStart: t('Tocá para empezar'),
      howTo: t('Tocá izquierda o derecha para girar'),
      finished: t('¡Carrera terminada!'),
      record: t('¡Nuevo récord!'),
      again: t('Tocá para jugar de nuevo'),
    };
    const script = `window.STRINGS=${JSON.stringify(config)};window.BEST=${best === null ? 'null' : best};`.replace(/</g, '\\u003c');
    return racingHtmlTemplate.replace('/*__CONFIG__*/', script);
  }, [best, t]);

  const handleMessage = (message: GameMessage) => {
    if (message.type === 'crash') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } else if (message.type === 'finish') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      if (message.rank === 1) {
        const current = typeof best === 'number' ? best : null;
        if (current === null || message.seconds < current) {
          setBest(message.seconds);
          void AsyncStorage.setItem(BEST_KEY, String(message.seconds)).catch(() => undefined);
        }
      }
    }
  };

  if (!html) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return <GameView html={html} title="Racing" onMessage={handleMessage} />;
}

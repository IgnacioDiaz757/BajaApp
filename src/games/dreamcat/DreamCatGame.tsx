import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GameView } from '../GameView';
import { dreamcatHtmlTemplate } from './html';

const BEST_KEY = 'baja-dreamcat-best';

type GameMessage = { type: 'level'; level: number } | { type: 'finish'; seconds: number };

// Textos que usa el juego (la clave es el texto en español; t() lo traduce).
const STRING_KEYS = [
  'Gato Soñador',
  'Aventura entre sueños',
  'Guiá al gatito hasta las uvas moradas de cada nivel',
  'Mejor tiempo',
  'Tocá para empezar',
  'Nivel',
  'Pausa',
  'Continuar',
  'Juego nuevo',
  '¡El gatito volvió a casa!',
  'Tiempo',
  '¡Nuevo récord!',
  'Tocá para jugar de nuevo',
] as const;

/** Gato Soñador: plataformas (port de un proyecto de microStudio). */
export function DreamCatGame() {
  const { t } = useTranslation();
  // Récord inicial: undefined mientras carga. Se lee una vez; el juego lleva el suyo mientras corre,
  // así guardar uno nuevo no regenera el HTML (reiniciaría la partida).
  const [initialBest, setInitialBest] = useState<number | null | undefined>(undefined);
  const best = useRef<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY)
      .then((value) => (value ? Number(value) : null))
      .catch(() => null)
      .then((value) => {
        best.current = value;
        setInitialBest(value);
      });
  }, []);

  const html = useMemo(() => {
    if (initialBest === undefined) return null;
    const strings = Object.fromEntries(STRING_KEYS.map((key) => [key, t(key)]));
    const script = `window.STRINGS=${JSON.stringify(strings)};window.BEST=${initialBest === null ? 'null' : initialBest};`.replace(/</g, '\\u003c');
    return dreamcatHtmlTemplate.replace('/*__CONFIG__*/', script);
  }, [initialBest, t]);

  const handleMessage = (message: GameMessage) => {
    if (message.type === 'level') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    } else if (message.type === 'finish') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      if (best.current === null || message.seconds < best.current) {
        best.current = message.seconds;
        void AsyncStorage.setItem(BEST_KEY, String(message.seconds)).catch(() => undefined);
      }
    }
  };

  if (!html) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return <GameView html={html} title="Gato Soñador" onMessage={handleMessage} />;
}

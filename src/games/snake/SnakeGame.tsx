import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GameView } from '../GameView';
import { snakeHtmlTemplate } from './html';

const BEST_KEY = 'baja-snake-best';

type GameMessage = { type: 'eat'; score: number } | { type: 'gameover'; score: number; won: boolean };

// Textos que usa el juego (la clave es el texto en español; t() lo traduce).
const STRING_KEYS = [
  'Puntos',
  'Récord',
  'Puntaje',
  '¿Preparado?',
  'Comé manzanas para crecer. No choques con las paredes ni con vos misma.',
  'Empezar',
  'Deslizá el dedo para moverte',
  'Pausa',
  'Tocá para continuar',
  'Continuar',
  'FIN DEL JUEGO',
  '¡Ganaste!',
  '¡Nuevo récord!',
  'Jugar de nuevo',
] as const;

/** Snake: se desliza el dedo para girar a la serpiente. */
export function SnakeGame() {
  const { t } = useTranslation();
  // Récord inicial: undefined mientras carga. Se lee una vez; el juego lleva el suyo mientras corre,
  // así guardar uno nuevo no regenera el HTML (reiniciaría la partida).
  const [initialBest, setInitialBest] = useState<number | null | undefined>(undefined);
  const best = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(BEST_KEY)
      .then((value) => (value ? Number(value) : null))
      .catch(() => null)
      .then((value) => {
        best.current = value ?? 0;
        setInitialBest(value);
      });
  }, []);

  const html = useMemo(() => {
    if (initialBest === undefined) return null;
    const strings = Object.fromEntries(STRING_KEYS.map((key) => [key, t(key)]));
    const script = `window.STRINGS=${JSON.stringify(strings)};window.BEST=${initialBest ?? 0};`.replace(/</g, '\\u003c');
    return snakeHtmlTemplate.replace('/*__CONFIG__*/', () => script);
  }, [initialBest, t]);

  const handleMessage = (message: GameMessage) => {
    if (message.type === 'eat') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } else if (message.type === 'gameover') {
      void Haptics.notificationAsync(message.won ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      if (message.score > best.current) {
        best.current = message.score;
        void AsyncStorage.setItem(BEST_KEY, String(message.score)).catch(() => undefined);
      }
    }
  };

  if (!html) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return <GameView html={html} title="Snake" onMessage={handleMessage} />;
}

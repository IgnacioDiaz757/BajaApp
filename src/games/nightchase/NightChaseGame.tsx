import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GameView } from '../GameView';
import { nightchaseHtmlTemplate } from './html';

const BEST_KEY = 'baja-nightchase-best';

type GameMessage = { type: 'hit' } | { type: 'gameover'; score: number; seconds: number };

// Textos que usa el juego (la clave es el texto en español; t() lo traduce).
const STRING_KEYS = [
  'DISTANCIA',
  'SISTEMA',
  'TIEMPO',
  'DISPARAR',
  'PAUSA',
  'FALLA CRÍTICA',
  'CASCO DESTRUIDO',
  'REINICIAR',
  'IMPACTO DETECTADO',
  'EN LÍNEA',
  'MODO DIOS',
  'MODO CAOS',
  'PERSECUCIÓN NOCTURNA',
  'Tocá para empezar',
  'Continuar',
  'Mejor puntaje',
  'Puntaje',
  '¡Nuevo récord!',
] as const;

/** Night Chase: persecución 3D nocturna (three.js incluido en el HTML, funciona sin internet). */
export function NightChaseGame() {
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
    return nightchaseHtmlTemplate.replace('/*__CONFIG__*/', () => script);
  }, [initialBest, t]);

  const handleMessage = (message: GameMessage) => {
    if (message.type === 'hit') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    } else if (message.type === 'gameover') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      if (message.score > best.current) {
        best.current = message.score;
        void AsyncStorage.setItem(BEST_KEY, String(message.score)).catch(() => undefined);
      }
    }
  };

  if (!html) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return <GameView html={html} title="Night Chase" onMessage={handleMessage} />;
}

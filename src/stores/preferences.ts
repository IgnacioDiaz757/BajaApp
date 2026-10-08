import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import i18n, { deviceLanguage, type AppLanguage } from '../i18n';

export type { AppLanguage };

export const PREFERENCES_KEY = 'baja-preferences';

type PreferencesState = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      language: deviceLanguage(),
      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
    }),
    {
      name: PREFERENCES_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state) void i18n.changeLanguage(state.language);
      },
    },
  ),
);

/** Lee el idioma guardado sin depender de React (la usa la tarea en segundo plano). */
export async function applyStoredLanguage() {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    const stored = raw ? (JSON.parse(raw) as { state?: { language?: AppLanguage } }).state?.language : undefined;
    if (stored) await i18n.changeLanguage(stored);
  } catch {
    // se mantiene el idioma actual
  }
}

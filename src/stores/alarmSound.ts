import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Canción elegida por el usuario. Se guarda solo el nombre del archivo copiado a la app. */
export type CustomAlarmSound = { fileName: string; displayName: string };

type AlarmSoundState = {
  custom: CustomAlarmSound | null;
  setCustom: (sound: CustomAlarmSound | null) => void;
};

export const useAlarmSound = create<AlarmSoundState>()(
  persist(
    (set) => ({
      custom: null,
      setCustom: (custom) => set({ custom }),
    }),
    { name: 'baja-alarm-sound', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

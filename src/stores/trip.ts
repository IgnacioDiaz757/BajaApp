import { create } from 'zustand';

export type SelectedBusLine = { id: string; number: string; direction: string };

type TripState = {
  /** Viaje en curso guardado en Supabase (null si no se pudo guardar). */
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  /** Línea elegida en "Línea de colectivo" para el próximo viaje. */
  busLine: SelectedBusLine | null;
  setBusLine: (line: SelectedBusLine | null) => void;
};

export const useTripStore = create<TripState>((set) => ({
  activeTripId: null,
  setActiveTripId: (activeTripId) => set({ activeTripId }),
  busLine: null,
  setBusLine: (busLine) => set({ busLine }),
}));

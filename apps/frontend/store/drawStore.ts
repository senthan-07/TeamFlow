// store/drawStore.ts
import {create} from 'zustand';

interface Point {
  x: number;
  y: number;
}

interface DrawState {
  strokes: Point[][];
  currentStroke: Point[];
  addPoint: (point: Point) => void;
  startStroke: () => void;
  endStroke: () => void;
  setStrokes: (strokes: Point[][]) => void;
  addRemoteStroke:(strokes: Point[]) => void;
  clear: () => void;
}

export const useDrawStore = create<DrawState>((set) => ({
  strokes: [],
  currentStroke: [],
  addPoint: (point) =>
    set((state) => ({
      currentStroke: [...state.currentStroke, point],
    })),
  startStroke: () =>
    set(() => ({
      currentStroke: [],
    })),
  endStroke: () =>
    set((state) => ({
      strokes: [...state.strokes, state.currentStroke],
      currentStroke: [],
    })),
  addRemoteStroke: (stroke: Point[]) =>
    set((state) => ({
      strokes: [...state.strokes, stroke],
    })),
  setStrokes: (strokes) => set({ strokes }),
  clear: () => set({ strokes: [], currentStroke: [] }),
}));

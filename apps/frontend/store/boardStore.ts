import { create } from "zustand";

interface Board {
  id: string;
  title: string;
  owner: {
    id: string;
    name: string | null;
  };
}

interface BoardStore {
  boards: Board[];
  currentBoard?: Board;
  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board?: Board) => void;
  addBoard: (board: Board) => void;
  removeBoard: (boardTitle: string) => void;
}

export const useBoardStore = create<BoardStore>((set) => ({
  boards: [],
  currentBoard: undefined,
  setBoards: (boards) => set({ boards }),
  setCurrentBoard: (board) => set({ currentBoard: board }),
  addBoard: (board) => set((state) => ({ boards: [...state.boards, board] })),
  removeBoard: (title) =>
    set((state) => ({
      boards: state.boards.filter((b) => b.title !== title),
    })),
}));

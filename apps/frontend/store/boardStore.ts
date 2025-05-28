import { create } from "zustand";
import { Chat , Drawing , RTCSessions, User} from "../types/type";

interface Board {
  id: string;
  title: string;
  owner: User;
  users?: User[];
  chats?: Chat[];
  drawings?: Drawing[];
  files?: File[];
  rtcSessions?: RTCSessions[];
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
  removeBoard: (id) =>
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
    })),
}));

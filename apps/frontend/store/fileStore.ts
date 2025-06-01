import { create } from 'zustand';
import { File } from '../types/type';

interface FileState {
  files: File[];
  setFiles: (files: File[]) => void;
  addFile: (file: File) => void;
  removeFile: (id: string) => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  setFiles: (files) => set({ files }),
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
  removeFile: (id) => set((state) => ({ files: state.files.filter((f) => f.id !== id) })),
}));
 
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Chat {
  id: string;
  boardid:string,
  message: string;
  user: User;
  createdAt: string;
}

export interface Drawing {
  id: string;
  data: string; 
  boardId : string;
  createdAt: string;
  updatedAt: string;
}

export interface File {
  size: number;
  id: string;
  boardId:string;
  filename: string;
  url: string;
  uploadedBy: User;
  createdAt: string;
}

export interface RTCSessions {
  id: string;
  boardId:string;
  startedAt: string;
  endedAt:string;
}



export interface PathPoint {
  x: number;
  y: number;
  color: string;
  size: number;
}

export interface Cursor {
  userId: string;
  position: { x: number; y: number };
}

export interface DrawState {
  paths: PathPoint[][];
  cursors: Cursor[];
  addPath: (path: PathPoint[]) => void;
  updateCursor: (cursor: Cursor) => void;
  setPaths: (paths: PathPoint[][]) => void;
  clear: () => void;
}

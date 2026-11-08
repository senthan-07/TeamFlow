/** Shapes returned by the TeamFlow API. */

export interface User {
  id: string;
  name: string | null;
  email: string;
}

/** GET /board/all */
export interface BoardSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  isOwner: boolean;
  owner: User;
  users: User[];
  _count: { chats: number; files: number };
}

/** POST /board/new */
export interface CreatedBoard extends BoardSummary {
  notFoundEmails: string[];
}

/** GET /board/:id */
export interface BoardDetail {
  id: string;
  title: string;
  ownerId: string;
  isOwner: boolean;
  owner: User;
  users: User[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  boardId: string;
  userId: string;
  message: string;
  createdAt: string;
  user: User;
}

export interface BoardFile {
  id: string;
  boardId: string;
  userId: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  createdAt: string;
  user: User;
}

export type Tool = "pen" | "highlighter" | "eraser";

/** A stroke in world coordinates; `points` is flat [x0, y0, x1, y1, …]. */
export interface Stroke {
  id: string;
  userId: string;
  tool: Tool;
  color: string;
  size: number;
  points: number[];
}

export interface PresenceUser {
  userId: string;
  name: string;
}

export interface CallParticipant extends PresenceUser {
  socketId: string;
  audio: boolean;
  video: boolean;
}

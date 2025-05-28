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

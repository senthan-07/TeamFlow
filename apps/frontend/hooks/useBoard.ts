//Dashboard used for listing creating and deleting (if owner) 
"use client"
import { useState, useEffect } from "react";
import api from "../lib/axios"; 
import { useBoardStore } from "../store/boardStore";

export function useBoards() {
  const { boards, setBoards, addBoard, removeBoard } = useBoardStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await api.get("/board/all");
      setBoards(res.data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to fetch boards");
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (title: string,userEmails:string[] = []) => {
    try {
      const res = await api.post("/board/new", { title , userEmails });
      addBoard(res.data);
      return res.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.message || "Failed to create board");
    }
  };

  const deleteBoard = async (title: string) => {
    try {
      await api.delete(`/board/${title}`);
      removeBoard(title);
    } catch (e: any) {
      throw new Error(e.response?.data?.message || "Failed to delete board");
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  return { boards, loading, error, createBoard, deleteBoard, fetchBoards };
}

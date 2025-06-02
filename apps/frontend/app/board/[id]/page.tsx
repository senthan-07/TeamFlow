/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '../../../lib/axios';
import { useBoardStore } from '../../../store/boardStore';
import ChatSection from '../../../components/ChatPannel/Chat';
import DrawBoard from '../../../components/draw/DrawBoard';
import FileSection from '../../../components/files/File';
import RTC from '../../../components/meeting/RTC';

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { currentBoard, setCurrentBoard } = useBoardStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await api.get(`/board/${id}`);
        setCurrentBoard(res.data);
        setError(null);
      } catch (e: any) {
        setError(e.response?.data?.message || e.message || 'Failed to fetch board');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchBoard();
  }, [id, setCurrentBoard]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!currentBoard) return <div className="p-4">Board not found</div>;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{currentBoard.title}</h1>
        <p className="text-gray-600">Owner: {currentBoard.owner.name}</p>
        <h2 className="font-semibold mt-4">Shared Users:</h2>
        <ul className="list-disc list-inside">
          {currentBoard.users?.map(user => (
            <li key={user.id}>{user.name} ({user.email})</li>
          ))}
        </ul>
      </div>

      {/* Collaboration Features */}
      <ChatSection boardId={currentBoard.id} />
      <DrawBoard boardId={currentBoard.id}/>
      <FileSection boardId={currentBoard.id} />
      <RTC boardId={currentBoard.id} />
    </div>
  );
}

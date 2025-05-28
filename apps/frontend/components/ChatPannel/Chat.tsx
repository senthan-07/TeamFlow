'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/authStore';
import { Chat } from '../../types/type';

interface Props {
  boardId: string;
}

export default function ChatSection({ boardId }: Props) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Chat[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Debug loading of props
  console.log('🟡 ChatSection mounted with:', { user, boardId });

  useEffect(() => {
    if (!user || !boardId) {
      console.warn('⚠️ Skipping socket setup — missing user or boardId');
      return;
    }

    console.log('✅ Setting up socket connection...');
    const socket = io(process.env.NEXT_PUBLIC_API_URL as string, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });
    console.log(process.env.NEXT_PUBLIC_API_URL)
    console.log(socket)

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      socket.emit('joinBoard', boardId);
    });

    socket.on('initialMessages', (msgs: Chat[]) => {
      console.log('📩 Received initial messages:', msgs);
      setMessages(msgs);
    });

    socket.on('chatMessage', (msg: Chat) => {
      console.log('📨 New chat message:', msg);
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    return () => {
      console.log('🔚 Cleaning up socket...');
      socket.emit('leaveBoard', boardId);
      socket.disconnect();
    };
  }, [user, boardId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    console.log('📤 Attempting to send message:', input);

    if (!input.trim()) return;
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn('🚫 Cannot send message — socket not connected.');
      return;
    }

    socketRef.current.emit('chatMessage', {
      boardId,
      message: input,
    });

    setInput('');
  };

  // Show loading until user and boardId are ready
  if (!user || !boardId) {
    return <div className="p-4 text-gray-500">🔄 Loading chat...</div>;
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Chat</h2>
      <div className="max-h-64 overflow-y-auto space-y-2 mb-3 border p-2 rounded">
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold">{msg.user.name}:</span> {msg.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            console.log('⌨️ Input changed:', e.target.value);
          }}
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}

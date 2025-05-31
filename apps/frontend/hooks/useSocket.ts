'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

interface UseSocketProps<T> {
  namespace: string;  // e.g. 'chat', 'draw', 'rtc'
  boardId: string;
  onConnect?: (socket: Socket) => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onCustomEvent?: (event: string, handler: (data: T) => void) => void;
}

export function useSocket<T>({ namespace, boardId, onConnect, onDisconnect, onError, onCustomEvent }: UseSocketProps<T>) {
  const token = useAuthStore.getState().token;
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !boardId) return;

    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    const socket = io(`${baseUrl}/${namespace}`, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log(`Socket connected on namespace /${namespace}:`, socket.id);
      socket.emit('joinBoard', boardId);
      onConnect && onConnect(socket);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log(`Socket disconnected from namespace /${namespace}`);
      onDisconnect && onDisconnect();
    });

    socket.on('error', (error) => {
      console.error(`Socket error on namespace /${namespace}:`, error);
      onError && onError(error);
    });

    if (onCustomEvent) {
      // Example for listening to a custom event named 'data'
      // You can adapt this to listen to multiple or dynamic events if needed
      onCustomEvent('data', (data: T) => {
        // handle the data event in parent component
      });
    }

    return () => {
      if (socket.connected) {
        socket.emit('leaveBoard', boardId);
      }
      socket.disconnect();
    };
  }, [boardId, namespace, token]);

  return {
    socket: socketRef.current,
    connected,
  };
}

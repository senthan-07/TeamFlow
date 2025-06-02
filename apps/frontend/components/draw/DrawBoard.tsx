'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDrawStore } from '../../store/drawStore';
import { useSocket } from '../../hooks/useSocket';

interface Props {
  boardId: string;
}

interface Point {
  x: number;
  y: number;
}

export default function DrawComponent({ boardId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const {
    strokes,
    currentStroke,
    addPoint,
    startStroke,
    endStroke,
    setStrokes,
    // clear,
  } = useDrawStore();

  const [remoteCursors, setRemoteCursors] = useState<Record<string, Point>>({});

  const { socket, connected } = useSocket<Point[][]>({
    namespace: 'draw',
    boardId,
    onConnect: (socket) => {
      socket.emit('joinBoard', boardId);

      socket.on('initialDrawing', (strokes: Point[][]) => {
        setStrokes(strokes);
      });

      socket.on('newStroke', (stroke: Point[]) => {
        useDrawStore.getState().addRemoteStroke(stroke);
      });

      socket.on('cursorMove', ({ userId, position }: { userId: string; position: Point }) => {
        setRemoteCursors((prev) => ({ ...prev, [userId]: position }));
      });
    },
  });

  // Handle drawing all strokes and remote cursors
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing strokes
    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }

    // Draw current stroke
    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }

    // Draw remote cursors
    for (const userId in remoteCursors) {
      const { x, y } = remoteCursors[userId];
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = getColorFromUserId(userId);
      ctx.fill();
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#333';
      ctx.fillText(userId.slice(0, 4), x + 8, y - 8);
    }
  }, [strokes, currentStroke, remoteCursors]);

  // Track pointer position
  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!connected) return;

    startStroke();
    const point = getPoint(e);
    addPoint(point);
    socket?.emit('cursorMove', { boardId, position: point });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!connected) return;

    if ('buttons' in e && e.buttons !== 1) return;

    const point = getPoint(e);
    addPoint(point);
    socket?.emit('cursorMove', { boardId, position: point });
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!connected) return;

    const strokeToSend = [...currentStroke];
    endStroke();

    if (socket && strokeToSend.length > 0) {
      socket.emit('newStroke', { boardId, path: strokeToSend });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="border rounded w-full h-96 touch-none"
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    />
  );
}

// Generate consistent color per user
function getColorFromUserId(userId: string): string {
  const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4'];
  const hash = [...userId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

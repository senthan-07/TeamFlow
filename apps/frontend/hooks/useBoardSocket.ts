"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL } from "../lib/config";
import { useAuthStore } from "../store/authStore";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handlers = Record<string, (...args: any[]) => void>;

/**
 * Connects to one namespace (`/chat`, `/draw`, `/board`, `/rtc`) for a board.
 *
 * - Handlers are registered *before* joining, so the initial payload is never missed.
 * - Handlers live in a ref: pass fresh closures every render without reconnecting.
 * - Re-joins the board after every reconnect (network blip, laptop sleep, server deploy).
 * - socket.io multiplexes namespaces with the same origin over one WebSocket.
 */
export function useBoardSocket(namespace: string, boardId: string | undefined, handlers: Handlers, { autoJoin = true } = {}) {
  const token = useAuthStore((s) => s.token);
  const handlersRef = useRef(handlers);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!token || !boardId) return;

    const s = io(`${API_URL}/${namespace}`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 8000,
    });

    for (const event of Object.keys(handlersRef.current)) {
      s.on(event, (...args) => handlersRef.current[event]?.(...args));
    }

    s.on("connect", () => {
      setConnected(true);
      if (autoJoin) s.emit("joinBoard", boardId);
    });
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", (err) => {
      if (err.message === "Invalid token" || err.message === "Unauthorized") {
        s.disconnect();
        useAuthStore.getState().logout({ expired: true });
      }
    });

    setSocket(s);
    return () => {
      if (autoJoin && s.connected) s.emit("leaveBoard", boardId);
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
    // Handler *names* are fixed per call site; their implementations come from the ref.
  }, [namespace, boardId, token, autoJoin]);

  return { socket, connected };
}

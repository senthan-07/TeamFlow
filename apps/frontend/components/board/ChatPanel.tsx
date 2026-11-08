"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/axios";
import { useBoardSocket } from "../../hooks/useBoardSocket";
import { clockTime, cn, displayName, uid } from "../../lib/utils";
import type { ChatMessage, User } from "../../types/type";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";

type Pending = { tempId: string; message: string; failed?: boolean };
const GROUP_MS = 5 * 60 * 1000;

function dayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function ChatPanel({ boardId, me, active, onUnread }: { boardId: string; me: User; active: boolean; onUnread: (n: number) => void }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const restoreFrom = useRef<number | null>(null);
  const unread = useRef(0);
  const lastTypingSent = useRef(0);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((list) => (list && !list.some((m) => m.id === msg.id) ? [...list, msg] : list));
  }, []);

  const { socket, connected } = useBoardSocket("chat", boardId, {
    initialMessages: ({ messages: initial, hasMore: more }: { messages: ChatMessage[]; hasMore: boolean }) => {
      stickToBottom.current = true;
      setMessages(initial);
      setHasMore(more);
    },
    chatMessage: (msg: ChatMessage) => {
      addMessage(msg);
      setTyping(({ [msg.userId]: _done, ...rest }) => rest);
      if (msg.userId !== me.id && !active) onUnread(++unread.current);
    },
    typing: ({ userId, name, isTyping }: { userId: string; name: string; isTyping: boolean }) => {
      setTyping(({ [userId]: _old, ...rest }) => (isTyping ? { ...rest, [userId]: { name, at: Date.now() } } : rest));
    },
    chatCleared: () => {
      setMessages([]);
      setHasMore(false);
    },
  });

  useEffect(() => {
    if (active) {
      unread.current = 0;
      onUnread(0);
    }
  }, [active, onUnread]);

  // Drop typing indicators that weren't refreshed.
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((all) => {
        const fresh = Object.fromEntries(Object.entries(all).filter(([, v]) => Date.now() - v.at < 5000));
        return Object.keys(fresh).length === Object.keys(all).length ? all : fresh;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  // Keep scrolled to the bottom for new messages, and keep position when older ones load.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (restoreFrom.current !== null) {
      el.scrollTop = el.scrollHeight - restoreFrom.current;
      restoreFrom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, pending, typing, active]);

  const loadOlder = async () => {
    if (!messages?.length || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const res = await api.get<{ messages: ChatMessage[]; hasMore: boolean }>(`/chat/${boardId}`, {
        params: { before: messages[0].id, limit: 50 },
      });
      restoreFrom.current = scrollRef.current ? scrollRef.current.scrollHeight - scrollRef.current.scrollTop : null;
      setMessages((list) => [...res.data.messages.filter((m) => !list?.some((x) => x.id === m.id)), ...(list ?? [])]);
      setHasMore(res.data.hasMore);
    } catch {
      toast.error("Couldn't load older messages");
    } finally {
      setLoadingOlder(false);
    }
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 120) void loadOlder();
  };

  const send = (text: string, tempId = uid()) => {
    const message = text.trim();
    if (!message || !socket) return;
    stickToBottom.current = true;
    setPending((p) => [...p.filter((x) => x.tempId !== tempId), { tempId, message }]);
    socket.emit("typing", { boardId, isTyping: false });
    socket.timeout(10000).emit("chatMessage", { boardId, message }, (err: Error | null, res?: { ok: boolean; message?: ChatMessage; error?: string }) => {
      if (!err && res?.ok && res.message) {
        setPending((p) => p.filter((x) => x.tempId !== tempId));
        addMessage(res.message);
      } else {
        setPending((p) => p.map((x) => (x.tempId === tempId ? { ...x, failed: true } : x)));
        if (res?.error) toast.error(res.error);
      }
    });
  };

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    const now = Date.now();
    if (socket && value.trim() && now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      socket.emit("typing", { boardId, isTyping: true });
    }
  };

  // Auto-grow the textarea up to ~6 lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, [draft]);

  const typingNames = Object.values(typing).map((t) => t.name);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-live="polite" aria-relevant="additions">
        {messages === null ? (
          <div className="grid h-full place-items-center text-muted">
            <Spinner />
          </div>
        ) : messages.length === 0 && pending.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <MessageSquareText className="mx-auto h-8 w-8 text-line-strong" aria-hidden />
              <p className="mt-3 font-semibold text-ink">No messages yet</p>
              <p className="mt-1 text-sm text-muted">Say what you&apos;re sketching, or ask a question.</p>
            </div>
          </div>
        ) : (
          <ol className="space-y-0.5">
            {hasMore && (
              <li className="py-2 text-center text-xs text-muted">{loadingOlder ? "Loading older messages…" : "Scroll up for older messages"}</li>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const d = new Date(m.createdAt);
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== d.toDateString();
              const grouped = !newDay && prev?.userId === m.userId && d.getTime() - new Date(prev.createdAt).getTime() < GROUP_MS;
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li className="flex items-center gap-3 py-3 text-xs font-medium text-muted" aria-label={dayLabel(d)}>
                      <span className="h-px flex-1 bg-line" />
                      {dayLabel(d)}
                      <span className="h-px flex-1 bg-line" />
                    </li>
                  )}
                  <li className={cn("group flex gap-2.5 rounded-lg px-1.5 py-0.5 hover:bg-sheet-2/60", !grouped && "mt-2.5")}>
                    {grouped ? (
                      <span className="w-7 shrink-0 pt-0.5 text-right text-[10px] text-transparent tabular group-hover:text-muted">
                        {clockTime(d).replace(/\s?[AP]M/i, "")}
                      </span>
                    ) : (
                      <Avatar user={m.user} size="sm" className="mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      {!grouped && (
                        <p className="flex items-baseline gap-2">
                          <span className="text-[13px] font-semibold text-ink">{m.userId === me.id ? "You" : displayName(m.user)}</span>
                          <time dateTime={m.createdAt} className="text-[11px] text-muted">
                            {clockTime(d)}
                          </time>
                        </p>
                      )}
                      <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap text-ink-2">{m.message}</p>
                    </div>
                  </li>
                </Fragment>
              );
            })}
            {pending.map((p) => (
              <li key={p.tempId} className="mt-2.5 flex gap-2.5 px-1.5 py-0.5">
                <Avatar user={me} size="sm" className="mt-0.5 opacity-60" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">You</p>
                  <p className={cn("text-[14px] leading-relaxed break-words whitespace-pre-wrap", p.failed ? "text-danger" : "text-muted")}>{p.message}</p>
                  {p.failed ? (
                    <p className="mt-0.5 text-xs text-danger">
                      Not sent.{" "}
                      <button type="button" className="font-semibold underline underline-offset-2" onClick={() => send(p.message, p.tempId)}>
                        Retry
                      </button>{" "}
                      ·{" "}
                      <button type="button" className="underline underline-offset-2" onClick={() => setPending((all) => all.filter((x) => x.tempId !== p.tempId))}>
                        Discard
                      </button>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted">Sending…</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="h-5 px-5 text-xs text-muted" aria-live="polite">
        {typingNames.length > 0 &&
          (typingNames.length === 1 ? `${typingNames[0]} is typing…` : `${typingNames.slice(0, 2).join(" and ")} are typing…`)}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-[var(--radius-control)] border border-line-strong bg-paper p-1.5 pl-3 transition-[border-color,box-shadow] focus-within:border-signal focus-within:ring-4 focus-within:ring-signal/12">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={2000}
            placeholder={connected ? "Message the board" : "Reconnecting…"}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSubmit();
              }
            }}
            className="max-h-37 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-snug text-ink outline-none placeholder:text-muted/80"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={!draft.trim() || !connected}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-on-brand transition-opacity hover:bg-brand-hover disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-1.5 hidden px-1 text-[11px] text-muted sm:block">Enter to send · Shift + Enter for a new line</p>
      </form>
    </div>
  );
}

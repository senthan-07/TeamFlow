"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MessageSquareText, Paperclip, PencilLine, PanelRightClose, PanelRightOpen, Phone, Users, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../../lib/axios";
import { cn, errorMessage } from "../../../lib/utils";
import { useAuthStore } from "../../../store/authStore";
import { useBoardSocket } from "../../../hooks/useBoardSocket";
import { useCall } from "../../../hooks/useCall";
import type { BoardDetail, BoardFile, CallParticipant, PresenceUser, User } from "../../../types/type";
import Canvas from "../../../components/board/Canvas";
import ChatPanel from "../../../components/board/ChatPanel";
import FilesPanel from "../../../components/board/FilesPanel";
import PeoplePanel from "../../../components/board/PeoplePanel";
import CallDock from "../../../components/board/CallDock";
import { RenameBoardDialog } from "../../../components/dashboard/BoardDialogs";
import { AccountMenu } from "../../../components/app/AppHeader";
import ThemeToggle from "../../../components/ui/ThemeToggle";
import { LogoMark } from "../../../components/ui/Logo";
import { AvatarStack } from "../../../components/ui/Avatar";
import Button, { ButtonLink } from "../../../components/ui/Button";
import Spinner from "../../../components/ui/Spinner";

type Tab = "chat" | "files" | "people";

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [files, setFiles] = useState<BoardFile[] | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [callers, setCallers] = useState<CallParticipant[]>([]);
  const [tab, setTab] = useState<Tab>("chat");
  const [panelOpen, setPanelOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [renameOpen, setRenameOpen] = useState(false);

  const call = useCall(id);

  // Panel starts open on wide screens, closed on phones.
  useEffect(() => {
    setPanelOpen(window.matchMedia("(min-width: 1024px)").matches);
  }, []);

  const loadBoard = useCallback(async () => {
    try {
      const res = await api.get<BoardDetail>(`/board/${id}`);
      setBoard(res.data);
      setLoadError("");
    } catch (err) {
      setLoadError(errorMessage(err, "Couldn't open this board."));
    }
  }, [id]);

  useEffect(() => {
    void loadBoard();
    api
      .get<BoardFile[]>(`/files/${id}`)
      .then((res) => setFiles(res.data))
      .catch(() => setFiles([]));
  }, [id, loadBoard]);

  useEffect(() => {
    if (board) document.title = `${board.title} · TeamFlow`;
  }, [board]);

  useBoardSocket("board", id, {
    presence: ({ users }: { users: PresenceUser[] }) => setPresence(users),
    callStatus: ({ participants }: { participants: CallParticipant[] }) => setCallers(participants),
    fileAdded: (file: BoardFile) => setFiles((list) => (list?.some((f) => f.id === file.id) ? list : [file, ...(list ?? [])])),
    fileRemoved: ({ id: fileId }: { id: string }) => setFiles((list) => list?.filter((f) => f.id !== fileId) ?? null),
    membersChanged: ({ removed }: { removed?: string } = {}) => {
      if (removed && removed === me?.id) {
        toast("You were removed from this board");
        router.replace("/dashboard");
      } else void loadBoard();
    },
    boardUpdated: ({ title }: { title: string }) => setBoard((b) => (b ? { ...b, title } : b)),
    boardDeleted: () => {
      toast("This board was deleted by its owner");
      router.replace("/dashboard");
    },
  });

  const online = useMemo(() => new Set(presence.map((p) => p.userId)), [presence]);
  const othersHere = presence.filter((p) => p.userId !== me?.id);

  if (loadError) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm text-center">
          <LogoMark className="mx-auto h-10 w-10" />
          <h1 className="mt-5 text-xl font-bold text-ink">This board isn&apos;t available</h1>
          <p className="mt-2 text-ink-2">{loadError} It may have been deleted, or the owner hasn&apos;t invited you.</p>
          <ButtonLink href="/dashboard" className="mt-6">
            Back to your boards
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!board || !me) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted" role="status" aria-label="Opening board">
        <Spinner />
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: "chat", label: "Chat", icon: MessageSquareText, badge: unread || undefined },
    { id: "files", label: "Files", icon: Paperclip, badge: files?.length || undefined },
    { id: "people", label: "People", icon: Users, badge: board.users.length + 1 },
  ];

  const openTab = (t: Tab) => {
    setTab(t);
    setPanelOpen(true);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper px-2 sm:gap-3 sm:px-3">
        <Link href="/dashboard" className="flex items-center gap-1 rounded-md py-1.5 pr-2 pl-1 text-sm font-medium text-ink-2 hover:bg-sheet-2 hover:text-ink" aria-label="Back to your boards">
          <ChevronLeft className="h-4 w-4" />
          <LogoMark className="h-6 w-6" />
        </Link>
        <span className="h-5 w-px bg-line" aria-hidden />
        <div className="flex min-w-0 items-center gap-1">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink" title={board.title}>
            {board.title}
          </h1>
          {board.isOwner && (
            <button type="button" onClick={() => setRenameOpen(true)} aria-label="Rename board" className="shrink-0 rounded-md p-1.5 text-muted hover:bg-sheet-2 hover:text-ink">
              <PencilLine className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Who's here right now */}
          {othersHere.length > 0 && (
            <button type="button" onClick={() => openTab("people")} className="hidden items-center gap-2 rounded-full py-1 pr-2.5 pl-1 hover:bg-sheet-2 sm:flex" aria-label={`${othersHere.length} others here now`}>
              <AvatarStack users={othersHere.map((p) => ({ userId: p.userId, name: p.name }))} max={4} size="sm" />
              <span className="text-xs font-medium text-ink-2 tabular">{othersHere.length} here</span>
            </button>
          )}

          {!call.joined &&
            (callers.length > 0 ? (
              <Button size="sm" onClick={call.join} loading={call.joining} className="gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                </span>
                <span className="hidden sm:inline">Join call</span>
                <span className="sm:hidden">Join</span>
                <span className="tabular opacity-80">{callers.length}</span>
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={call.join} loading={call.joining} disabled={!call.connected}>
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Start call</span>
              </Button>
            ))}

          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            aria-label={panelOpen ? "Hide side panel" : "Show chat, files and people"}
            aria-expanded={panelOpen}
            className="relative grid h-9 w-9 place-items-center rounded-md text-ink-2 hover:bg-sheet-2 hover:text-ink"
          >
            {panelOpen ? <PanelRightClose className="h-[18px] w-[18px]" /> : <PanelRightOpen className="h-[18px] w-[18px]" />}
            {!panelOpen && unread > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-signal ring-2 ring-sheet" />}
          </button>
          <ThemeToggle className="hidden sm:grid" />
          <AccountMenu />
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Canvas */}
        <main className="relative min-w-0 flex-1">
          <Canvas boardId={board.id} me={me} isOwner={board.isOwner} boardTitle={board.title} />
          <CallDock call={call} me={me} />
        </main>

        {/* Side panel: docked on desktop, slide-over on small screens */}
        {panelOpen && <div className="fixed inset-0 z-30 bg-[#0a0a0a]/40 lg:hidden" onClick={() => setPanelOpen(false)} aria-hidden />}
        <aside
          aria-label="Board panel"
          className={cn(
            "z-40 flex w-full max-w-[22rem] flex-col border-l border-line bg-paper",
            "fixed inset-y-0 right-0 transition-transform duration-300 ease-[var(--ease-out-quint)] lg:static lg:max-w-[22.5rem] lg:transition-none",
            panelOpen ? "translate-x-0" : "translate-x-full lg:hidden",
          )}
        >
          <div role="tablist" aria-label="Board panel" className="flex shrink-0 gap-1 border-b border-line px-2 pt-2">
            {TABS.map(({ id: t, label, icon: Icon, badge }) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                onClick={() => setTab(t)}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-t-md px-2 pt-2 pb-2.5 text-[13px] font-medium transition-colors",
                  tab === t ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {badge !== undefined && (
                  <span
                    className={cn(
                      "min-w-[1.15rem] rounded-full px-1 text-[10.5px] leading-[1.15rem] font-semibold tabular",
                      t === "chat" && badge ? "bg-signal text-on-signal" : "bg-sheet-2 text-ink-2",
                    )}
                  >
                    {badge}
                  </span>
                )}
                {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-signal" />}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel"
              className="mb-1 grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted hover:bg-sheet-2 hover:text-ink lg:hidden"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div id="panel-chat" role="tabpanel" aria-labelledby="tab-chat" hidden={tab !== "chat"} className="min-h-0 flex-1">
            <ChatPanel boardId={board.id} me={me} active={panelOpen && tab === "chat"} onUnread={setUnread} />
          </div>
          <div id="panel-files" role="tabpanel" aria-labelledby="tab-files" hidden={tab !== "files"} className="min-h-0 flex-1">
            <FilesPanel boardId={board.id} me={me} isOwner={board.isOwner} files={files} setFiles={setFiles} />
          </div>
          <div id="panel-people" role="tabpanel" aria-labelledby="tab-people" hidden={tab !== "people"} className="min-h-0 flex-1">
            <PeoplePanel board={board} me={me} online={online} onMembersChanged={(users: User[]) => setBoard((b) => (b ? { ...b, users } : b))} />
          </div>
        </aside>
      </div>

      <RenameBoardDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        boardId={board.id}
        currentTitle={board.title}
        onRenamed={(title) => setBoard((b) => (b ? { ...b, title } : b))}
      />

      {/* Screen-reader announcement for presence changes */}
      <p className="sr-only" aria-live="polite">
        {othersHere.length ? `${othersHere.map((p) => p.name).join(", ")} ${othersHere.length === 1 ? "is" : "are"} here` : ""}
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/axios";
import { cn, displayName, errorMessage } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import type { BoardSummary } from "../../types/type";
import AppHeader from "../../components/app/AppHeader";
import BoardTile from "../../components/dashboard/BoardTile";
import { CreateBoardDialog, RenameBoardDialog } from "../../components/dashboard/BoardDialogs";
import { ConfirmDialog } from "../../components/ui/Dialog";
import Button from "../../components/ui/Button";
import IsoStack from "../../components/landing/IsoStack";

type Filter = "all" | "mine" | "shared";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "shared", label: "Shared with me" },
];

type Pending = { kind: "rename" | "delete" | "leave"; board: BoardSummary } | null;

export default function DashboardPage() {
  const me = useAuthStore((s) => s.user);
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await api.get<BoardSummary[]>("/board/all");
      setBoards(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, "Couldn't load your boards."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (boards ?? []).filter(
      (b) =>
        (filter === "all" || (filter === "mine" ? b.isOwner : !b.isOwner)) &&
        (!q || b.title.toLowerCase().includes(q) || displayName(b.owner).toLowerCase().includes(q)),
    );
  }, [boards, query, filter]);

  const confirmDestructive = async () => {
    if (!pending || !me) return;
    const { kind, board } = pending;
    setBusy(true);
    try {
      if (kind === "delete") await api.delete(`/board/${board.id}`);
      else await api.delete(`/board/${board.id}/members/${me.id}`);
      setBoards((bs) => bs?.filter((b) => b.id !== board.id) ?? null);
      toast.success(kind === "delete" ? `Deleted "${board.title}"` : `You left "${board.title}"`);
      setPending(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const firstName = displayName(me).split(" ")[0];
  const counts: Record<Filter, number> = {
    all: boards?.length ?? 0,
    mine: boards?.filter((b) => b.isOwner).length ?? 0,
    shared: boards?.filter((b) => !b.isOwner).length ?? 0,
  };

  return (
    <div className="min-h-dvh">
      <AppHeader />

      <main className="mx-auto max-w-[88rem] px-4 pt-8 pb-20 sm:px-8">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <p className="meta">[01 · Workspace]</p>
          <p className="meta tabular">{boards ? `${String(boards.length).padStart(2, "0")} boards` : "Loading"}</p>
        </div>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
          <h1 className="display-md text-ink">
            Your boards,
            <span className="display-dim">welcome back, {firstName}.</span>
          </h1>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New board
          </Button>
        </div>

        {boards && boards.length > 0 && (
          <div className="mt-12 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div role="radiogroup" aria-label="Filter boards" className="inline-flex w-fit gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-[var(--radius-control)] border px-3 py-1.5 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors",
                    filter === f.id ? "border-ink bg-ink text-paper" : "border-line text-label hover:border-line-strong hover:text-ink",
                  )}
                >
                  {f.label} <span className="tabular opacity-70">{String(counts[f.id]).padStart(2, "0")}</span>
                </button>
              ))}
            </div>
            <label className="relative block sm:w-72">
              <span className="sr-only">Search boards</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or owner"
                className="h-10 w-full rounded-[var(--radius-control)] border border-line-strong bg-paper pr-3 pl-9 text-sm text-ink placeholder:text-muted/80 focus:border-signal focus:ring-4 focus:ring-signal/12 focus:outline-none"
              />
            </label>
          </div>
        )}

        <section className="mt-6" aria-live="polite" aria-busy={boards === null && !loadError}>
          {loadError ? (
            <div className="rounded-[var(--radius-panel)] border border-line px-6 py-12 text-center">
              <p className="font-semibold text-ink">{loadError}</p>
              <Button variant="secondary" className="mt-4" onClick={load}>
                Try again
              </Button>
            </div>
          ) : boards === null ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading boards">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="overflow-hidden rounded-[var(--radius-panel)] border border-line">
                  <div className="aspect-[16/10] animate-pulse bg-sheet-2" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-sheet-2" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-sheet-2" />
                  </div>
                </li>
              ))}
            </ul>
          ) : boards.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : visible.length === 0 ? (
            <p className="rounded-[var(--radius-panel)] border border-dashed border-line-strong px-6 py-12 text-center text-ink-2">
              No boards match{query ? ` "${query}"` : " this filter"}.
            </p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((board, i) => (
                <BoardTile
                  key={board.id}
                  board={board}
                  index={`${String(i + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`}
                  onRename={() => setPending({ kind: "rename", board })}
                  onDelete={() => setPending({ kind: "delete", board })}
                  onLeave={() => setPending({ kind: "leave", board })}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      <CreateBoardDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <RenameBoardDialog
        open={pending?.kind === "rename"}
        onClose={() => setPending(null)}
        boardId={pending?.board.id ?? ""}
        currentTitle={pending?.board.title ?? ""}
        onRenamed={(title) => setBoards((bs) => bs?.map((b) => (b.id === pending?.board.id ? { ...b, title } : b)) ?? null)}
      />

      <ConfirmDialog
        open={pending?.kind === "delete" || pending?.kind === "leave"}
        onClose={() => !busy && setPending(null)}
        onConfirm={confirmDestructive}
        loading={busy}
        title={pending?.kind === "delete" ? `Delete "${pending.board.title}"?` : `Leave "${pending?.board.title}"?`}
        description={
          pending?.kind === "delete"
            ? "The drawing, chat history and uploaded files will be deleted for everyone. This can't be undone."
            : "You'll lose access until the owner invites you again."
        }
        confirmLabel={pending?.kind === "delete" ? "Delete board" : "Leave board"}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="hairline-grid grid items-center gap-8 overflow-hidden rounded-[var(--radius-panel)] border border-line px-6 py-12 sm:px-12 md:grid-cols-2">
      <div>
        <p className="meta">[00 · Empty]</p>
        <h2 className="display-sm mt-5 text-ink">
          Nothing here yet.
          <span className="display-dim">Start your first board.</span>
        </h2>
        <p className="mt-5 max-w-[42ch] leading-relaxed text-ink-2">
          A board is a shared sheet with its own chat, files and call. Make one and invite your team.
        </p>
      </div>
      <IsoStack animated={false} labels={false} className="mx-auto hidden max-w-[18rem] md:block" />
      <Button className="w-fit md:col-start-1 md:-mt-2" onClick={onCreate}>
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Create a board
      </Button>
    </div>
  );
}

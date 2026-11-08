"use client";

import Link from "next/link";
import { LogOut, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import { displayName, timeAgo } from "../../lib/utils";
import type { BoardSummary } from "../../types/type";
import { AvatarStack } from "../ui/Avatar";
import Menu from "../ui/Menu";
import BoardThumb from "./BoardThumb";

const pad = (n: number) => String(n).padStart(2, "0");

export default function BoardTile({
  board,
  index,
  onRename,
  onDelete,
  onLeave,
}: {
  board: BoardSummary;
  index: string;
  onRename: () => void;
  onDelete: () => void;
  onLeave: () => void;
}) {
  const people = [board.owner, ...board.users];

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-line transition-colors duration-200 focus-within:border-line-strong hover:border-line-strong">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="meta">[{index}]</p>
        <p className="meta">{board.isOwner ? "Owner" : "Shared"}</p>
      </div>
      <div className="border-b border-line">
        <BoardThumb boardId={board.id} version={board.lastActivity} />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-serif text-[26px] leading-[1.05] tracking-[-0.015em] text-ink">
              {/* Stretched link: the whole tile opens the board; the menu sits above it. */}
              <Link href={`/board/${board.id}`} className="line-clamp-2 outline-none after:absolute after:inset-0 after:content-['']">
                {board.title}
              </Link>
            </h2>
            <p className="mt-0.5 truncate text-[13px] text-muted">{board.isOwner ? "You own this board" : `Owned by ${displayName(board.owner)}`}</p>
          </div>
          <div className="relative z-10 -mt-1 -mr-1.5">
            <Menu
              label={`Actions for ${board.title}`}
              trigger={<MoreHorizontal className="h-4 w-4" />}
              items={[
                { label: "Rename", icon: PencilLine, onSelect: onRename, hidden: !board.isOwner },
                { label: "Delete board", icon: Trash2, onSelect: onDelete, danger: true, hidden: !board.isOwner },
                { label: "Leave board", icon: LogOut, onSelect: onLeave, danger: true, hidden: board.isOwner },
              ]}
            />
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          <div className="min-w-0 space-y-1">
            <p className="meta truncate" title={new Date(board.lastActivity).toLocaleString()}>
              Active {timeAgo(board.lastActivity)}
            </p>
            <p className="meta">
              Msg {pad(board._count.chats)} · Files {pad(board._count.files)}
            </p>
          </div>
          <AvatarStack users={people} max={3} size="sm" />
        </div>
      </div>
    </li>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/axios";
import { cn, displayName, EMAIL_RE, errorMessage } from "../../lib/utils";
import type { BoardDetail, User } from "../../types/type";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import { inputClass } from "../ui/Field";
import { ConfirmDialog } from "../ui/Dialog";

export default function PeoplePanel({
  board,
  me,
  online,
  onMembersChanged,
}: {
  board: BoardDetail;
  me: User;
  online: Set<string>;
  onMembersChanged: (users: User[]) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const people = [board.owner, ...board.users].sort((a, b) => Number(online.has(b.id)) - Number(online.has(a.id)));
  const onlineCount = people.filter((p) => online.has(p.id)).length;

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return setError("Enter a valid email address.");
    if (people.some((p) => p.email.toLowerCase() === value)) return setError("They're already on this board.");
    setInviting(true);
    setError("");
    try {
      const { data } = await api.post<User>(`/board/${board.id}/members`, { email: value });
      onMembersChanged([...board.users, data]);
      toast.success(`${displayName(data)} can now open this board`);
      setEmail("");
    } catch (err) {
      setError(errorMessage(err, "Couldn't invite them."));
    } finally {
      setInviting(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const leaving = removing.id === me.id;
    setBusy(true);
    try {
      await api.delete(`/board/${board.id}/members/${removing.id}`);
      if (leaving) {
        toast.success(`You left "${board.title}"`);
        router.replace("/dashboard");
        return;
      }
      onMembersChanged(board.users.filter((u) => u.id !== removing.id));
      toast.success(`Removed ${displayName(removing)}`);
      setRemoving(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {board.isOwner && (
        <form onSubmit={invite} className="border-b border-line p-3" noValidate>
          <label htmlFor="invite-email" className="text-sm font-semibold text-ink">
            Invite by email
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="invite-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="name@company.com"
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby="invite-help"
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              className={cn(inputClass, "h-10 text-sm")}
            />
            <Button type="submit" loading={inviting} className="shrink-0">
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          </div>
          <p id="invite-help" className={cn("mt-1.5 text-xs", error ? "text-danger" : "text-muted")}>
            {error || "They need a TeamFlow account with this email."}
          </p>
        </form>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="meta px-2 pt-1 pb-2">
          {people.length} {people.length === 1 ? "member" : "members"} · {onlineCount} here now
        </p>
        <ul className="space-y-0.5">
          {people.map((p) => {
            const isOwner = p.id === board.owner.id;
            const isMe = p.id === me.id;
            const canRemove = !isOwner && (board.isOwner || isMe);
            return (
              <li key={p.id} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-sheet-2/70">
                <Avatar user={p} size="md" online={online.has(p.id)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {displayName(p)}
                    {isMe && <span className="font-normal text-muted"> (you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{p.email}</p>
                </div>
                {isOwner ? (
                  <span className="meta rounded-sm border border-line-strong px-1.5 py-0.5 !text-[10px] !text-ink-2">Owner</span>
                ) : (
                  canRemove && (
                    <button
                      type="button"
                      onClick={() => setRemoving(p)}
                      aria-label={isMe ? "Leave board" : `Remove ${displayName(p)}`}
                      title={isMe ? "Leave board" : "Remove from board"}
                      className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      {isMe ? <LogOut className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmDialog
        open={!!removing}
        onClose={() => !busy && setRemoving(null)}
        onConfirm={confirmRemove}
        loading={busy}
        title={removing?.id === me.id ? `Leave "${board.title}"?` : `Remove ${displayName(removing)}?`}
        description={
          removing?.id === me.id
            ? "You'll lose access until the owner invites you again."
            : "They'll lose access to the drawing, chat and files. You can invite them again later."
        }
        confirmLabel={removing?.id === me.id ? "Leave board" : "Remove"}
      />
    </div>
  );
}

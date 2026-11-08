"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import api from "../../lib/axios";
import { errorMessage } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import type { CreatedBoard } from "../../types/type";
import Dialog from "../ui/Dialog";
import Field from "../ui/Field";
import Button from "../ui/Button";
import EmailInput from "../ui/EmailInput";

export function CreateBoardDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setEmails([]);
      setError("");
    }
  }, [open]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give the board a name.");
    setSaving(true);
    try {
      const { data } = await api.post<CreatedBoard>("/board/new", { title: title.trim(), userEmails: emails });
      if (data.notFoundEmails.length) {
        toast.warning(`${data.notFoundEmails.length === 1 ? "1 person isn't" : `${data.notFoundEmails.length} people aren't`} on TeamFlow yet`, {
          description: `${data.notFoundEmails.join(", ")}. Ask them to sign up, then invite them from the board.`,
          duration: 8000,
        });
      } else {
        toast.success(`Created "${data.title}"`);
      }
      onClose();
      router.push(`/board/${data.id}`);
    } catch (err) {
      setError(errorMessage(err, "Couldn't create the board."));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New board" description="You can invite more people from inside the board later.">
      <form onSubmit={create} className="space-y-5">
        <Field
          label="Board name"
          placeholder="Sprint 14 planning"
          value={title}
          maxLength={80}
          autoFocus
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError("");
          }}
          error={error}
        />
        <EmailInput
          label="Invite people"
          hint="Press Enter after each email. They need a TeamFlow account."
          value={emails}
          onChange={setEmails}
          exclude={me?.email ? [me.email.toLowerCase()] : []}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create board
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function RenameBoardDialog({
  open,
  onClose,
  boardId,
  currentTitle,
  onRenamed,
}: {
  open: boolean;
  onClose: () => void;
  boardId: string;
  currentTitle: string;
  onRenamed: (title: string) => void;
}) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(currentTitle);
      setError("");
    }
  }, [open, currentTitle]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = title.trim();
    if (!next) return setError("The name can't be empty.");
    if (next === currentTitle) return onClose();
    setSaving(true);
    try {
      await api.patch(`/board/${boardId}`, { title: next });
      onRenamed(next);
      toast.success("Board renamed");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't rename the board."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Rename board">
      <form onSubmit={save} className="space-y-5">
        <Field label="Board name" value={title} maxLength={80} autoFocus onChange={(e) => setTitle(e.target.value)} error={error} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save name
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

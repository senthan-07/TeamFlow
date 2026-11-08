"use client";

import { useRef, useState } from "react";
import { FileArchive, FileAudio, FileCode, FileImage, FileSpreadsheet, FileText, FileVideo, File as FileIcon, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/axios";
import { apiAsset } from "../../lib/config";
import { displayName, errorMessage, formatBytes, timeAgo, uid } from "../../lib/utils";
import type { BoardFile, User } from "../../types/type";
import { ConfirmDialog } from "../ui/Dialog";
import Spinner from "../ui/Spinner";

const MAX_BYTES = 25 * 1024 * 1024;

interface Upload {
  id: string;
  name: string;
  progress: number;
  controller: AbortController;
}

function iconFor(mime: string, name: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  if (/sheet|excel|csv/.test(mime) || /\.(csv|xlsx?)$/i.test(name)) return FileSpreadsheet;
  if (/zip|compressed|tar|rar/.test(mime)) return FileArchive;
  if (/json|javascript|typescript|xml|html/.test(mime)) return FileCode;
  return FileIcon;
}

export default function FilesPanel({
  boardId,
  me,
  isOwner,
  files,
  setFiles,
}: {
  boardId: string;
  me: User;
  isOwner: boolean;
  files: BoardFile[] | null;
  setFiles: React.Dispatch<React.SetStateAction<BoardFile[] | null>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<BoardFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dragDepth = useRef(0);

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name} is larger than 25 MB`);
      return;
    }
    const entry: Upload = { id: uid(), name: file.name, progress: 0, controller: new AbortController() };
    setUploads((u) => [...u, entry]);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post<BoardFile>(`/files/${boardId}`, form, {
        signal: entry.controller.signal,
        onUploadProgress: (e) => {
          const progress = e.total ? e.loaded / e.total : 0;
          setUploads((u) => u.map((x) => (x.id === entry.id ? { ...x, progress } : x)));
        },
      });
      // The board socket also announces it; whichever arrives first wins.
      setFiles((list) => (list?.some((f) => f.id === res.data.id) ? list : [res.data, ...(list ?? [])]));
    } catch (err) {
      if (!entry.controller.signal.aborted) toast.error(`Couldn't upload ${file.name}`, { description: errorMessage(err) });
    } finally {
      setUploads((u) => u.filter((x) => x.id !== entry.id));
    }
  };

  const uploadAll = (list: FileList | null) => {
    if (!list) return;
    [...list].slice(0, 10).forEach((f) => void upload(f));
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/files/${boardId}/${toDelete.id}`);
      setFiles((list) => list?.filter((f) => f.id !== toDelete.id) ?? null);
      toast.success(`Deleted ${toDelete.filename}`);
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        dragDepth.current++;
        setDragging(true);
      }}
      onDragLeave={() => {
        if (--dragDepth.current <= 0) setDragging(false);
      }}
      onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        uploadAll(e.dataTransfer.files);
      }}
    >
      <div className="border-b border-line p-3">
        <input ref={inputRef} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => (uploadAll(e.target.files), (e.target.value = ""))} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-dashed border-line-strong px-3 py-3 text-left transition-colors hover:border-ink hover:bg-brand-soft"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <UploadCloud className="h-[18px] w-[18px]" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">Upload files</span>
            <span className="block text-xs text-muted">Click or drop here · up to 25 MB each</span>
          </span>
        </button>

        {uploads.length > 0 && (
          <ul className="mt-3 space-y-2">
            {uploads.map((u) => (
              <li key={u.id} className="flex items-center gap-2 text-[13px]">
                <Spinner className="h-3.5 w-3.5 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{u.name}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-sheet-2">
                    <span className="block h-full rounded-full bg-signal transition-[width]" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                  </span>
                </span>
                <button type="button" aria-label={`Cancel upload of ${u.name}`} onClick={() => u.controller.abort()} className="rounded p-1 text-muted hover:text-ink">
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {files === null ? (
          <div className="grid h-full place-items-center text-muted">
            <Spinner />
          </div>
        ) : files.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No files yet. Screenshots, specs and PDFs you upload show up here for everyone.</p>
        ) : (
          <ul className="space-y-0.5">
            {files.map((f) => {
              const Icon = iconFor(f.mimetype, f.filename);
              const isImage = /^image\/(png|jpe?g|gif|webp|avif)$/.test(f.mimetype);
              const canDelete = isOwner || f.userId === me.id;
              return (
                <li key={f.id} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-sheet-2/70">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={apiAsset(f.url)} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md border border-line object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-sheet text-ink-2">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={apiAsset(f.url)}
                      target="_blank"
                      rel="noreferrer"
                      download={f.filename}
                      className="block truncate text-[14px] font-medium text-ink hover:text-brand hover:underline"
                      title={f.filename}
                    >
                      {f.filename}
                    </a>
                    <p className="truncate text-xs text-muted">
                      {formatBytes(f.size)} · {f.userId === me.id ? "you" : displayName(f.user)} · {timeAgo(f.createdAt)}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setToDelete(f)}
                      aria-label={`Delete ${f.filename}`}
                      className="rounded-md p-1.5 text-muted opacity-100 hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-[var(--radius-panel)] border-2 border-dashed border-signal bg-paper/95 text-center">
          <div>
            <UploadCloud className="mx-auto h-8 w-8 text-brand" />
            <p className="mt-2 font-semibold text-ink">Drop to upload</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title={`Delete ${toDelete?.filename ?? "file"}?`}
        description="It's removed for everyone on the board."
        confirmLabel="Delete file"
      />
    </div>
  );
}


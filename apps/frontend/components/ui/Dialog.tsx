"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import Button from "./Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Built on the native <dialog> element: focus trapping, Esc to close, inert background
 * and top-layer stacking all come from the browser.
 */
export default function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself (not its content) is a backdrop click.
      onMouseDown={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] border border-line bg-paper p-0 text-ink shadow-float",
        "backdrop:bg-[#0a0a0a]/50 backdrop:backdrop-blur-[2px]",
        className,
      )}
    >
      {open && (
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="font-serif text-[28px] leading-none tracking-[-0.02em]">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1.5 text-sm leading-relaxed text-ink-2">
                  {description}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mt-1 -mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-sheet-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {children && <div className="mt-5">{children}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  loading,
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

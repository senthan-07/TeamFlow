"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/**
 * Accessible dropdown menu: click or Enter/Space opens, arrow keys move, Esc closes and
 * returns focus to the trigger, clicking outside closes.
 */
export default function Menu({
  label,
  trigger,
  items,
  align = "end",
  header,
  triggerClassName,
}: {
  label: string;
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  header?: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    // Focus the first item when opened.
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const els = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const idx = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(idx + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(idx - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  if (!visible.length && !header) return null;

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md text-muted transition-colors hover:bg-sheet-2 hover:text-ink aria-expanded:bg-sheet-2 aria-expanded:text-ink",
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-full z-50 mt-1.5 min-w-[13rem] origin-top overflow-hidden rounded-[var(--radius-control)] border border-line bg-paper p-1 shadow-float",
            "animate-[pop-in_160ms_var(--ease-out-quint)]",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {header && <div className="border-b border-line px-2.5 pt-1.5 pb-2.5 mb-1">{header}</div>}
          {visible.map(({ label: itemLabel, icon: Icon, onSelect, danger }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none",
                "hover:bg-sheet-2 focus-visible:bg-sheet-2",
                danger ? "text-danger" : "text-ink",
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

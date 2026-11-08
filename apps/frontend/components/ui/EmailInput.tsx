"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { cn, EMAIL_RE } from "../../lib/utils";

/**
 * Collects email addresses as chips. Enter, comma, space or blur commits; pasting a
 * comma/space separated list adds them all; Backspace on an empty input removes the last.
 */
export default function EmailInput({
  label,
  hint,
  value,
  onChange,
  exclude = [],
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (emails: string[]) => void;
  exclude?: string[];
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const commit = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return;
    const invalid = parts.filter((p) => !EMAIL_RE.test(p));
    const blocked = parts.filter((p) => exclude.includes(p));
    const next = [...value];
    for (const p of parts) if (EMAIL_RE.test(p) && !exclude.includes(p) && !next.includes(p)) next.push(p);
    onChange(next);
    setDraft(invalid.join(" "));
    setError(invalid.length ? `"${invalid[0]}" isn't a valid email` : blocked.length ? "You're already on the board" : "");
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div
        className={cn(
          "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-[var(--radius-control)] border border-line-strong bg-paper px-2 py-1.5 shadow-sheet",
          "transition-[border-color,box-shadow] focus-within:border-signal focus-within:ring-4 focus-within:ring-signal/12",
          error && "border-danger",
        )}
      >
        {value.map((email) => (
          <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-soft py-0.5 pr-1 pl-2 text-[13px] font-medium text-ink">
            <span className="truncate">{email}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((e) => e !== email))}
              aria-label={`Remove ${email}`}
              className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-sheet hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={draft}
          placeholder={value.length ? "" : "name@company.com"}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            const v = e.target.value;
            if (/[\s,;]$/.test(v)) commit(v);
            else {
              setDraft(v);
              if (error) setError("");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && commit(draft)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[\s,;]/.test(text.trim())) {
              e.preventDefault();
              commit(text);
            }
          }}
          className="h-7 min-w-[10rem] flex-1 bg-transparent px-1.5 text-[15px] text-ink outline-none placeholder:text-muted/80"
        />
      </div>
      <p id={`${id}-help`} className={cn("text-[13px]", error ? "text-danger" : "text-muted")}>
        {error || hint}
      </p>
    </div>
  );
}

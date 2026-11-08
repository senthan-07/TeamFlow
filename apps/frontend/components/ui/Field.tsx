"use client";

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/utils";

export const inputClass =
  "h-11 w-full rounded-[var(--radius-control)] border border-line-strong bg-paper px-3.5 text-[15px] text-ink " +
  "placeholder:text-muted/80 shadow-sheet transition-[border-color,box-shadow] duration-150 " +
  "hover:border-line-strong focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/12 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Rendered on the right of the label row (e.g. a "Forgot?" link). */
  aside?: React.ReactNode;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, aside, className, type, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && reveal ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(inputClass, isPassword && "pr-11")}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-[var(--radius-control)] text-muted hover:text-ink"
          >
            {reveal ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Field;

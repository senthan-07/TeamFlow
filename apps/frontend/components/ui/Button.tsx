import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "../../lib/utils";
import Spinner from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out-quint)] " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand shadow-sheet hover:bg-brand-hover",
  secondary: "bg-sheet text-ink border border-line shadow-sheet hover:border-line-strong hover:bg-sheet-2",
  ghost: "text-ink-2 hover:bg-sheet-2 hover:text-ink",
  danger: "bg-danger text-white shadow-sheet hover:brightness-110",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-9 w-9 p-0",
};

export function buttonClass({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, disabled, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className })}
      {...props}
    >
      {/* Keep the label in place while loading so the button doesn't change width. */}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner className="h-4 w-4" />
        </span>
      )}
    </button>
  );
});

export default Button;

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })}>
      {children}
    </Link>
  );
}

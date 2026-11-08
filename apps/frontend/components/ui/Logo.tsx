import Link from "next/link";
import { cn } from "../../lib/utils";

/** Mark: one marker stroke across an ink square, ending in the pen's live dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7", className)}>
      <rect x="1" y="1" width="30" height="30" rx="6" fill="var(--fg)" />
      <path
        d="M7.5 19.5c2.6-6.4 5.6-6.6 8-2.6s5.2 3.6 7.5-3.4"
        fill="none"
        stroke="var(--bg)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.6" cy="10.4" r="2" fill="var(--signal)" />
    </svg>
  );
}

export default function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-sm", className)} aria-label="TeamFlow home">
      <LogoMark className="h-6 w-6" />
      <span className="text-[17px] font-bold tracking-[-0.02em] text-ink">TeamFlow</span>
    </Link>
  );
}

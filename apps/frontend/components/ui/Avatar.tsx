import { cn, displayName, initials, markerFor } from "../../lib/utils";

interface AvatarUser {
  id?: string;
  userId?: string;
  name?: string | null;
  email?: string | null;
  /** Override the colour derived from the id. */
  color?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-12 w-12 text-base",
};

/** Initials on the person's marker colour, so avatar = cursor = strokes. */
export default function Avatar({
  user,
  size = "sm",
  online,
  className,
}: {
  user: AvatarUser;
  size?: keyof typeof sizes;
  online?: boolean;
  className?: string;
}) {
  const id = user.id ?? user.userId;
  return (
    <span
      title={displayName(user)}
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-tight text-white ring-2 ring-sheet",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: user.color ?? markerFor(id) }}
    >
      {initials(user.name, user.email)}
      {online && (
        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-sheet" aria-label="Online" />
      )}
    </span>
  );
}

export function AvatarStack({ users, max = 4, size = "sm" }: { users: AvatarUser[]; max?: number; size?: keyof typeof sizes }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className={cn("flex items-center", size === "xs" ? "-space-x-0.5" : "-space-x-1")}>
      {shown.map((u, i) => (
        <Avatar key={u.id ?? u.userId ?? i} user={u} size={size} />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-grid place-items-center rounded-full bg-sheet-2 font-semibold text-ink-2 ring-2 ring-sheet tabular",
            sizes[size],
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

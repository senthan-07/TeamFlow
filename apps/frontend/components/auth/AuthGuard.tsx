"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import { useHydrated } from "../../hooks/useHydrated";
import Spinner from "../ui/Spinner";

function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center text-muted" role="status" aria-label="Loading">
      <Spinner />
    </div>
  );
}

/** Wrap signed-in-only pages. Waits for the persisted session before deciding. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated || !isAuthenticated) return <FullPageLoader />;
  return <>{children}</>;
}

/** Wrap /login and /register: signed-in visitors go straight to the dashboard. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (hydrated && isAuthenticated) router.replace("/dashboard");
  }, [hydrated, isAuthenticated, router]);

  if (hydrated && isAuthenticated) return <FullPageLoader />;
  return <>{children}</>;
}

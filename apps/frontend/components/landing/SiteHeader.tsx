"use client";

import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { useHydrated } from "../../hooks/useHydrated";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";
import { ButtonLink } from "../ui/Button";

const NAV = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
];

export default function SiteHeader() {
  const hydrated = useHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const signedIn = hydrated && isAuthenticated;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto grid h-16 max-w-[88rem] grid-cols-[1fr_auto_1fr] items-center gap-6 px-4 sm:px-8">
        <Logo />
        <nav aria-label="Sections" className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[14px] text-ink-2 transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <nav className="col-start-3 flex items-center justify-end gap-1" aria-label="Account">
          <ThemeToggle />
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm" className="ml-1 rounded-full px-4">
              Open dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="rounded-full">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm" className="rounded-full px-4">
                Get started
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

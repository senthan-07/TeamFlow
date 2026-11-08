"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthStore } from "../../store/authStore";
import { errorMessage } from "../../lib/utils";
import Field from "../ui/Field";
import Button from "../ui/Button";

type Mode = "login" | "register";

const COPY: Record<Mode, { title: string; subtitle: string; submit: string; switchText: string; switchLink: string; switchHref: string }> = {
  login: {
    title: "Sign in",
    subtitle: "to your boards.",
    submit: "Sign in",
    switchText: "New to TeamFlow?",
    switchLink: "Create an account",
    switchHref: "/register",
  },
  register: {
    title: "Create an account",
    subtitle: "and open your first board.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/login",
  },
};

/** Only allow same-site relative redirects. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { login, register } = useAuth();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordError("");

    if (mode === "register" && password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      router.replace(next);
    } catch (err) {
      setError(errorMessage(err, mode === "login" ? "Couldn't sign you in. Try again." : "Couldn't create your account. Try again."));
      setLoading(false);
    }
  };

  const switchHref = params.get("next") ? `${copy.switchHref}?next=${encodeURIComponent(next)}` : copy.switchHref;

  return (
    <>
      <p className="meta">{mode === "login" ? "[01 · Sign in]" : "[01 · Register]"}</p>
      <h1 className="display-sm mt-5 text-ink">
        {copy.title}
        <span className="display-dim">{copy.subtitle}</span>
      </h1>

      {mode === "login" && sessionExpired && !error && (
        <p className="mt-6 rounded-[var(--radius-control)] border border-signal/40 bg-brass-soft px-3.5 py-2.5 text-sm text-ink">
          Your session expired. Sign in again to continue.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {mode === "register" && (
          <Field
            label="Name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            hint="Shown to teammates on your cursor and messages."
          />
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError("");
          }}
          hint={mode === "register" ? "At least 8 characters." : undefined}
          error={passwordError}
        />

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-[var(--radius-control)] bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <CircleAlert className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {copy.submit}
        </Button>
      </form>

      <p className="mt-8 text-sm text-ink-2">
        {copy.switchText}{" "}
        <Link href={switchHref} className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-signal">
          {copy.switchLink}
        </Link>
      </p>
    </>
  );
}

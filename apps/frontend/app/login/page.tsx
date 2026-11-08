import { Suspense } from "react";
import type { Metadata } from "next";
import AuthShell from "../../components/auth/AuthShell";
import AuthForm from "../../components/auth/AuthForm";
import { GuestOnly } from "../../components/auth/AuthGuard";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <GuestOnly>
      <AuthShell>
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </AuthShell>
    </GuestOnly>
  );
}

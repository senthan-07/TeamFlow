import { Suspense } from "react";
import type { Metadata } from "next";
import AuthShell from "../../components/auth/AuthShell";
import AuthForm from "../../components/auth/AuthForm";
import { GuestOnly } from "../../components/auth/AuthGuard";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <GuestOnly>
      <AuthShell>
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </AuthShell>
    </GuestOnly>
  );
}

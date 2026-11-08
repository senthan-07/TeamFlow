import type { Metadata } from "next";
import { RequireAuth } from "../../components/auth/AuthGuard";

export const metadata: Metadata = { title: "Your boards" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}

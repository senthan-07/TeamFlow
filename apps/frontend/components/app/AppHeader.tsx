"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../store/authStore";
import { cn, displayName, errorMessage } from "../../lib/utils";
import api from "../../lib/axios";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";
import Avatar from "../ui/Avatar";
import Menu from "../ui/Menu";
import Dialog from "../ui/Dialog";
import Field from "../ui/Field";
import Button from "../ui/Button";

export function AccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  if (!user) return null;

  return (
    <>
      <Menu
        label="Account"
        triggerClassName="h-9 w-9 rounded-full"
        trigger={<Avatar user={user} size="sm" />}
        header={
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{displayName(user)}</p>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
          </div>
        }
        items={[
          { label: "Edit profile", icon: UserRound, onSelect: () => setProfileOpen(true) },
          {
            label: "Sign out",
            icon: LogOut,
            onSelect: () => {
              logout();
              router.replace("/login");
            },
          },
        ]}
      />
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}

function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const body: Record<string, string> = {};
    if (name.trim() && name.trim() !== user?.name) body.name = name.trim();
    if (password) {
      if (password.length < 8) return setError("New password must be at least 8 characters.");
      body.password = password;
      body.currentPassword = currentPassword;
    }
    if (!Object.keys(body).length) return onClose();

    setSaving(true);
    try {
      const res = await api.patch("/user/me", body);
      updateUser({ name: res.data.name });
      toast.success("Profile saved");
      setPassword("");
      setCurrentPassword("");
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit profile" description="Your name appears on your cursor, messages and avatar.">
      <form onSubmit={save} className="space-y-4">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
        <fieldset className="space-y-4 border-t border-line pt-4">
          <legend className="sr-only">Change password</legend>
          <p className="text-sm font-medium text-ink">Change password (optional)</p>
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </fieldset>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AppHeader({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md", className)}>
      <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          {children}
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

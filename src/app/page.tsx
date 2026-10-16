"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  LayerCard,
  Badge,
} from "@cloudflare/kumo";
import {
  Kanban,
  SignOut,
  Plus,
  FolderOpen,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import { USER_ROLES, UserRole } from "@/lib/roles";

interface UserSession {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          router.replace("/login");
          return;
        }
      } catch (err) {
        router.replace("/login");
        return;
      } finally {
        setCheckingAuth(false);
      }
    }
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    router.replace("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kumo-canvas">
        <span className="text-xs text-kumo-subtle">Checking session...</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-kumo-canvas">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-kumo-line bg-kumo-base px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-kumo-brand text-white">
              <Kanban weight="thin" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-kumo-default">Project Tracker</span>
              <span className="text-xs text-kumo-subtle">Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <UserAvatar src={currentUser?.avatarUrl} name={currentUser?.name} size={30} />
              <div className="hidden flex-col text-left sm:flex">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-kumo-default leading-tight">
                    {currentUser?.name}
                  </span>
                  {currentUser?.role && (
                    <Badge
                      variant={
                        USER_ROLES[currentUser.role as UserRole]?.badgeVariant || "neutral"
                      }
                    >
                      {USER_ROLES[currentUser.role as UserRole]?.label || currentUser.role}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-kumo-subtle leading-tight">
                  {currentUser?.email}
                </span>
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={handleLogout}>
              <SignOut weight="thin" size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Clean / Empty State as requested */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md text-center">
          <LayerCard className="p-8 ring ring-kumo-line">
            <div className="mb-4 flex flex-col items-center justify-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-kumo-control ring ring-kumo-line text-kumo-subtle">
                <FolderOpen weight="thin" size={32} />
              </div>
              <h2 className="text-base font-semibold text-kumo-default">No projects yet</h2>
              <p className="mt-1 text-xs text-kumo-subtle">
                Your workspace is empty and ready. You are currently logged in as{" "}
                <span className="font-medium text-kumo-default">{currentUser?.email}</span>.
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <Button variant="primary" className="inline-flex items-center justify-center">
                <Plus weight="thin" size={16} className="mr-1.5" />
                <span>Create your first project</span>
              </Button>
            </div>
          </LayerCard>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-kumo-line bg-kumo-base px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-kumo-subtle">
          <div>Project Tracker Workspace</div>
          <div>Cloudflare Kumo UI &bull; PostgreSQL</div>
        </div>
      </footer>
    </div>
  );
}

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
  CaretDown,
  User,
  EnvelopeSimple,
  Gear,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import AppNavbar from "@/components/AppNavbar";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      <AppNavbar currentUser={currentUser} subtitle="Workspace" />

      {/* Main Content Area: Clean / Empty State as requested */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md text-center -translate-y-[10vh]">
          <LayerCard className="p-8 ring ring-kumo-line">
            <div className="mb-4 flex flex-col items-center justify-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-kumo-control ring ring-kumo-line text-kumo-subtle">
                <FolderOpen weight="thin" size={32} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-kumo-default">
                No projects yet
              </h2>
              <p className="mt-2 text-sm text-kumo-subtle leading-relaxed max-w-xs">
                Your workspace is empty and ready. Start by creating your first project to track progress.
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

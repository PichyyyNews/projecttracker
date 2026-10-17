"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Badge } from "@cloudflare/kumo";
import {
  Kanban,
  SignOut,
  CaretDown,
  User,
  EnvelopeSimple,
  Gear,
  CheckCircle,
  WarningCircle,
  X,
  Bell,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import { USER_ROLES, UserRole } from "@/lib/roles";

export interface NavbarUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface AppNavbarProps {
  currentUser: NavbarUser | null;
  subtitle?: string;
}

export const AppNavbar: React.FC<AppNavbarProps> = ({
  currentUser,
  subtitle = "Workspace",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toastNotification, setToastNotification] = useState<{
    id: number;
    subject: string;
    senderName: string;
  } | null>(null);

  // Poll for unread messages every 15s to notify user
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    let isInitialLoad = true;
    let lastKnownMaxId = 0;

    const checkMessages = async () => {
      try {
        const res = await fetch("/api/messages");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && isMounted) {
          const unread = data.data.filter(
            (m: any) => m.status === "unread" && m.senderId !== currentUser.id
          );
          setUnreadCount(unread.length);

          const currentMaxId = unread.reduce((max: number, m: any) => Math.max(max, m.id), 0);

          // On initial load / refresh: just record current messages, NEVER trigger popup
          if (isInitialLoad) {
            lastKnownMaxId = currentMaxId;
            isInitialLoad = false;
            return;
          }

          // On subsequent polls: only trigger toast if there is a NEW message ID greater than last known
          if (currentMaxId > lastKnownMaxId && pathname !== "/mail") {
            const newest = unread.find((m: any) => m.id === currentMaxId);
            if (newest) {
              setToastNotification({
                id: newest.id,
                subject: newest.subject,
                senderName: newest.sender?.name || "System",
              });
              setTimeout(() => {
                if (isMounted) setToastNotification(null);
              }, 6000);
            }
          }
          lastKnownMaxId = Math.max(lastKnownMaxId, currentMaxId);
        }
      } catch (err) {
        // quiet error on background poll
      }
    };

    checkMessages();
    const interval = setInterval(checkMessages, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser, pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-kumo-line bg-kumo-base px-4 py-1.5 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-85">
          <img
            src="/logo.svg"
            alt="Project Tracker Logo"
            className="h-11 w-11 object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight text-kumo-default">Project Tracker</span>
            <span className="text-[11px] leading-tight text-kumo-subtle">{subtitle}</span>
          </div>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-none hover:bg-kumo-tint focus:outline-none"
          >
            <UserAvatar
              src={currentUser?.avatarUrl}
              name={currentUser?.name}
              size={32}
              role={currentUser?.role}
              showRoleBadge={true}
            />
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-xs font-semibold text-kumo-default leading-tight">
                {currentUser?.name}
              </span>
              <span className="text-[11px] text-kumo-subtle leading-tight">
                {currentUser?.email}
              </span>
            </div>
            <CaretDown
              weight="thin"
              size={14}
              className={`text-kumo-subtle transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Backdrop Click Closer */}
          {isDropdownOpen && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsDropdownOpen(false)}
            />
          )}

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full z-40 mt-1.5 w-60 rounded-md border border-kumo-line bg-kumo-base py-1.5 shadow-lg ring ring-kumo-line">
              {/* Header Info */}
              <div className="border-b border-kumo-line px-3 py-2">
                <div className="font-semibold text-xs text-kumo-default">
                  {currentUser?.name}
                </div>
                <div className="text-[11px] text-kumo-subtle truncate">
                  {currentUser?.email}
                </div>
              </div>

              {/* Items: Profile, Mail, Settings, Sign Out */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-kumo-default hover:bg-kumo-tint transition-none"
                >
                  <User weight="thin" size={16} className="text-kumo-subtle" />
                  <span>Profile</span>
                </Link>

                <Link
                  href="/mail"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-kumo-default hover:bg-kumo-tint transition-none"
                >
                  <div className="flex items-center gap-2.5">
                    <EnvelopeSimple weight="thin" size={16} className="text-kumo-subtle" />
                    <span>Mail</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    alert("Opening Settings");
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-kumo-default hover:bg-kumo-tint transition-none"
                >
                  <Gear weight="thin" size={16} className="text-kumo-subtle" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Sign Out */}
              <div className="border-t border-kumo-line pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-none"
                >
                  <SignOut weight="thin" size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Lightweight Responsive Toast Notification for New Incoming Messages */}
      {toastNotification && (
        <aside
          role="status"
          className="fixed z-50 top-3 left-3 right-3 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-auto transition-transform duration-200 ease-out animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2.5 rounded-lg border border-kumo-line bg-kumo-base px-3.5 py-2.5 text-xs font-medium shadow-lg ring-1 ring-black/5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 shrink-0">
              <EnvelopeSimple weight="thin" size={16} />
            </div>
            <div className="flex flex-col min-w-0 pr-1 flex-1">
              <span className="font-semibold text-kumo-default truncate text-[11px] sm:text-xs">
                New message from {toastNotification.senderName}
              </span>
              <span className="text-[10px] sm:text-[11px] text-kumo-subtle truncate max-w-[200px] sm:max-w-[240px]">
                {toastNotification.subject}
              </span>
            </div>
            <Link
              href="/mail"
              onClick={() => setToastNotification(null)}
              className="rounded bg-kumo-brand px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-white hover:bg-kumo-brand/90 shrink-0"
            >
              Read
            </Link>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="text-kumo-subtle hover:text-kumo-default p-1 shrink-0"
            >
              <X weight="bold" size={12} />
            </button>
          </div>
        </aside>
      )}
    </header>
  );
};

export default AppNavbar;

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@cloudflare/kumo";
import {
  Kanban,
  SignOut,
  CaretDown,
  User,
  EnvelopeSimple,
  Gear,
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/me", { method: "POST" });
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-kumo-line bg-kumo-base px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
          <img
            src="/logo.svg"
            alt="Project Tracker Logo"
            className="h-16 w-16 object-contain shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-kumo-default">Project Tracker</span>
            <span className="text-xs text-kumo-subtle">{subtitle}</span>
          </div>
        </Link>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-none hover:bg-kumo-tint focus:outline-none"
          >
            <UserAvatar src={currentUser?.avatarUrl} name={currentUser?.name} size={32} />
            <div className="hidden flex-col text-left sm:flex">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-kumo-default leading-tight">
                  {currentUser?.name}
                </span>
                {currentUser?.role && currentUser.role !== "student" && (
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

                <a
                  href={`mailto:${currentUser?.email}`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-kumo-default hover:bg-kumo-tint transition-none"
                >
                  <EnvelopeSimple weight="thin" size={16} className="text-kumo-subtle" />
                  <span>Mail</span>
                </a>

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
    </header>
  );
};

export default AppNavbar;

"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  LayerCard,
  Table,
  Badge,
} from "@cloudflare/kumo";
import {
  LockKey,
  Users,
  GoogleLogo,
  CheckCircle,
  WarningCircle,
  Trash,
  SignOut,
  FloppyDisk,
  Key,
  Shield,
  Gear,
  Kanban,
  ChartBar,
  Database,
  ListDashes,
  UserCheck,
  UserCircle,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  provider: string;
  status: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface GoogleConfigData {
  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri: string;
  is_configured: boolean;
}

type AdminSection = "users" | "google" | "overview" | "system";

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Active section in Sidebar
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [googleConfig, setGoogleConfig] = useState<GoogleConfigData>({
    google_client_id: "",
    google_client_secret: "",
    google_redirect_uri: "http://localhost:3000/api/auth/google/callback",
    is_configured: false,
  });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Check initial PIN authorization
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/verify-pin");
        const data = await res.json();
        setIsAuthorized(Boolean(data.authorized));
        if (data.authorized) {
          loadAdminData();
        }
      } catch (err) {
        setIsAuthorized(false);
      }
    }
    checkAuth();
  }, []);

  const loadAdminData = async () => {
    try {
      const [uRes, gRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/google-config"),
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.success) setUsersList(uData.data);
      }

      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.success) setGoogleConfig(gData.data);
      }
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinLoading(true);

    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Incorrect PIN");
      }

      setIsAuthorized(true);
      loadAdminData();
    } catch (err: any) {
      setPinError(err.message || "Failed to verify PIN");
    } finally {
      setPinLoading(false);
    }
  };

  const handleLogoutAdmin = async () => {
    await fetch("/api/admin/verify-pin", { method: "DELETE" });
    setIsAuthorized(false);
    setPin("");
  };

  const handleToggleUserStatus = async (user: AdminUser) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: newStatus }),
      });
      if (res.ok) {
        setUsersList(
          usersList.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
      }
    } catch (err) {
      alert("Failed to update user status");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsersList(usersList.filter((u) => u.id !== id));
      }
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  const handleSaveGoogleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/admin/google-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_client_id: googleConfig.google_client_id,
          google_client_secret: googleConfig.google_client_secret,
          google_redirect_uri: googleConfig.google_redirect_uri,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save configuration");
      }

      setSaveMessage("Google OAuth settings updated successfully!");
      setGoogleConfig({ ...googleConfig, is_configured: true });
    } catch (err: any) {
      alert(err.message || "Error saving config");
    } finally {
      setSaveLoading(false);
    }
  };

  // 1. PIN Gateway Screen
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen w-full flex-col justify-center bg-kumo-canvas px-4 py-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-kumo-base ring ring-kumo-line text-kumo-brand">
              <LockKey weight="thin" size={28} />
            </div>
            <h1 className="text-xl font-semibold text-kumo-default">Admin access gate</h1>
            <p className="mt-1 text-sm text-kumo-subtle">
              Please enter your 6-digit administrator PIN to proceed.
            </p>
          </div>

          <LayerCard className="p-6 ring ring-kumo-line">
            {pinError && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                <WarningCircle weight="thin" size={16} />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Security PIN</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                    <Key weight="thin" size={16} />
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    className="w-full tracking-widest text-center font-mono rounded-md border border-kumo-line bg-kumo-control py-2.5 text-base text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button variant="primary" type="submit" disabled={pinLoading} className="w-full justify-center">
                <span>{pinLoading ? "Verifying..." : "Unlock console"}</span>
              </Button>
            </form>
          </LayerCard>
        </div>
      </div>
    );
  }

  // 2. Full Admin Dashboard with Sidebar Layout
  return (
    <div className="flex min-h-screen bg-kumo-canvas">
      {/* Sidebar Navigation */}
      <aside className="sticky top-0 h-screen w-64 shrink-0 flex-col justify-between border-r border-kumo-line bg-kumo-base hidden md:flex">
        <div className="flex flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center gap-3 border-b border-kumo-line px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
              <Shield weight="thin" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-kumo-default text-sm">Admin console</span>
              <span className="text-[11px] text-kumo-subtle">PIN 030347 Verified</span>
            </div>
          </div>

          {/* Navigation Section */}
          <nav className="p-3">
            <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-kumo-subtle">
              Management
            </div>
            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => setActiveSection("users")}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-none ${
                  activeSection === "users"
                    ? "bg-kumo-tint text-kumo-brand"
                    : "text-kumo-default hover:bg-kumo-tint"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users weight="thin" size={18} />
                  <span>Users directory</span>
                </div>
                <Badge variant="neutral">{usersList.length}</Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("google")}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-none ${
                  activeSection === "google"
                    ? "bg-kumo-tint text-kumo-brand"
                    : "text-kumo-default hover:bg-kumo-tint"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GoogleLogo weight="thin" size={18} />
                  <span>Google OAuth</span>
                </div>
                {googleConfig.is_configured ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="warning">Setup</Badge>
                )}
              </button>
            </div>

            <div className="mt-6 mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-kumo-subtle">
              System
            </div>
            <div className="grid gap-1">
              <button
                type="button"
                onClick={() => setActiveSection("overview")}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-none ${
                  activeSection === "overview"
                    ? "bg-kumo-tint text-kumo-brand"
                    : "text-kumo-default hover:bg-kumo-tint"
                }`}
              >
                <ChartBar weight="thin" size={18} />
                <span>Overview metrics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("system")}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-none ${
                  activeSection === "system"
                    ? "bg-kumo-tint text-kumo-brand"
                    : "text-kumo-default hover:bg-kumo-tint"
                }`}
              >
                <Database weight="thin" size={18} />
                <span>Database & security</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer with Logout */}
        <div className="border-t border-kumo-line p-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogoutAdmin}
            className="w-full justify-center"
          >
            <SignOut weight="thin" size={16} className="mr-1.5" />
            <span>Lock admin console</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Mobile Header / Quick Switcher */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-kumo-line bg-kumo-base px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white">
              <Shield weight="thin" size={16} />
            </div>
            <span className="font-semibold text-sm text-kumo-default">Admin console</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleLogoutAdmin}>
              <SignOut weight="thin" size={14} />
            </Button>
          </div>
        </header>

        {/* Mobile Horizontal Section Tabs */}
        <div className="flex overflow-x-auto border-b border-kumo-line bg-kumo-base px-2 md:hidden">
          <button
            onClick={() => setActiveSection("users")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 ${
              activeSection === "users"
                ? "border-kumo-brand text-kumo-brand"
                : "border-transparent text-kumo-subtle"
            }`}
          >
            Users ({usersList.length})
          </button>
          <button
            onClick={() => setActiveSection("google")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 ${
              activeSection === "google"
                ? "border-kumo-brand text-kumo-brand"
                : "border-transparent text-kumo-subtle"
            }`}
          >
            Google OAuth
          </button>
          <button
            onClick={() => setActiveSection("overview")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 ${
              activeSection === "overview"
                ? "border-kumo-brand text-kumo-brand"
                : "border-transparent text-kumo-subtle"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection("system")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 ${
              activeSection === "system"
                ? "border-kumo-brand text-kumo-brand"
                : "border-transparent text-kumo-subtle"
            }`}
          >
            Database
          </button>
        </div>

        {/* Page Content per Active Sidebar Item */}
        <main className="flex-1 p-6 md:p-8">
          {/* 1. USERS DIRECTORY VIEW */}
          {activeSection === "users" && (
            <div className="grid gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-kumo-default">Users directory</h1>
                  <Badge variant="neutral">{usersList.length} registered</Badge>
                </div>
                <p className="text-xs text-kumo-subtle">
                  Manage accounts, suspend access, or remove users from PostgreSQL database.
                </p>
              </div>

              <LayerCard className="overflow-hidden ring ring-kumo-line">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Name & Email</Table.Head>
                      <Table.Head>Auth method</Table.Head>
                      <Table.Head>Role</Table.Head>
                      <Table.Head>Status</Table.Head>
                      <Table.Head>Joined date</Table.Head>
                      <Table.Head className="text-right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {usersList.length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={6} className="py-12 text-center text-kumo-subtle">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <Users weight="thin" size={32} />
                            <span className="font-medium">No registered users found</span>
                            <span className="text-xs">
                              Users who register or sign in with Google will show up here.
                            </span>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      usersList.map((user) => (
                        <Table.Row key={user.id}>
                          <Table.Cell>
                            <div className="flex items-center gap-2.5">
                              <UserAvatar src={user.avatarUrl} name={user.name} size={28} />
                              <div className="flex flex-col">
                                <span className="font-medium text-kumo-default">{user.name}</span>
                                <span className="text-xs text-kumo-subtle">{user.email}</span>
                              </div>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              {user.provider === "google" ? (
                                <>
                                  <GoogleLogo weight="thin" size={14} className="text-kumo-brand" />
                                  <span>Google OAuth</span>
                                </>
                              ) : (
                                <span>Email / Password</span>
                              )}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant={user.role === "admin" ? "warning" : "neutral"}>
                              {user.role}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant={user.status === "active" ? "success" : "destructive"}>
                              {user.status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell className="text-xs text-kumo-subtle">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleToggleUserStatus(user)}
                              >
                                {user.status === "active" ? "Suspend" : "Activate"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash weight="thin" size={14} />
                              </Button>
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table>
              </LayerCard>
            </div>
          )}

          {/* 2. GOOGLE OAUTH CONFIGURATION VIEW */}
          {activeSection === "google" && (
            <div className="max-w-2xl grid gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-kumo-default">Google OAuth configuration</h1>
                  {googleConfig.is_configured ? (
                    <Badge variant="success">Configured</Badge>
                  ) : (
                    <Badge variant="warning">Missing</Badge>
                  )}
                </div>
                <p className="text-xs text-kumo-subtle">
                  Configure your Google Cloud Console credentials to enable Google Sign-In.
                </p>
              </div>

              <LayerCard className="p-6 ring ring-kumo-line">
                {saveMessage && (
                  <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400">
                    <CheckCircle weight="thin" size={16} />
                    <span>{saveMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSaveGoogleConfig} className="grid gap-4">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-kumo-default">Google Client ID</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-sm font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                      placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                      value={googleConfig.google_client_id}
                      onChange={(e) =>
                        setGoogleConfig({ ...googleConfig, google_client_id: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-kumo-default">Google Client Secret</label>
                    <input
                      type="password"
                      className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-sm font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                      placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                      value={googleConfig.google_client_secret}
                      onChange={(e) =>
                        setGoogleConfig({ ...googleConfig, google_client_secret: e.target.value })
                      }
                    />
                    <span className="text-[11px] text-kumo-subtle">
                      Encrypted and stored in PostgreSQL table <code className="font-mono text-[0.9em]">system_configs</code>.
                    </span>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-kumo-default">
                      Authorized redirect URI
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-sm font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                      value={googleConfig.google_redirect_uri}
                      onChange={(e) =>
                        setGoogleConfig({ ...googleConfig, google_redirect_uri: e.target.value })
                      }
                      required
                    />
                    <span className="text-[11px] text-kumo-subtle">
                      Paste this URL in Google Cloud Console &gt; Credentials &gt; Authorized redirect URIs.
                    </span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button variant="primary" type="submit" disabled={saveLoading}>
                      <FloppyDisk weight="thin" size={16} className="mr-1.5" />
                      <span>{saveLoading ? "Saving..." : "Save credentials"}</span>
                    </Button>
                  </div>
                </form>
              </LayerCard>
            </div>
          )}

          {/* 3. OVERVIEW METRICS VIEW */}
          {activeSection === "overview" && (
            <div className="grid gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-kumo-default">System overview</h1>
                <p className="text-xs text-kumo-subtle">
                  Summary statistics for users, authentication status, and runtime environment.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <LayerCard className="p-5 ring ring-kumo-line">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kumo-subtle">Total accounts</span>
                    <Users weight="thin" size={20} className="text-kumo-brand" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-kumo-default">
                    {usersList.length}
                  </div>
                  <div className="mt-1 text-xs text-kumo-subtle">
                    {usersList.filter((u) => u.status === "active").length} active accounts
                  </div>
                </LayerCard>

                <LayerCard className="p-5 ring ring-kumo-line">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kumo-subtle">Google OAuth</span>
                    <GoogleLogo weight="thin" size={20} className="text-kumo-brand" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-kumo-default">
                    {googleConfig.is_configured ? "Enabled" : "Disabled"}
                  </div>
                  <div className="mt-1 text-xs text-kumo-subtle">
                    {usersList.filter((u) => u.provider === "google").length} users via Google
                  </div>
                </LayerCard>

                <LayerCard className="p-5 ring ring-kumo-line">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kumo-subtle">Database Status</span>
                    <Database weight="thin" size={20} className="text-kumo-brand" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-kumo-default">Connected</div>
                  <div className="mt-1 text-xs text-kumo-subtle">PostgreSQL &bull; Drizzle ORM</div>
                </LayerCard>
              </div>
            </div>
          )}

          {/* 4. DATABASE & SECURITY VIEW */}
          {activeSection === "system" && (
            <div className="max-w-2xl grid gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-kumo-default">Database & security settings</h1>
                <p className="text-xs text-kumo-subtle">
                  Security policies, administrator gate details, and database connections.
                </p>
              </div>

              <LayerCard className="p-6 ring ring-kumo-line">
                <div className="grid gap-4">
                  <div className="flex items-start justify-between border-b border-kumo-line pb-3">
                    <div>
                      <div className="font-medium text-kumo-default">Admin PIN Protection</div>
                      <div className="text-xs text-kumo-subtle">
                        Admin route is hidden with no public links and requires PIN code 030347.
                      </div>
                    </div>
                    <Badge variant="success">Secured</Badge>
                  </div>

                  <div className="flex items-start justify-between border-b border-kumo-line pb-3">
                    <div>
                      <div className="font-medium text-kumo-default">Session JWT & Cookies</div>
                      <div className="text-xs text-kumo-subtle">
                        Sessions are signed with JOSE (HS256) and set with HttpOnly flags.
                      </div>
                    </div>
                    <Badge variant="neutral">Active</Badge>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-kumo-default">Database Dialect</div>
                      <div className="text-xs text-kumo-subtle">
                        PostgreSQL 18 via postgres-js driver and Drizzle schema migrations.
                      </div>
                    </div>
                    <Badge variant="neutral">Postgres</Badge>
                  </div>
                </div>
              </LayerCard>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

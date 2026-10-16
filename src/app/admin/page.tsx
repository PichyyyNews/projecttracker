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
  ShieldCheck,
  Users,
  GoogleLogo,
  CheckCircle,
  WarningCircle,
  Trash,
  SignOut,
  FloppyDisk,
  Key,
  Shield,
  ArrowSquareOut,
} from "@phosphor-icons/react";

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

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Admin Dashboard State
  const [activeTab, setActiveTab] = useState<"users" | "google">("users");
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

  // 2. Full Admin Dashboard (Authorized)
  return (
    <div className="flex min-h-screen flex-col bg-kumo-canvas">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-kumo-line bg-kumo-base px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
              <Shield weight="thin" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-kumo-default">Admin console</span>
              <span className="text-xs text-kumo-subtle">PIN Verified &bull; Secret path</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleLogoutAdmin}>
              <SignOut weight="thin" size={16} className="mr-1" />
              <span>Lock console</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Navigation Tabs */}
        <div className="mb-6 flex border-b border-kumo-line">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
              activeTab === "users"
                ? "border-kumo-brand text-kumo-brand"
                : "border-transparent text-kumo-subtle hover:text-kumo-default"
            }`}
          >
            <Users weight="thin" size={18} />
            <span>User management</span>
            <Badge variant="neutral">{usersList.length}</Badge>
          </button>
          <button
            onClick={() => setActiveTab("google")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
              activeTab === "google"
                ? "border-kumo-brand text-kumo-brand"
                : "border-transparent text-kumo-subtle hover:text-kumo-default"
            }`}
          >
            <GoogleLogo weight="thin" size={18} />
            <span>Google OAuth configuration</span>
            {googleConfig.is_configured ? (
              <Badge variant="success">Configured</Badge>
            ) : (
              <Badge variant="warning">Missing</Badge>
            )}
          </button>
        </div>

        {/* Tab 1: User Management */}
        {activeTab === "users" && (
          <div className="grid gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold text-kumo-default">Registered users</h2>
              <p className="text-xs text-kumo-subtle">
                Review all registered accounts, change status, or remove users.
              </p>
            </div>

            <LayerCard className="overflow-hidden ring ring-kumo-line">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Name & Email</Table.Head>
                    <Table.Head>Provider</Table.Head>
                    <Table.Head>Role</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Joined</Table.Head>
                    <Table.Head className="text-right">Actions</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {usersList.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={6} className="py-8 text-center text-kumo-subtle">
                        No registered users found in database.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    usersList.map((user) => (
                      <Table.Row key={user.id}>
                        <Table.Cell>
                          <div className="flex flex-col">
                            <span className="font-medium text-kumo-default">{user.name}</span>
                            <span className="text-xs text-kumo-subtle">{user.email}</span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="inline-flex items-center gap-1 text-xs">
                            {user.provider === "google" ? (
                              <>
                                <GoogleLogo weight="thin" size={14} className="text-kumo-brand" />
                                <span>Google</span>
                              </>
                            ) : (
                              <span>Credentials</span>
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

        {/* Tab 2: Google OAuth Config */}
        {activeTab === "google" && (
          <div className="max-w-2xl">
            <LayerCard className="p-6 ring ring-kumo-line">
              <div className="mb-6 grid gap-1">
                <div className="flex items-center gap-2">
                  <GoogleLogo weight="thin" size={22} className="text-kumo-brand" />
                  <h2 className="text-base font-semibold text-kumo-default">
                    Google OAuth 2.0 credentials
                  </h2>
                </div>
                <p className="text-xs text-kumo-subtle">
                  Configure Client ID and Client Secret from your Google Cloud Console to enable
                  Google Sign-In.
                </p>
              </div>

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
                    Stored securely in your PostgreSQL database.
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
                    Copy and paste this URI into your Google Cloud Credentials &gt; Authorized redirect URIs.
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
      </main>
    </div>
  );
}

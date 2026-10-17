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
  ChartBar,
  Database,
  UserCircle,
  GraduationCap,
  CloudArrowUp,
  Plus,
  Lifebuoy,
  EnvelopeSimple,
  Check,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import { USER_ROLES, ROLE_OPTIONS, UserRole } from "@/lib/roles";

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

interface MinioConfigData {
  minio_endpoint: string;
  minio_port: string;
  minio_use_ssl: boolean;
  minio_access_key: string;
  minio_secret_key: string;
  minio_bucket: string;
  minio_public_url: string;
}

interface DepartmentItem {
  id: number;
  name: string;
}

interface AcademicClassItem {
  id: number;
  yearLevel: string;
  studyGroup: string;
  major: string;
}

interface TicketItem {
  id: number;
  senderId: number | null;
  receiverId: number | null;
  subject: string;
  content: string;
  type: string;
  status: string;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    email: string;
    role: string;
    studentId?: string;
  };
}

type AdminSection = "users" | "tickets" | "academic" | "minio" | "google" | "overview" | "system";

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Active section in Sidebar
  const [activeSection, setActiveSection] = useState<AdminSection>("users");
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [ticketsList, setTicketsList] = useState<TicketItem[]>([]);
  const [googleConfig, setGoogleConfig] = useState<GoogleConfigData>({
    google_client_id: "",
    google_client_secret: "",
    google_redirect_uri: "http://localhost:3000/api/auth/google/callback",
    is_configured: false,
  });
  const [minioConfig, setMinioConfig] = useState<MinioConfigData>({
    minio_endpoint: "localhost",
    minio_port: "9000",
    minio_use_ssl: false,
    minio_access_key: "minioadmin",
    minio_secret_key: "",
    minio_bucket: "avatars",
    minio_public_url: "http://localhost:9000/avatars",
  });

  // Academic Management State
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [academicClassesList, setAcademicClassesList] = useState<AcademicClassItem[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [newClassYear, setNewClassYear] = useState("ปวส ปี 1");
  const [newClassGroup, setNewClassGroup] = useState("1");
  const [newClassMajor, setNewClassMajor] = useState("");

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Ticket Management State
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [ticketActionLoading, setTicketActionLoading] = useState(false);

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
      const [uRes, gRes, mRes, aRes, tRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/google-config"),
        fetch("/api/admin/minio-config"),
        fetch("/api/admin/academic"),
        fetch("/api/admin/tickets"),
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.success) setUsersList(uData.data);
      }

      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.success) setGoogleConfig(gData.data);
      }

      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.success) setMinioConfig(mData.data);
      }

      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.success) {
          setDepartmentsList(aData.departments);
          setAcademicClassesList(aData.academicClasses);
        }
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData.success) setTicketsList(tData.data);
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

  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        setUsersList(
          usersList.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      alert("Failed to update user role");
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

  // Ticket Handlers
  const handleUpdateTicketStatus = async (ticketId: number, status: string) => {
    setTicketActionLoading(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      if (res.ok) {
        setTicketsList((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
        );
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status });
        }
      }
    } catch (err) {
      alert("Failed to update ticket status");
    } finally {
      setTicketActionLoading(false);
    }
  };

  const handleReplyToTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim()) return;

    setTicketActionLoading(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedTicket.senderId,
          subject: selectedTicket.subject.startsWith("Re:") ? selectedTicket.subject : `Re: ${selectedTicket.subject}`,
          content: ticketReplyText.trim(),
          parentId: selectedTicket.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Also auto-resolve or mark as answered
        await handleUpdateTicketStatus(selectedTicket.id, "resolved");
        setTicketReplyText("");
        alert("Reply sent to user successfully!");
      } else {
        alert(data.error || "Failed to send reply");
      }
    } catch (err) {
      alert("Error sending ticket reply");
    } finally {
      setTicketActionLoading(false);
    }
  };

  // Academic Handlers
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const res = await fetch("/api/admin/academic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "department", name: newDeptName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDepartmentsList([...departmentsList, data.data]);
        setNewDeptName("");
      } else {
        alert(data.error || "Failed to add department");
      }
    } catch (err) {
      alert("Error adding department");
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!confirm("Delete this department?")) return;
    try {
      const res = await fetch(`/api/admin/academic?type=department&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDepartmentsList(departmentsList.filter((d) => d.id !== id));
      }
    } catch (err) {
      alert("Error deleting department");
    }
  };

  const handleAddAcademicClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassMajor.trim()) return;

    try {
      const res = await fetch("/api/admin/academic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "academic_class",
          yearLevel: newClassYear,
          studyGroup: newClassGroup,
          major: newClassMajor.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAcademicClassesList([...academicClassesList, data.data]);
        setNewClassMajor("");
      } else {
        alert(data.error || "Failed to add academic class");
      }
    } catch (err) {
      alert("Error adding class");
    }
  };

  const handleDeleteAcademicClass = async (id: number) => {
    if (!confirm("Delete this class group?")) return;
    try {
      const res = await fetch(`/api/admin/academic?type=academic_class&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAcademicClassesList(academicClassesList.filter((c) => c.id !== id));
      }
    } catch (err) {
      alert("Error deleting class");
    }
  };

  // Save MinIO Config
  const handleSaveMinioConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/admin/minio-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(minioConfig),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save");

      setSaveMessage("MinIO Object Storage settings updated successfully!");
    } catch (err: any) {
      alert(err.message || "Error saving MinIO config");
    } finally {
      setSaveLoading(false);
    }
  };

  // Save Google Config
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
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save");

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
                onClick={() => { setActiveSection("users"); setSaveMessage(null); }}
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
                onClick={() => { setActiveSection("tickets"); setSaveMessage(null); }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-none ${
                  activeSection === "tickets"
                    ? "bg-kumo-tint text-kumo-brand"
                    : "text-kumo-default hover:bg-kumo-tint"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Lifebuoy weight="thin" size={18} />
                  <span>Support tickets</span>
                </div>
                {ticketsList.filter((t) => t.status === "unread").length > 0 ? (
                  <Badge variant="warning">{ticketsList.filter((t) => t.status === "unread").length}</Badge>
                ) : (
                  <Badge variant="neutral">{ticketsList.length}</Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setActiveSection("academic"); setSaveMessage(null); }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-none ${
                  activeSection === "academic"
                    ? "bg-kumo-tint text-kumo-brand"
                    : "text-kumo-default hover:bg-kumo-tint"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap weight="thin" size={18} />
                  <span>Academic & Classes</span>
                </div>
                <Badge variant="neutral">{academicClassesList.length}</Badge>
              </button>

              <button
                type="button"
                onClick={() => { setActiveSection("minio"); setSaveMessage(null); }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-none ${
                  activeSection === "minio"
                    ? "bg-kumo-tint text-kumo-brand"
                    : "text-kumo-default hover:bg-kumo-tint"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CloudArrowUp weight="thin" size={18} />
                  <span>MinIO Storage</span>
                </div>
                <Badge variant="info">Storage</Badge>
              </button>

              <button
                type="button"
                onClick={() => { setActiveSection("google"); setSaveMessage(null); }}
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
                onClick={() => { setActiveSection("overview"); setSaveMessage(null); }}
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
                onClick={() => { setActiveSection("system"); setSaveMessage(null); }}
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
              activeSection === "users" ? "border-kumo-brand text-kumo-brand" : "border-transparent text-kumo-subtle"
            }`}
          >
            Users ({usersList.length})
          </button>
          <button
            onClick={() => setActiveSection("tickets")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1.5 ${
              activeSection === "tickets" ? "border-kumo-brand text-kumo-brand" : "border-transparent text-kumo-subtle"
            }`}
          >
            <span>Tickets</span>
            {ticketsList.filter((t) => t.status === "unread").length > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] text-white font-bold">
                {ticketsList.filter((t) => t.status === "unread").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection("academic")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 ${
              activeSection === "academic" ? "border-kumo-brand text-kumo-brand" : "border-transparent text-kumo-subtle"
            }`}
          >
            Academic ({academicClassesList.length})
          </button>
          <button
            onClick={() => setActiveSection("minio")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 ${
              activeSection === "minio" ? "border-kumo-brand text-kumo-brand" : "border-transparent text-kumo-subtle"
            }`}
          >
            MinIO
          </button>
          <button
            onClick={() => setActiveSection("google")}
            className={`whitespace-nowrap px-3 py-2 text-xs font-medium border-b-2 ${
              activeSection === "google" ? "border-kumo-brand text-kumo-brand" : "border-transparent text-kumo-subtle"
            }`}
          >
            Google OAuth
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
                  Manage accounts, roles, suspend access, or remove users from PostgreSQL database.
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
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                              className="rounded border border-kumo-line bg-kumo-control px-2 py-1 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                            >
                              {ROLE_OPTIONS.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
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

          {/* 1.5 SUPPORT TICKETS VIEW (System Replies & Support) */}
          {activeSection === "tickets" && (
            <div className="grid gap-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-kumo-default">Support tickets & system replies</h1>
                  <p className="text-xs text-kumo-subtle">
                    User replies to system notifications and inquiries automatically routed here.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">Total: {ticketsList.length}</Badge>
                  <Badge variant={ticketsList.filter((t) => t.status === "unread").length > 0 ? "destructive" : "success"}>
                    Unread: {ticketsList.filter((t) => t.status === "unread").length}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Tickets List */}
                <div className="lg:col-span-7">
                  <LayerCard className="p-0 ring ring-kumo-line rounded-lg bg-kumo-base overflow-hidden">
                    <Table>
                      <Table.Header>
                        <Table.Row>
                          <Table.Head>Sender</Table.Head>
                          <Table.Head>Subject & preview</Table.Head>
                          <Table.Head>Status</Table.Head>
                          <Table.Head className="text-right">Action</Table.Head>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {ticketsList.length === 0 ? (
                          <Table.Row>
                            <Table.Cell colSpan={4} className="text-center py-10 text-xs text-kumo-subtle">
                              No support tickets or system replies found.
                            </Table.Cell>
                          </Table.Row>
                        ) : (
                          ticketsList.map((ticket) => {
                            const isSelected = selectedTicket?.id === ticket.id;
                            const isUnread = ticket.status === "unread";
                            return (
                              <Table.Row
                                key={ticket.id}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? "bg-kumo-control/60" : "hover:bg-kumo-control/30"
                                } ${isUnread ? "font-medium" : ""}`}
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  if (isUnread) {
                                    handleUpdateTicketStatus(ticket.id, "read");
                                  }
                                }}
                              >
                                <Table.Cell>
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-kumo-brand/10 text-kumo-brand text-xs font-semibold">
                                      {ticket.sender?.name?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-medium text-kumo-default truncate max-w-[120px]">
                                        {ticket.sender?.name || "User"}
                                      </div>
                                      <div className="text-[10px] text-kumo-subtle truncate max-w-[120px]">
                                        {ticket.sender?.role || "user"}
                                      </div>
                                    </div>
                                  </div>
                                </Table.Cell>

                                <Table.Cell>
                                  <div className="min-w-0 max-w-[200px] sm:max-w-[260px]">
                                    <div className="text-xs text-kumo-default truncate flex items-center gap-1.5">
                                      {ticket.type === "system" && (
                                        <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] text-amber-600 font-medium">
                                          System
                                        </span>
                                      )}
                                      <span className="truncate">{ticket.subject}</span>
                                    </div>
                                    <div className="text-[11px] text-kumo-subtle truncate mt-0.5">
                                      {ticket.content}
                                    </div>
                                  </div>
                                </Table.Cell>

                                <Table.Cell>
                                  <Badge
                                    variant={
                                      ticket.status === "unread"
                                        ? "destructive"
                                        : ticket.status === "resolved"
                                        ? "success"
                                        : "neutral"
                                    }
                                  >
                                    {ticket.status}
                                  </Badge>
                                </Table.Cell>

                                <Table.Cell className="text-right">
                                  <span className="text-[11px] text-kumo-subtle">
                                    {new Date(ticket.createdAt).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })
                        )}
                      </Table.Body>
                    </Table>
                  </LayerCard>
                </div>

                {/* Ticket Detail / Reply Panel */}
                <div className="lg:col-span-5">
                  {selectedTicket ? (
                    <LayerCard className="p-5 ring ring-kumo-line rounded-lg bg-kumo-base sticky top-4 flex flex-col gap-4">
                      <div className="flex items-start justify-between border-b border-kumo-line pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-kumo-subtle">#{selectedTicket.id}</span>
                            <Badge
                              variant={
                                selectedTicket.status === "unread"
                                  ? "destructive"
                                  : selectedTicket.status === "resolved"
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {selectedTicket.status}
                            </Badge>
                          </div>
                          <h2 className="text-sm font-semibold text-kumo-default mt-1">
                            {selectedTicket.subject}
                          </h2>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {selectedTicket.status !== "resolved" ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={ticketActionLoading}
                              onClick={() => handleUpdateTicketStatus(selectedTicket.id, "resolved")}
                            >
                              <Check weight="thin" size={14} className="mr-1 text-emerald-600" />
                              <span>Resolve</span>
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={ticketActionLoading}
                              onClick={() => handleUpdateTicketStatus(selectedTicket.id, "read")}
                            >
                              <span>Reopen</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Sender Info */}
                      <div className="rounded border border-kumo-line bg-kumo-control/30 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-kumo-subtle">From:</span>
                          <span className="font-medium text-kumo-default">
                            {selectedTicket.sender?.name} ({selectedTicket.sender?.email})
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-kumo-subtle">Role:</span>
                          <span className="capitalize text-kumo-default">{selectedTicket.sender?.role || "User"}</span>
                        </div>
                        {selectedTicket.sender?.studentId && (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-kumo-subtle">Student ID:</span>
                            <span className="font-mono text-kumo-default">{selectedTicket.sender.studentId}</span>
                          </div>
                        )}
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-kumo-subtle">Received:</span>
                          <span className="text-kumo-subtle">
                            {new Date(selectedTicket.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Message Content */}
                      <div className="rounded border border-kumo-line bg-kumo-base p-4 text-xs leading-relaxed text-kumo-default whitespace-pre-wrap">
                        {selectedTicket.content}
                      </div>

                      {/* Reply form */}
                      <form onSubmit={handleReplyToTicket} className="grid gap-2 border-t border-kumo-line pt-3">
                        <label className="text-xs font-medium text-kumo-default">
                          Reply to user (will be delivered as system notification)
                        </label>
                        <textarea
                          rows={3}
                          className="w-full rounded border border-kumo-line bg-kumo-control p-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                          placeholder="Write reply here..."
                          value={ticketReplyText}
                          onChange={(e) => setTicketReplyText(e.target.value)}
                          required
                        />
                        <div className="flex justify-end">
                          <Button variant="primary" size="sm" type="submit" disabled={ticketActionLoading}>
                            <EnvelopeSimple weight="thin" size={14} className="mr-1.5" />
                            <span>{ticketActionLoading ? "Sending..." : "Send reply & resolve"}</span>
                          </Button>
                        </div>
                      </form>
                    </LayerCard>
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-kumo-line p-6 text-center text-xs text-kumo-subtle">
                      <Lifebuoy weight="thin" size={32} className="mb-2 text-kumo-subtle" />
                      Select a ticket from the list to view details and send a reply.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. ACADEMIC & CLASS GROUPS MANAGEMENT VIEW */}
          {activeSection === "academic" && (
            <div className="grid gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-kumo-default">
                  Academic & class groups management
                </h1>
                <p className="text-xs text-kumo-subtle">
                  Add, edit, or remove Departments, Year Levels, and Class Groups for student registration.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Departments Card */}
                <LayerCard className="p-5 ring ring-kumo-line rounded-lg bg-kumo-base">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-kumo-default">Departments (แผนกวิชา)</h2>
                      <p className="text-xs text-kumo-subtle">
                        {departmentsList.length} departments available
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddDepartment} className="mb-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add new department name..."
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      required
                      className="flex-1 rounded border border-kumo-line bg-kumo-control py-1 px-2.5 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                    />
                    <Button variant="primary" size="sm" type="submit">
                      <Plus weight="thin" size={14} className="mr-1" />
                      <span>Add</span>
                    </Button>
                  </form>

                  <div className="divide-y divide-kumo-line rounded border border-kumo-line">
                    {departmentsList.map((dept) => (
                      <div key={dept.id} className="flex items-center justify-between p-2.5 text-xs">
                        <span className="font-medium text-kumo-default">{dept.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDepartment(dept.id)}
                        >
                          <Trash weight="thin" size={14} className="text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </LayerCard>

                {/* Add Academic Class Form */}
                <LayerCard className="p-5 ring ring-kumo-line rounded-lg bg-kumo-base">
                  <h2 className="mb-1 text-sm font-semibold text-kumo-default">
                    Add new class group (เพิ่มชั้นปี/กลุ่ม/สาขา)
                  </h2>
                  <p className="mb-4 text-xs text-kumo-subtle">
                    Creates an option in the student profile registration dropdown.
                  </p>

                  <form onSubmit={handleAddAcademicClass} className="grid gap-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-kumo-default">Year Level (ชั้นปี)</label>
                        <select
                          value={newClassYear}
                          onChange={(e) => setNewClassYear(e.target.value)}
                          className="rounded border border-kumo-line bg-kumo-control py-1 px-2 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                        >
                          <option value="ปวส ปี 1">ปวส ปี 1</option>
                          <option value="ปวส ปี 2">ปวส ปี 2</option>
                          <option value="ปวช ปี 1">ปวช ปี 1</option>
                          <option value="ปวช ปี 2">ปวช ปี 2</option>
                          <option value="ปวช ปี 3">ปวช ปี 3</option>
                        </select>
                      </div>

                      <div className="grid gap-1">
                        <label className="text-xs font-medium text-kumo-default">Group (กลุ่มเรียน)</label>
                        <input
                          type="text"
                          placeholder="e.g. 1, 2, 3"
                          value={newClassGroup}
                          onChange={(e) => setNewClassGroup(e.target.value)}
                          required
                          className="rounded border border-kumo-line bg-kumo-control py-1 px-2 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-kumo-default">Major Name (สาขาวิชา)</label>
                      <input
                        type="text"
                        placeholder="e.g. เทคโนโลยีคอมพิวเตอร์ (สทค)"
                        value={newClassMajor}
                        onChange={(e) => setNewClassMajor(e.target.value)}
                        required
                        className="rounded border border-kumo-line bg-kumo-control py-1 px-2 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                      />
                    </div>

                    <div className="mt-1 flex justify-end">
                      <Button variant="primary" size="sm" type="submit">
                        <Plus weight="thin" size={14} className="mr-1" />
                        <span>Create class group</span>
                      </Button>
                    </div>
                  </form>
                </LayerCard>
              </div>

              {/* Full Academic Classes Table */}
              <LayerCard className="overflow-hidden ring ring-kumo-line rounded-lg bg-kumo-base">
                <div className="border-b border-kumo-line px-5 py-3">
                  <h3 className="font-semibold text-xs text-kumo-default">
                    Current class groups ({academicClassesList.length} options active)
                  </h3>
                </div>
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>ชั้นปี</Table.Head>
                      <Table.Head>กลุ่ม</Table.Head>
                      <Table.Head>สาขาวิชา</Table.Head>
                      <Table.Head className="text-right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {academicClassesList.map((item) => (
                      <Table.Row key={item.id}>
                        <Table.Cell className="font-medium text-kumo-default">
                          {item.yearLevel}
                        </Table.Cell>
                        <Table.Cell>กลุ่ม {item.studyGroup}</Table.Cell>
                        <Table.Cell>{item.major}</Table.Cell>
                        <Table.Cell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAcademicClass(item.id)}
                          >
                            <Trash weight="thin" size={14} className="text-red-500" />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </LayerCard>
            </div>
          )}

          {/* 3. MINIO STORAGE CONFIGURATION VIEW */}
          {activeSection === "minio" && (
            <div className="max-w-2xl grid gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CloudArrowUp weight="thin" size={22} className="text-kumo-brand" />
                  <h1 className="text-xl font-semibold text-kumo-default">MinIO object storage settings</h1>
                </div>
                <p className="text-xs text-kumo-subtle">
                  Configure self-hosted MinIO credentials for storing uploaded profile pictures and avatars.
                </p>
              </div>

              <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
                {saveMessage && (
                  <div className="mb-4 flex items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400">
                    <CheckCircle weight="thin" size={16} />
                    <span>{saveMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSaveMinioConfig} className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-kumo-default">MinIO Endpoint</label>
                      <input
                        type="text"
                        placeholder="localhost or minio.yourdomain.com"
                        value={minioConfig.minio_endpoint}
                        onChange={(e) => setMinioConfig({ ...minioConfig, minio_endpoint: e.target.value })}
                        required
                        className="rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs font-mono text-kumo-default focus:border-kumo-brand focus:outline-none"
                      />
                    </div>

                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-kumo-default">Port</label>
                      <input
                        type="number"
                        placeholder="9000"
                        value={minioConfig.minio_port}
                        onChange={(e) => setMinioConfig({ ...minioConfig, minio_port: e.target.value })}
                        required
                        className="rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs font-mono text-kumo-default focus:border-kumo-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-kumo-default">Access Key</label>
                      <input
                        type="text"
                        placeholder="minioadmin"
                        value={minioConfig.minio_access_key}
                        onChange={(e) => setMinioConfig({ ...minioConfig, minio_access_key: e.target.value })}
                        required
                        className="rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs font-mono text-kumo-default focus:border-kumo-brand focus:outline-none"
                      />
                    </div>

                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-kumo-default">Secret Key</label>
                      <input
                        type="password"
                        placeholder="minioadmin or secret"
                        value={minioConfig.minio_secret_key}
                        onChange={(e) => setMinioConfig({ ...minioConfig, minio_secret_key: e.target.value })}
                        className="rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs font-mono text-kumo-default focus:border-kumo-brand focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-kumo-default">Bucket Name</label>
                      <input
                        type="text"
                        placeholder="avatars"
                        value={minioConfig.minio_bucket}
                        onChange={(e) => setMinioConfig({ ...minioConfig, minio_bucket: e.target.value })}
                        required
                        className="rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs font-mono text-kumo-default focus:border-kumo-brand focus:outline-none"
                      />
                    </div>

                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-kumo-default">Use SSL / HTTPS</label>
                      <select
                        value={minioConfig.minio_use_ssl ? "true" : "false"}
                        onChange={(e) => setMinioConfig({ ...minioConfig, minio_use_ssl: e.target.value === "true" })}
                        className="rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                      >
                        <option value="false">HTTP (No SSL - Port 9000)</option>
                        <option value="true">HTTPS (SSL - Port 443)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-kumo-default">Public Image Base URL</label>
                    <input
                      type="text"
                      placeholder="http://localhost:9000/avatars"
                      value={minioConfig.minio_public_url}
                      onChange={(e) => setMinioConfig({ ...minioConfig, minio_public_url: e.target.value })}
                      required
                      className="rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs font-mono text-kumo-default focus:border-kumo-brand focus:outline-none"
                    />
                    <span className="text-[11px] text-kumo-subtle">
                      The public URL format used by web browsers to load uploaded avatar images.
                    </span>
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button variant="primary" type="submit" disabled={saveLoading}>
                      <FloppyDisk weight="thin" size={16} className="mr-1.5" />
                      <span>{saveLoading ? "Saving..." : "Save MinIO configuration"}</span>
                    </Button>
                  </div>
                </form>
              </LayerCard>
            </div>
          )}

          {/* 4. GOOGLE OAUTH CONFIGURATION VIEW */}
          {activeSection === "google" && (
            <div className="max-w-2xl grid gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <GoogleLogo weight="thin" size={22} className="text-kumo-brand" />
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

              <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
                {saveMessage && (
                  <div className="mb-4 flex items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400">
                    <CheckCircle weight="thin" size={16} />
                    <span>{saveMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSaveGoogleConfig} className="grid gap-4">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-kumo-default">Google Client ID</label>
                    <input
                      type="text"
                      className="w-full rounded border border-kumo-line bg-kumo-control py-2 px-3 text-sm font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
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
                      className="w-full rounded border border-kumo-line bg-kumo-control py-2 px-3 text-sm font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
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
                      className="w-full rounded border border-kumo-line bg-kumo-control py-2 px-3 text-sm font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                      value={googleConfig.google_redirect_uri}
                      onChange={(e) =>
                        setGoogleConfig({ ...googleConfig, google_redirect_uri: e.target.value })
                      }
                      required
                    />
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

          {/* 5. OVERVIEW METRICS VIEW */}
          {activeSection === "overview" && (
            <div className="grid gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-kumo-default">System overview</h1>
                <p className="text-xs text-kumo-subtle">
                  Summary statistics for users, academic classes, storage, and database.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <LayerCard className="p-5 ring ring-kumo-line rounded-lg bg-kumo-base">
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

                <LayerCard className="p-5 ring ring-kumo-line rounded-lg bg-kumo-base">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kumo-subtle">Class groups</span>
                    <GraduationCap weight="thin" size={20} className="text-kumo-brand" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-kumo-default">
                    {academicClassesList.length}
                  </div>
                  <div className="mt-1 text-xs text-kumo-subtle">
                    {departmentsList.length} academic departments
                  </div>
                </LayerCard>

                <LayerCard className="p-5 ring ring-kumo-line rounded-lg bg-kumo-base">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kumo-subtle">Database Status</span>
                    <Database weight="thin" size={20} className="text-kumo-brand" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-kumo-default">Connected</div>
                  <div className="mt-1 text-xs text-kumo-subtle">PostgreSQL &bull; MinIO Storage</div>
                </LayerCard>
              </div>
            </div>
          )}

          {/* 6. DATABASE & SECURITY VIEW */}
          {activeSection === "system" && (
            <div className="max-w-2xl grid gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold text-kumo-default">Database & security settings</h1>
                <p className="text-xs text-kumo-subtle">
                  Security policies, administrator gate details, and database connections.
                </p>
              </div>

              <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
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
                        Sessions are signed with JOSE (HS256) and set with 30-day HttpOnly flags.
                      </div>
                    </div>
                    <Badge variant="neutral">Active</Badge>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-kumo-default">Storage Layer</div>
                      <div className="text-xs text-kumo-subtle">
                        PostgreSQL for relational models + MinIO for user uploaded avatars.
                      </div>
                    </div>
                    <Badge variant="neutral">Connected</Badge>
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

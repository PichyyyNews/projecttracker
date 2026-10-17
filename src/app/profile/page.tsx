"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  LayerCard,
  Badge,
} from "@cloudflare/kumo";
import {
  ArrowLeft,
  User,
  IdentificationCard,
  Phone,
  CheckCircle,
  WarningCircle,
  FloppyDisk,
  Camera,
  SpinnerGap,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import AppNavbar from "@/components/AppNavbar";
import { USER_ROLES, UserRole } from "@/lib/roles";

interface UserProfileData {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  studentId: string | null;
  phone: string | null;
  department: string | null;
  major: string | null;
  yearLevel: string | null;
  studyGroup: string | null;
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

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Name edit modal state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempName, setTempName] = useState("");

  // Delete avatar confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Dynamic Options from Database
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [academicClassesList, setAcademicClassesList] = useState<AcademicClassItem[]>([]);

  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    studentId: "",
    phone: "",
    department: "",
    selectedAcademicIndex: 0,
    avatarUrl: "",
    role: "student",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, acRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/admin/academic"),
        ]);

        const meData = await meRes.json();
        if (!meData.authenticated || !meData.user) {
          router.replace("/login");
          return;
        }

        const user: UserProfileData = meData.user;
        setCurrentUser(user);
        let depts: DepartmentItem[] = [];
        let classes: AcademicClassItem[] = [];

        if (acRes.ok) {
          const acData = await acRes.json();
          if (acData.success) {
            depts = acData.departments;
            classes = acData.academicClasses;
            setDepartmentsList(depts);
            setAcademicClassesList(classes);
          }
        }

        let academicIdx = classes.findIndex(
          (ag) =>
            ag.yearLevel === user.yearLevel &&
            ag.studyGroup === user.studyGroup &&
            ag.major === user.major
        );
        if (academicIdx === -1) academicIdx = 0;

        setFormData({
          name: user.name || "",
          email: user.email || "",
          studentId: user.studentId || "",
          phone: user.phone || "",
          department: user.department || (depts[0]?.name || ""),
          selectedAcademicIndex: academicIdx,
          avatarUrl: user.avatarUrl || "",
          role: user.role || "student",
        });
      } catch (err: any) {
        setError(err.message || "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Handle Image Upload to MinIO
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/auth/upload-avatar", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload avatar to MinIO");
      }

      setFormData((prev) => ({ ...prev, avatarUrl: data.url }));
      setCurrentUser((prev) => prev ? { ...prev, avatarUrl: data.url } : null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error uploading image to MinIO");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAvatar = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: "" }));
    setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: null } : null));
    setIsDeleteModalOpen(false);
  };

  const handleOpenNameModal = () => {
    setTempName(formData.name);
    setIsNameModalOpen(true);
  };

  const handleSaveNameModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setFormData((prev) => ({ ...prev, name: tempName.trim() }));
      setCurrentUser((prev) => prev ? { ...prev, name: tempName.trim() } : null);
    }
    setIsNameModalOpen(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    const chosenGroup = academicClassesList[formData.selectedAcademicIndex];

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          studentId: formData.studentId,
          phone: formData.phone,
          department: formData.department,
          yearLevel: chosenGroup ? chosenGroup.yearLevel : null,
          studyGroup: chosenGroup ? chosenGroup.studyGroup : null,
          major: chosenGroup ? chosenGroup.major : null,
          avatarUrl: formData.avatarUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kumo-canvas">
        <span className="text-xs text-kumo-subtle">Loading profile...</span>
      </div>
    );
  }

  const selectedAcademic = academicClassesList[formData.selectedAcademicIndex];

  return (
    <div className="min-h-screen bg-kumo-canvas">
      {/* Top Navbar matching Workspace Navbar */}
      <AppNavbar currentUser={currentUser} />

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <LayerCard className="p-8 ring ring-kumo-line rounded-xl bg-kumo-base shadow-sm">
            {/* Header: Clickable Avatar on left, Large Name & Email on right */}
            <div className="flex items-center gap-6 pb-8 border-b border-kumo-line">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Clickable Avatar with sleek hover overlay & mobile action buttons */}
              <div className="relative shrink-0">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                  title="Click to change photo"
                >
                  <UserAvatar
                    src={formData.avatarUrl || null}
                    name={formData.name}
                    size={84}
                    className="ring-2 ring-kumo-line rounded-full"
                  />

                  {/* Desktop Hover Overlay */}
                  <div className="absolute inset-0 hidden sm:flex flex-col items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    {uploading ? (
                      <SpinnerGap weight="thin" size={26} className="animate-spin" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Camera weight="thin" size={22} />
                        {formData.avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            title="Remove photo"
                            className="p-1 hover:text-red-400 transition-colors"
                          >
                            <Trash weight="thin" size={18} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile-friendly action buttons: Split Left (Light Blue) & Right (Light Red) */}
                <div className="sm:hidden">
                  {/* Left: Change Photo (Light Blue) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change photo"
                    className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 border border-blue-300 ring-2 ring-white shadow-sm transition-transform active:scale-95"
                  >
                    {uploading ? (
                      <SpinnerGap weight="bold" size={14} className="animate-spin text-blue-600" />
                    ) : (
                      <Camera weight="bold" size={14} />
                    )}
                  </button>

                  {/* Right: Delete Photo (Light Red) */}
                  {formData.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      title="Remove photo"
                      className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 border border-red-300 ring-2 ring-white shadow-sm transition-transform active:scale-95"
                    >
                      <Trash weight="bold" size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Name & Email block */}
              <div className="flex flex-col gap-1 min-w-0">
                <div
                  onClick={handleOpenNameModal}
                  className="group inline-flex items-center gap-2 cursor-pointer select-none"
                  title="Click to edit name"
                >
                  <h2 className="text-xl font-semibold text-kumo-default truncate group-hover:text-kumo-brand transition-colors">
                    {formData.name || "Add your name"}
                  </h2>
                  <PencilSimple
                    weight="thin"
                    size={16}
                    className="text-kumo-subtle opacity-0 group-hover:opacity-100 group-hover:text-kumo-brand transition-opacity"
                  />
                </div>
                <p className="text-xs text-kumo-subtle truncate">
                  {formData.email}
                </p>
              </div>
            </div>

            {/* Form Fields: Remaining 4 Clean Inputs (Student ID, Phone, Department, Class & Group) */}
            <div className="pt-8 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-kumo-default">Student ID</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                      <IdentificationCard weight="thin" size={16} />
                    </div>
                    <input
                      type="text"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 pl-9 pr-3 text-xs font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                      placeholder="663090100xx"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-kumo-default">Phone</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                      <Phone weight="thin" size={16} />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 pl-9 pr-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                      placeholder="08x-xxx-xxxx"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-kumo-default">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                  >
                    {departmentsList.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-kumo-default">Class & Group</label>
                  <select
                    value={formData.selectedAcademicIndex}
                    onChange={(e) =>
                      setFormData({ ...formData, selectedAcademicIndex: parseInt(e.target.value, 10) })
                    }
                    className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none font-medium truncate"
                  >
                    {academicClassesList.map((ag, idx) => (
                      <option key={ag.id} value={idx}>
                        {ag.yearLevel} - กลุ่ม {ag.studyGroup} : {ag.major}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Actions inside the Card */}
            <div className="mt-8 pt-6 border-t border-kumo-line flex items-center justify-end gap-3">
              <Link href="/">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" type="submit" disabled={saving || uploading}>
                <FloppyDisk weight="thin" size={16} className="mr-1.5" />
                <span>{saving ? "Saving changes..." : "Save profile"}</span>
              </Button>
            </div>
          </LayerCard>
        </form>
      </main>

      {/* Edit Name Modal */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-kumo-line bg-kumo-base p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-kumo-default">Edit full name</h3>
              <button
                type="button"
                onClick={() => setIsNameModalOpen(false)}
                className="text-kumo-subtle hover:text-kumo-default transition-colors"
              >
                <X weight="thin" size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNameModal} className="space-y-4">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Name</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                    <User weight="thin" size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 pl-9 pr-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                    placeholder="นาย พิชญุตม์ สมบูรณ์"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Apply
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Removing Avatar Photo */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-kumo-line bg-kumo-base p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <Trash weight="thin" size={20} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-kumo-default">Remove profile photo</h3>
                <p className="text-xs text-kumo-subtle">
                  Are you sure you want to remove your profile picture?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={confirmDeleteAvatar}
              >
                Remove photo
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Responsive Toast Notification: Bottom-Right on Desktop, Compact Top on Mobile */}
      {saveSuccess && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed z-50 transition-all duration-300 ease-out 
            top-4 left-4 right-4 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-auto"
        >
          <div className="flex items-center gap-2.5 rounded-lg border border-green-500/30 bg-green-500/10 backdrop-blur-md px-4 py-2.5 text-xs font-medium text-green-700 dark:text-green-300 shadow-lg ring-1 ring-black/5 dark:bg-green-950/80">
            <CheckCircle weight="fill" size={18} className="text-green-600 dark:text-green-400 shrink-0" />
            <span className="truncate">Profile updated successfully</span>
            <button
              type="button"
              onClick={() => setSaveSuccess(false)}
              className="ml-2 text-green-600/70 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
            >
              <X weight="bold" size={14} />
            </button>
          </div>
        </aside>
      )}

      {error && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed z-50 transition-all duration-300 ease-out 
            top-4 left-4 right-4 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-auto"
        >
          <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur-md px-4 py-2.5 text-xs font-medium text-red-700 dark:text-red-300 shadow-lg ring-1 ring-black/5 dark:bg-red-950/80">
            <WarningCircle weight="fill" size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            <span className="truncate">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 text-red-600/70 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              <X weight="bold" size={14} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

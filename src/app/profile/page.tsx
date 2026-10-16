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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Error uploading image to MinIO");
    } finally {
      setUploading(false);
    }
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
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {saveSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400">
            <CheckCircle weight="thin" size={16} />
            <span>Profile updated successfully</span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <WarningCircle weight="thin" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <LayerCard className="p-8 ring ring-kumo-line rounded-xl bg-kumo-base shadow-sm">
            {/* Header: Avatar & Photo Action */}
            <div className="flex items-center gap-6 pb-8 border-b border-kumo-line">
              <div className="relative group shrink-0">
                <UserAvatar
                  src={formData.avatarUrl || null}
                  name={formData.name}
                  size={80}
                  className="ring-2 ring-kumo-line rounded-full"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
                  title="Upload new image"
                >
                  {uploading ? (
                    <SpinnerGap weight="thin" size={24} className="animate-spin" />
                  ) : (
                    <Camera weight="thin" size={24} />
                  )}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera weight="thin" size={16} className="mr-1.5" />
                    <span>{uploading ? "Uploading..." : "Upload photo"}</span>
                  </Button>

                  {formData.avatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setFormData({ ...formData, avatarUrl: "" })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields: Clean 2-column Grid with Generous Spacing */}
            <div className="pt-8 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-kumo-default">Full name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kumo-subtle">
                      <User weight="thin" size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 pl-9 pr-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                      placeholder="นาย พิชญุตม์ สมบูรณ์"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-xs font-medium text-kumo-default">Email</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="w-full rounded-md border border-kumo-line bg-kumo-tint py-2 px-3 text-xs text-kumo-subtle cursor-not-allowed"
                  />
                </div>

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
    </div>
  );
}

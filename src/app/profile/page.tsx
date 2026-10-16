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
      <AppNavbar currentUser={currentUser} subtitle="Profile Settings" />

      {/* Main Content Area */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-kumo-default">Profile settings</h1>
          <p className="text-xs text-kumo-subtle">
            Manage your personal academic information, class group, and contact details.
          </p>
        </div>

        {saveSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400">
            <CheckCircle weight="thin" size={16} />
            <span>Profile and MinIO photo updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <WarningCircle weight="thin" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="grid gap-6">
          {/* Section 1: Avatar with MinIO File Upload */}
          <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
            <div className="mb-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative group">
                <UserAvatar
                  src={formData.avatarUrl || null}
                  name={formData.name}
                  size={72}
                  className="ring-2 ring-kumo-line"
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

              <div className="grid gap-1.5">
                <h2 className="text-sm font-semibold text-kumo-default">Profile picture (รูปภาพโปรไฟล์)</h2>
                <p className="text-xs text-kumo-subtle">
                  Upload directly to MinIO Object Storage (PNG, JPG, WebP)
                </p>

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
                    <span>{uploading ? "Uploading to MinIO..." : "Upload photo"}</span>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-kumo-default">Full name (ชื่อ-สกุล)</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                    <User weight="thin" size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                    placeholder="นาย พิชญุตม์ สมบูรณ์"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-medium text-kumo-default">Email address (อีเมล)</label>
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full rounded border border-kumo-line bg-kumo-tint py-1.5 px-2.5 text-xs text-kumo-subtle cursor-not-allowed"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-medium text-kumo-default">
                  Student ID (รหัสนักศึกษา)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                    <IdentificationCard weight="thin" size={15} />
                  </div>
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs font-mono text-[0.9em] text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                    placeholder="663090100xx"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-medium text-kumo-default">
                  Phone number (เบอร์โทรศัพท์)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                    <Phone weight="thin" size={15} />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>
            </div>
          </LayerCard>

          {/* Section 2: Academic Department & Dynamic Class Groups Dropdowns */}
          <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
            <div className="mb-4 grid gap-1">
              <h2 className="text-sm font-semibold text-kumo-default">
                Academic & class group (แผนก สาขา และกลุ่มเรียน)
              </h2>
              <p className="text-xs text-kumo-subtle">
                Dynamic options managed directly by the college administrator.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <label className="text-xs font-medium text-kumo-default">Department (แผนกวิชา)</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                >
                  {departmentsList.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Academic Dropdown */}
              <div className="grid gap-1">
                <label className="text-xs font-medium text-kumo-default">
                  Level, Group & Major (ชั้นปี / กลุ่ม / สาขา)
                </label>
                <select
                  value={formData.selectedAcademicIndex}
                  onChange={(e) =>
                    setFormData({ ...formData, selectedAcademicIndex: parseInt(e.target.value, 10) })
                  }
                  className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none font-medium"
                >
                  {academicClassesList.map((ag, idx) => (
                    <option key={ag.id} value={idx}>
                      {ag.yearLevel} - กลุ่ม {ag.studyGroup} : {ag.major}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Preview Card */}
            {selectedAcademic && (
              <div className="mt-5 rounded border border-kumo-line bg-kumo-tint p-3 text-xs">
                <div className="font-semibold text-kumo-default mb-1">Current selection summary:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-kumo-subtle">
                  <div>
                    <span className="font-medium text-kumo-default">ชั้นปี:</span>{" "}
                    {selectedAcademic.yearLevel}
                  </div>
                  <div>
                    <span className="font-medium text-kumo-default">กลุ่มเรียน:</span> กลุ่ม{" "}
                    {selectedAcademic.studyGroup}
                  </div>
                  <div>
                    <span className="font-medium text-kumo-default">สาขาวิชา:</span>{" "}
                    {selectedAcademic.major}
                  </div>
                </div>
              </div>
            )}
          </LayerCard>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
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
        </form>
      </main>
    </div>
  );
}

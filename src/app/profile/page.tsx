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
  ArrowLeft,
  User,
  IdentificationCard,
  Phone,
  GraduationCap,
  UsersThree,
  CheckCircle,
  WarningCircle,
  FloppyDisk,
  Camera,
  Kanban,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import { ACADEMIC_GROUPS, DEPARTMENTS } from "@/lib/academic";
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

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    studentId: "",
    phone: "",
    department: DEPARTMENTS[0],
    selectedAcademicIndex: 0, // Maps to ACADEMIC_GROUPS
    avatarUrl: "",
    role: "student",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.authenticated || !data.user) {
          router.replace("/login");
          return;
        }

        const user: UserProfileData = data.user;
        
        // Find academic match if available
        let academicIdx = ACADEMIC_GROUPS.findIndex(
          (ag) =>
            ag.yearLevel === user.yearLevel &&
            ag.group === user.studyGroup &&
            ag.major === user.major
        );
        if (academicIdx === -1) academicIdx = 0;

        setFormData({
          name: user.name || "",
          email: user.email || "",
          studentId: user.studentId || "",
          phone: user.phone || "",
          department: user.department || DEPARTMENTS[0],
          selectedAcademicIndex: academicIdx,
          avatarUrl: user.avatarUrl || "",
          role: user.role || "student",
        });
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleAcademicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      selectedAcademicIndex: idx,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    const chosenGroup = ACADEMIC_GROUPS[formData.selectedAcademicIndex];

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          studentId: formData.studentId,
          phone: formData.phone,
          department: formData.department,
          yearLevel: chosenGroup.yearLevel,
          studyGroup: chosenGroup.group,
          major: chosenGroup.major,
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

  const selectedAcademic = ACADEMIC_GROUPS[formData.selectedAcademicIndex];

  return (
    <div className="min-h-screen bg-kumo-canvas">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-kumo-line bg-kumo-base px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-kumo-subtle hover:text-kumo-default"
            >
              <ArrowLeft weight="thin" size={16} />
              <span>Back to workspace</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                USER_ROLES[formData.role as UserRole]?.badgeVariant || "neutral"
              }
            >
              {USER_ROLES[formData.role as UserRole]?.label || formData.role}
            </Badge>
          </div>
        </div>
      </header>

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
            <span>Profile settings saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <WarningCircle weight="thin" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="grid gap-6">
          {/* Section 1: Avatar & Basic Info */}
          <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative">
                <UserAvatar
                  src={formData.avatarUrl || null}
                  name={formData.name}
                  size={64}
                  className="ring-2 ring-kumo-line"
                />
              </div>
              <div className="grid gap-1">
                <h2 className="text-sm font-semibold text-kumo-default">Profile picture</h2>
                <p className="text-xs text-kumo-subtle">
                  Custom image URL or Google profile avatar.
                </p>
                <div className="mt-1 flex max-w-md items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatarUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, avatarUrl: e.target.value })
                    }
                    className="w-full rounded border border-kumo-line bg-kumo-control py-1 px-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  />
                  {formData.avatarUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() => setFormData({ ...formData, avatarUrl: "" })}
                    >
                      Clear
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

          {/* Section 2: Academic Department & Study Group Dropdowns */}
          <LayerCard className="p-6 ring ring-kumo-line rounded-lg bg-kumo-base">
            <div className="mb-4 grid gap-1">
              <h2 className="text-sm font-semibold text-kumo-default">
                Academic & class group (แผนก สาขา และกลุ่มเรียน)
              </h2>
              <p className="text-xs text-kumo-subtle">
                Select your academic level, group, and major according to college registration.
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
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Combined Academic Dropdown matching the user's table */}
              <div className="grid gap-1">
                <label className="text-xs font-medium text-kumo-default">
                  Level, Group & Major (ชั้นปี / กลุ่ม / สาขา)
                </label>
                <select
                  value={formData.selectedAcademicIndex}
                  onChange={handleAcademicChange}
                  className="w-full rounded border border-kumo-line bg-kumo-control py-1.5 px-2.5 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none font-medium"
                >
                  {ACADEMIC_GROUPS.map((ag, idx) => (
                    <option key={idx} value={idx}>
                      {ag.yearLevel} - กลุ่ม {ag.group} : {ag.major}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Preview Card */}
            <div className="mt-5 rounded border border-kumo-line bg-kumo-tint p-3 text-xs">
              <div className="font-semibold text-kumo-default mb-1">Current selection summary:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-kumo-subtle">
                <div>
                  <span className="font-medium text-kumo-default">ชั้นปี:</span>{" "}
                  {selectedAcademic.yearLevel}
                </div>
                <div>
                  <span className="font-medium text-kumo-default">กลุ่มเรียน:</span> กลุ่ม{" "}
                  {selectedAcademic.group}
                </div>
                <div>
                  <span className="font-medium text-kumo-default">สาขาวิชา:</span>{" "}
                  {selectedAcademic.major}
                </div>
              </div>
            </div>
          </LayerCard>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
            <Link href="/">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" disabled={saving}>
              <FloppyDisk weight="thin" size={16} className="mr-1.5" />
              <span>{saving ? "Saving changes..." : "Save profile"}</span>
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

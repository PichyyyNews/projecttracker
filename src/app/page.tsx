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
  Plus,
  FolderOpen,
  User,
  Users,
  GraduationCap,
  BookBookmark,
  CheckCircle,
  WarningCircle,
  X,
  MagnifyingGlass,
  Check,
  CaretDown,
  ArrowRight,
  Sparkle,
  Kanban,
  Clock,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import AppNavbar from "@/components/AppNavbar";
import { USER_ROLES, UserRole } from "@/lib/roles";
import { MilestoneTimeline, MilestoneItem } from "@/components/MilestoneTimeline";

interface UserSession {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface ProjectUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  department?: string | null;
}

interface ProjectMemberItem {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  status: string;
  user: ProjectUser;
}

interface ProjectItem {
  id: number;
  name: string;
  subjectName: string;
  description?: string | null;
  creatorId: number;
  advisorId?: number | null;
  status: string;
  tier: string;
  createdAt: string;
  creator: ProjectUser;
  advisor?: ProjectUser | null;
  members: ProjectMemberItem[];
}

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);
  const [contactsList, setContactsList] = useState<ProjectUser[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Create Project Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Milestone Detail View State
  const [selectedTrackProject, setSelectedTrackProject] = useState<ProjectItem | null>(null);
  const [projectMilestones, setProjectMilestones] = useState<MilestoneItem[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  // Search & Filter within Create Modal
  const [memberSearch, setMemberSearch] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [advisorSearch, setAdvisorSearch] = useState("");
  const [isAdvisorDropdownOpen, setIsAdvisorDropdownOpen] = useState(false);
  const advisorDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        advisorDropdownRef.current &&
        !advisorDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAdvisorDropdownOpen(false);
      }
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(e.target as Node)
      ) {
        setIsMemberDropdownOpen(false);
      }
    };

    if (isAdvisorDropdownOpen || isMemberDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isAdvisorDropdownOpen, isMemberDropdownOpen]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    async function init() {
      try {
        const [meRes, pRes, uRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/projects"),
          fetch("/api/users"),
        ]);

        const meData = await meRes.json();
        if (meData.authenticated && meData.user) {
          setCurrentUser(meData.user);
        } else {
          router.replace("/login");
          return;
        }

        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success) setProjectsList(pData.data);
        }

        if (uRes.ok) {
          const uData = await uRes.json();
          if (uData.success) setContactsList(uData.data);
        }
      } catch (err) {
        router.replace("/login");
      } finally {
        setCheckingAuth(false);
        setLoadingProjects(false);
      }
    }
    init();
  }, [router]);

  const refreshProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) setProjectsList(data.data);
    } catch (err) {
      // ignore
    }
  };

  const fetchProjectMilestones = async (projectId: number) => {
    try {
      setLoadingMilestones(true);
      const res = await fetch(`/api/milestones?projectId=${projectId}`);
      const data = await res.json();
      if (data.success) {
        setProjectMilestones(data.data || []);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load project milestones", "error");
    } finally {
      setLoadingMilestones(false);
    }
  };

  const handleOpenProjectTrack = (project: ProjectItem) => {
    setSelectedTrackProject(project);
    fetchProjectMilestones(project.id);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !subjectName.trim()) return;

    setCreateLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          subjectName: subjectName.trim(),
          description: projectDescription.trim() || null,
          memberIds: selectedMemberIds,
          advisorId: selectedAdvisorId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create project");
      }

      showToast("Project created successfully! Invitations sent to members & advisor.");
      setIsCreateOpen(false);
      setProjectName("");
      setSubjectName("");
      setProjectDescription("");
      setSelectedMemberIds([]);
      setSelectedAdvisorId(null);
      refreshProjects();
    } catch (err: any) {
      showToast(err.message || "Failed to create project", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const studentCandidates = contactsList.filter(
    (u) => u.id !== currentUser?.id && u.role === "student"
  );

  const advisorCandidates = contactsList.filter(
    (u) => u.id !== currentUser?.id && (u.role === "advisor" || u.role === "instructor" || u.role === "admin")
  );

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

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
        {/* Projects Grid or Empty State or Project Milestone Track */}
        {selectedTrackProject ? (
          <div className="space-y-6">
            {/* Top Project Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-kumo-line pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTrackProject(null)}
                  title="Return to projects"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-kumo-line bg-kumo-base text-kumo-subtle hover:text-kumo-default hover:border-kumo-brand/60 transition-colors shrink-0"
                >
                  <ArrowRight weight="bold" size={14} className="rotate-180" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-kumo-brand/10 px-2 py-0.5 text-[10px] font-medium text-kumo-brand">
                      {selectedTrackProject.subjectName}
                    </span>
                    <h1 className="text-lg font-bold text-kumo-default">{selectedTrackProject.name}</h1>
                  </div>
                  {selectedTrackProject.description && (
                    <p className="mt-0.5 text-xs text-kumo-subtle">{selectedTrackProject.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-kumo-subtle">Advisor:</span>
                {selectedTrackProject.advisor ? (
                  <div className="flex items-center gap-1.5">
                    <UserAvatar
                      src={selectedTrackProject.advisor.avatarUrl}
                      name={selectedTrackProject.advisor.name}
                      size={22}
                    />
                    <span className="font-semibold text-kumo-default">
                      {selectedTrackProject.advisor.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-kumo-subtle italic">Unassigned</span>
                )}
              </div>
            </div>

            {/* Milestones Content */}
            {loadingMilestones ? (
              <div className="flex h-40 items-center justify-center">
                <span className="text-xs text-kumo-subtle">Loading milestone tracking...</span>
              </div>
            ) : (
              <MilestoneTimeline
                milestones={projectMilestones}
                isAdvisorOrAdmin={
                  currentUser?.role === "advisor" ||
                  currentUser?.role === "instructor" ||
                  currentUser?.role === "admin"
                }
                onRefresh={() => fetchProjectMilestones(selectedTrackProject.id)}
              />
            )}
          </div>
        ) : loadingProjects ? (
          <div className="flex h-64 items-center justify-center">
            <span className="text-xs text-kumo-subtle">Loading workspace projects...</span>
          </div>
        ) : projectsList.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 -translate-y-[6vh]">
            <div className="w-full max-w-md text-center">
              <LayerCard className="p-8 ring ring-kumo-line rounded-xl bg-kumo-base shadow-xs">
                <div className="mb-4 flex flex-col items-center justify-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-kumo-control ring ring-kumo-line text-kumo-subtle">
                    <FolderOpen weight="thin" size={32} />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight text-kumo-default">
                    No projects yet
                  </h2>
                  <p className="mt-2 text-xs text-kumo-subtle leading-relaxed max-w-xs">
                    Your workspace is ready. Set up your project name, course subject, and invite members and advisors.
                  </p>
                </div>

                <div className="mt-6 flex justify-center">
                  <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
                    <Plus weight="thin" size={16} className="mr-1.5" />
                    <span>Create your first project</span>
                  </Button>
                </div>
              </LayerCard>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projectsList.map((project) => (
              <LayerCard
                key={project.id}
                className="flex flex-col justify-between p-5 ring ring-kumo-line rounded-xl bg-kumo-base hover:border-kumo-brand/60 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-kumo-line pb-3">
                    <div className="min-w-0">
                      <span className="rounded bg-kumo-brand/10 px-2 py-0.5 text-[10px] font-medium text-kumo-brand">
                        {project.subjectName}
                      </span>
                      <h3 className="mt-2 text-base font-semibold text-kumo-default truncate">
                        {project.name}
                      </h3>
                    </div>
                    {/* Status Icon Badge */}
                    <div
                      title={`Status: ${project.status}`}
                      className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                        project.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : project.status === "completed"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : project.status === "rejected"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {project.status === "active" ? (
                        <CheckCircle weight="fill" size={15} />
                      ) : project.status === "completed" ? (
                        <Sparkle weight="fill" size={15} />
                      ) : project.status === "rejected" ? (
                        <WarningCircle weight="fill" size={15} />
                      ) : (
                        <Clock weight="fill" size={15} />
                      )}
                    </div>
                  </div>

                  {project.description && (
                    <p className="mt-3 line-clamp-2 text-xs text-kumo-subtle leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Advisor */}
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-kumo-subtle">Advisor:</span>
                    {project.advisor ? (
                      <div className="flex items-center gap-1.5">
                        <UserAvatar
                          src={project.advisor.avatarUrl || null}
                          name={project.advisor.name}
                          size={20}
                        />
                        <span className="font-medium text-kumo-default truncate max-w-[130px]">
                          {project.advisor.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-kumo-subtle italic">Unassigned</span>
                    )}
                  </div>

                  {/* Members Avatars Stack */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-kumo-subtle">Members:</span>
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {project.members && project.members.length > 0 ? (
                        project.members.map((m) => (
                          <div key={m.id} title={`${m.user?.name} (${m.status})`}>
                            <UserAvatar
                              src={m.user?.avatarUrl || null}
                              name={m.user?.name}
                              size={22}
                              className={`rounded-full ring-2 ring-kumo-base ${
                                m.status === "pending"
                                  ? "opacity-60 grayscale"
                                  : m.status === "rejected"
                                  ? "opacity-30"
                                  : ""
                              }`}
                            />
                          </div>
                        ))
                      ) : (
                        <span className="text-kumo-subtle italic">Solo</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-kumo-line flex items-center justify-between text-xs text-kumo-subtle">
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenProjectTrack(project)}
                    className="text-kumo-brand font-medium flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>View project track</span>
                    <ArrowRight weight="thin" size={12} />
                  </button>
                </div>
              </LayerCard>
            ))}

            {/* Create Next Project Card (Appears after the last project) */}
            <div
              onClick={() => setIsCreateOpen(true)}
              className="group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border border-kumo-line bg-kumo-base p-6 text-center ring ring-kumo-line transition-all duration-150 hover:border-kumo-brand/60 hover:bg-kumo-tint/30 shadow-sm"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kumo-control ring ring-kumo-line text-kumo-subtle group-hover:bg-kumo-brand group-hover:text-white group-hover:ring-kumo-brand transition-colors">
                <Plus weight="thin" size={26} />
              </div>
              <h3 className="text-sm font-semibold text-kumo-default group-hover:text-kumo-brand transition-colors">
                Create new project
              </h3>
              <p className="mt-1 text-xs text-kumo-subtle max-w-[200px]">
                Add another capstone or subject project to your workspace.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-xl border border-kumo-line bg-kumo-base p-6 shadow-xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-kumo-line pb-3">
              <div>
                <h3 className="text-sm font-semibold text-kumo-default">Create new project</h3>
                <p className="text-xs text-kumo-subtle mt-0.5">
                  Invitations will be automatically sent to members and advisor for confirmation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-kumo-subtle hover:text-kumo-default"
              >
                <X weight="thin" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              {/* Project Title */}
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Project title</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. AI-Powered Smart Agriculture Monitoring System"
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
              </div>

              {/* Subject / Course Name */}
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Course name</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Computer Technology Project I"
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Description</label>
                <textarea
                  rows={3}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Summary of project objectives, scope, and technologies..."
                  className="w-full rounded-md border border-kumo-line bg-kumo-control p-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none resize-none"
                />
              </div>

              {/* Advisor Selection (Dropdown & Role Filtering) */}
              <div className="grid gap-1.5 relative" ref={advisorDropdownRef}>
                <label className="text-xs font-medium text-kumo-default">
                  Project advisor
                </label>

                {/* Unified Advisor Box */}
                <div
                  onClick={() => setIsAdvisorDropdownOpen(!isAdvisorDropdownOpen)}
                  className={`flex items-center gap-2 rounded-md border bg-kumo-control px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                    isAdvisorDropdownOpen ? "border-kumo-brand ring-1 ring-kumo-brand" : "border-kumo-line"
                  }`}
                >
                  {selectedAdvisorId ? (
                    (() => {
                      const adv = contactsList.find((u) => u.id === selectedAdvisorId);
                      return adv ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <UserAvatar
                            src={adv.avatarUrl || null}
                            name={adv.name}
                            size={24}
                            role={adv.role}
                            showRoleBadge={true}
                          />
                          <span className="font-semibold text-kumo-default truncate">{adv.name}</span>
                          <span className="text-[11px] text-kumo-subtle truncate">({adv.email})</span>
                        </div>
                      ) : null;
                    })()
                  ) : (
                    <div className="flex items-center gap-2 flex-1 text-kumo-subtle">
                      <GraduationCap weight="thin" size={16} />
                      <span>Select advisor from instructors or advisors list...</span>
                    </div>
                  )}

                  {selectedAdvisorId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAdvisorId(null);
                      }}
                      className="text-kumo-subtle hover:text-red-500"
                    >
                      <X weight="bold" size={12} />
                    </button>
                  )}

                  <CaretDown
                    weight="thin"
                    size={14}
                    className={`text-kumo-subtle transition-transform duration-200 ${
                      isAdvisorDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Advisor Dropdown Options */}
                {isAdvisorDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-kumo-line bg-kumo-base shadow-xl ring-1 ring-black/5 divide-y divide-kumo-line">
                    <div className="p-2 border-b border-kumo-line bg-kumo-control/30 flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-kumo-subtle">
                          <MagnifyingGlass weight="thin" size={13} />
                        </div>
                        <input
                          type="text"
                          value={advisorSearch}
                          onChange={(e) => setAdvisorSearch(e.target.value)}
                          placeholder="Search advisor by name or email..."
                          className="w-full rounded border border-kumo-line bg-kumo-base py-1 pl-7 pr-2 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAdvisorDropdownOpen(false)}
                        className="text-kumo-subtle hover:text-kumo-default p-1"
                        title="Close dropdown"
                      >
                        <X weight="thin" size={14} />
                      </button>
                    </div>

                    {advisorCandidates
                      .filter((u) => {
                        if (!advisorSearch.trim()) return true;
                        return u.name.toLowerCase().includes(advisorSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(advisorSearch.toLowerCase());
                      })
                      .map((adv) => {
                        const isSelected = selectedAdvisorId === adv.id;
                        return (
                          <div
                            key={adv.id}
                            onClick={() => {
                              setSelectedAdvisorId(adv.id);
                              setIsAdvisorDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                              isSelected ? "bg-kumo-tint font-medium" : "hover:bg-kumo-tint/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <UserAvatar
                                src={adv.avatarUrl || null}
                                name={adv.name}
                                size={26}
                                role={adv.role}
                                showRoleBadge={true}
                              />
                              <div className="min-w-0">
                                <span className="font-semibold text-kumo-default truncate block">{adv.name}</span>
                                <span className="text-[11px] text-kumo-subtle truncate block">{adv.email}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check weight="bold" size={14} className="text-kumo-brand shrink-0" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Members Selection (Student Teammates) */}
              <div className="grid gap-1.5 relative" ref={memberDropdownRef}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-kumo-default">
                      Project members
                    </label>

                    {/* Circular Avatars Row: Creator first, then teammates */}
                    <div className="flex items-center -space-x-1.5">
                      {/* Current User (Owner / Creator) */}
                      <div
                        title={`${currentUser?.name || "You"} (Owner)`}
                        className="relative group transition-transform hover:z-10 hover:scale-110"
                      >
                        <UserAvatar
                          src={currentUser?.avatarUrl || null}
                          name={currentUser?.name}
                          size={22}
                          className="rounded-full ring-2 ring-kumo-base"
                        />
                      </div>

                      {/* Selected Invited Teammates */}
                      {selectedMemberIds.map((mId) => {
                        const memberUser = contactsList.find((u) => u.id === mId);
                        if (!memberUser) return null;
                        return (
                          <div
                            key={mId}
                            title={`${memberUser.name} (Member) - Click to remove`}
                            onClick={() => setSelectedMemberIds(selectedMemberIds.filter((id) => id !== mId))}
                            className="relative group cursor-pointer transition-transform hover:z-10 hover:scale-110"
                          >
                            <UserAvatar
                              src={memberUser.avatarUrl || null}
                              name={memberUser.name}
                              size={22}
                              className="rounded-full ring-2 ring-kumo-base"
                            />
                            {/* Hover remove cross overlay */}
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              <X weight="bold" size={10} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Add Teammate Trigger */}
                <div
                  onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                  className={`flex items-center justify-between rounded-md border bg-kumo-control px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                    isMemberDropdownOpen
                      ? "border-kumo-brand ring-1 ring-kumo-brand text-kumo-default"
                      : "border-kumo-line text-kumo-subtle hover:text-kumo-default"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users weight="thin" size={16} />
                    <span>Click to search and add student teammates...</span>
                  </div>
                  <CaretDown
                    weight="thin"
                    size={14}
                    className={`transition-transform duration-200 ${
                      isMemberDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Teammates Dropdown */}
                {isMemberDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-kumo-line bg-kumo-base shadow-xl ring-1 ring-black/5 divide-y divide-kumo-line">
                    <div className="p-2 border-b border-kumo-line bg-kumo-control/30 flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-kumo-subtle">
                          <MagnifyingGlass weight="thin" size={13} />
                        </div>
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Search student by name or email..."
                          className="w-full rounded border border-kumo-line bg-kumo-base py-1 pl-7 pr-2 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMemberDropdownOpen(false)}
                        className="text-kumo-subtle hover:text-kumo-default p-1"
                        title="Close dropdown"
                      >
                        <X weight="thin" size={14} />
                      </button>
                    </div>

                    {studentCandidates
                      .filter((u) => {
                        if (!memberSearch.trim()) return true;
                        return u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(memberSearch.toLowerCase());
                      })
                      .map((stu) => {
                        const isSelected = selectedMemberIds.includes(stu.id);
                        return (
                          <div
                            key={stu.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedMemberIds(selectedMemberIds.filter((id) => id !== stu.id));
                              } else {
                                setSelectedMemberIds([...selectedMemberIds, stu.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                              isSelected ? "bg-kumo-tint font-medium" : "hover:bg-kumo-tint/60"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <UserAvatar src={stu.avatarUrl || null} name={stu.name} size={24} />
                              <div className="min-w-0">
                                <span className="font-semibold text-kumo-default truncate block">{stu.name}</span>
                                <span className="text-[11px] text-kumo-subtle truncate block">{stu.email}</span>
                              </div>
                            </div>
                            {isSelected ? (
                              <Check weight="bold" size={14} className="text-kumo-brand" />
                            ) : (
                              <Plus weight="thin" size={14} className="text-kumo-subtle" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-kumo-line">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={createLoading}>
                  <Plus weight="thin" size={14} className="mr-1.5" />
                  <span>{createLoading ? "Creating project..." : "Create project"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Responsive Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          className="fixed z-50 transition-all duration-300 ease-out top-4 left-4 right-4 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-auto"
        >
          <div
            className="flex items-center gap-2.5 rounded-lg border border-kumo-line bg-kumo-base px-4 py-2.5 text-xs font-medium shadow-lg ring-1 ring-black/5"
          >
            {toastType === "success" ? (
              <CheckCircle weight="fill" size={18} className="text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <WarningCircle weight="fill" size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span
              className={`truncate font-medium ${
                toastType === "success"
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {toastMessage}
            </span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 text-kumo-subtle hover:text-kumo-default"
            >
              <X weight="bold" size={14} />
            </button>
          </div>
        </aside>
      )}

      {/* Footer */}
      <footer className="border-t border-kumo-line bg-kumo-base px-6 py-4 mt-auto">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-kumo-subtle">
          <div>Project Tracker Workspace</div>
          <div>Cloudflare Kumo UI &bull; PostgreSQL</div>
        </div>
      </footer>
    </div>
  );
}

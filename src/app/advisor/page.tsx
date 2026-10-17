"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, LayerCard, Badge } from "@cloudflare/kumo";
import {
  Kanban,
  QrCode,
  CheckCircle,
  WarningCircle,
  Clock,
  Sparkle,
  MagnifyingGlass,
  ArrowRight,
  CaretLeft,
  ChatCircleDots,
  Link as LinkIcon,
  Check,
  X,
  FileText,
  User,
  Users,
  Eye,
  Camera,
} from "@phosphor-icons/react";
import AppNavbar from "@/components/AppNavbar";
import UserAvatar from "@/components/UserAvatar";
import { MilestoneItem, MilestoneTimeline } from "@/components/MilestoneTimeline";

interface EnrichedProject {
  id: number;
  name: string;
  subjectName: string;
  description: string | null;
  status: string;
  createdAt: string;
  creator: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  advisor?: {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  members: {
    id: number;
    userId: number;
    role: string;
    status: string;
    user: {
      id: number;
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  }[];
  milestones: MilestoneItem[];
  currentProgress: number; // 0, 25, 50, 75, 100
  pendingMilestone: MilestoneItem | null;
  needsInspection: boolean;
}

import { Suspense } from "react";

function AdvisorPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<EnrichedProject[]>([]);
  const [stats, setStats] = useState({ total: 0, needsInspectionCount: 0, completedCount: 0 });
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect / Evaluation Modal State
  const [selectedProject, setSelectedProject] = useState<EnrichedProject | null>(null);
  const [evaluatingMilestone, setEvaluatingMilestone] = useState<MilestoneItem | null>(null);
  const [evaluationAction, setEvaluationAction] = useState<"approve" | "revise">("approve");
  const [evaluationFeedback, setEvaluationFeedback] = useState("");
  const [evaluatingLoading, setEvaluatingLoading] = useState(false);
  const [qrTokenFromUrl, setQrTokenFromUrl] = useState<string | null>(null);

  // In-App QR Camera Scanner Modal
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<any>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Check user authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (!data.user) {
          router.replace("/login");
          return;
        }
        if (!["advisor", "instructor", "admin"].includes(data.user.role)) {
          router.replace("/");
          return;
        }
        setCurrentUser(data.user);
      } catch {
        router.replace("/login");
      }
    };
    checkAuth();
  }, [router]);

  // 2. Fetch advisor projects
  const fetchAdvisorProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/advisor/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load advisor projects", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAdvisorProjects();
    }
  }, [currentUser]);

  // 3. Handle query params from QR scan (e.g., ?inspectProject=12&stage=25&token=xyz)
  useEffect(() => {
    const inspectProjectId = searchParams.get("inspectProject");
    const stage = searchParams.get("stage");
    const token = searchParams.get("token");

    if (inspectProjectId && projects.length > 0) {
      const p = projects.find((prj) => prj.id === Number(inspectProjectId));
      if (p) {
        setSelectedProject(p);
        if (stage) {
          const m = p.milestones.find((item) => item.stage === Number(stage));
          if (m) {
            setEvaluatingMilestone(m);
            if (token) setQrTokenFromUrl(token);
          }
        }
      }
    }
  }, [searchParams, projects]);

  // 4. Initialize QR Scanner when modal opens
  useEffect(() => {
    if (!showScanner) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (!isSubscribed) return;
      try {
        const scanner = new Html5QrcodeScanner(
          "advisor-qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
          },
          false
        );

        scanner.render(
          (decodedText: string) => {
            // Decoded QR text (URL or token)
            try {
              if (decodedText.includes("inspectProject=")) {
                const urlObj = new URL(decodedText);
                const projectId = urlObj.searchParams.get("inspectProject");
                const stage = urlObj.searchParams.get("stage");
                const token = urlObj.searchParams.get("token");

                setShowScanner(false);
                scanner.clear().catch(() => {});

                if (projectId) {
                  const targetP = projects.find((p) => p.id === Number(projectId));
                  if (targetP) {
                    setSelectedProject(targetP);
                    const targetM = targetP.milestones.find((m) => m.stage === Number(stage));
                    if (targetM) {
                      setEvaluatingMilestone(targetM);
                      if (token) setQrTokenFromUrl(token);
                      showToast(`Scanned ${targetP.name} - Stage ${stage}%`, "success");
                    }
                  } else {
                    router.push(`/advisor?inspectProject=${projectId}&stage=${stage}&token=${token}`);
                  }
                }
              } else {
                showToast("Unrecognized QR format", "error");
              }
            } catch (err: any) {
              showToast("QR parse error: " + err.message, "error");
            }
          },
          (errorMessage: string) => {
            // Frame error (silenced during scan search)
          }
        );
        scannerRef.current = scanner;
      } catch (err: any) {
        setScannerError(err.message || "Failed to initialize camera scanner");
      }
    });

    return () => {
      isSubscribed = false;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showScanner, projects, router]);

  // 5. Submit Evaluation (Approve or Revise)
  const handleEvaluate = async () => {
    if (!evaluatingMilestone) return;

    try {
      setEvaluatingLoading(true);
      const res = await fetch("/api/milestones/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: evaluatingMilestone.id,
          qrToken: qrTokenFromUrl || evaluatingMilestone.qrToken,
          action: evaluationAction,
          feedbackNotes: evaluationFeedback.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Evaluation failed");
      }

      showToast(
        evaluationAction === "approve"
          ? `Milestone ${evaluatingMilestone.stage}% approved! Next stage unlocked.`
          : `Requested revision for Milestone ${evaluatingMilestone.stage}%.`,
        "success"
      );

      setEvaluatingMilestone(null);
      setEvaluationFeedback("");
      setQrTokenFromUrl(null);
      await fetchAdvisorProjects();

      // If we are viewing a selected project, refresh its state
      if (selectedProject) {
        const updated = projects.find((p) => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to evaluate milestone", "error");
    } finally {
      setEvaluatingLoading(false);
    }
  };

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    if (filter === "pending" && !p.needsInspection) return false;
    if (filter === "completed" && p.currentProgress < 100) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSubject = p.subjectName.toLowerCase().includes(q);
      const matchCreator = p.creator?.name.toLowerCase().includes(q);
      return matchName || matchSubject || matchCreator;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-kumo-canvas">
      <AppNavbar currentUser={currentUser} subtitle="Advisor Portal" />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-kumo-line pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Kanban weight="thin" size={24} className="text-kumo-brand" />
              <h1 className="text-xl font-bold tracking-tight text-kumo-default">
                Advisor Portal
              </h1>
            </div>
            <p className="mt-1 text-xs text-kumo-subtle">
              Oversee assigned student projects, review deliverables, and conduct onsite QR inspections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5"
            >
              <Camera weight="thin" size={15} />
              <span>Scan Student QR</span>
            </Button>

            <Link href="/">
              <Button variant="secondary" size="sm">
                Back to Workspace
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <LayerCard className="p-4 ring ring-kumo-line rounded-xl bg-kumo-base">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-kumo-subtle">All Advising Projects</span>
              <Users weight="thin" size={18} className="text-kumo-subtle" />
            </div>
            <div className="mt-2 text-2xl font-bold text-kumo-default">{stats.total}</div>
          </LayerCard>

          <LayerCard className="p-4 ring ring-kumo-line rounded-xl bg-kumo-base border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Awaiting Onsite Inspection
              </span>
              <QrCode weight="thin" size={18} className="text-amber-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.needsInspectionCount}
            </div>
          </LayerCard>

          <LayerCard className="p-4 ring ring-kumo-line rounded-xl bg-kumo-base border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Fully Completed (100%)
              </span>
              <Sparkle weight="thin" size={18} className="text-green-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.completedCount}
            </div>
          </LayerCard>
        </div>

        {/* Project Detail View Mode (If a project is selected) */}
        {selectedProject ? (
          <div className="mt-8 space-y-4">
            {/* Sequential Horizontal Milestone Timeline Component with Project Info Embedded */}
            <MilestoneTimeline
              milestones={selectedProject.milestones}
              projectInfo={{
                name: selectedProject.name,
                subjectName: selectedProject.subjectName,
                description: selectedProject.description,
                advisor: selectedProject.advisor,
                members: selectedProject.members,
              }}
              isAdvisorOrAdmin={true}
              onRefresh={fetchAdvisorProjects}
              onOpenEvaluationModal={(m) => {
                setEvaluatingMilestone(m);
              }}
              onBack={() => setSelectedProject(null)}
            />
          </div>
        ) : (
          /* Multi-Project Overview Table / Cards */
          <div className="mt-8 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === "all"
                      ? "bg-kumo-control text-kumo-default font-semibold shadow-xs"
                      : "text-kumo-subtle hover:text-kumo-default"
                  }`}
                >
                  All Projects ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("pending")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === "pending"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-kumo-subtle hover:text-kumo-default"
                  }`}
                >
                  <span>Awaiting Inspection</span>
                  {stats.needsInspectionCount > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {stats.needsInspectionCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("completed")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === "completed"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 font-semibold"
                      : "text-kumo-subtle hover:text-kumo-default"
                  }`}
                >
                  Completed ({stats.completedCount})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                  <MagnifyingGlass weight="thin" size={14} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by title or student..."
                  className="w-full rounded-md border border-kumo-line bg-kumo-base py-1.5 pl-8 pr-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
              </div>
            </div>

            {/* List / Cards */}
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <span className="text-xs text-kumo-subtle">Loading advising projects...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-kumo-line p-8 text-center bg-kumo-base">
                <Kanban weight="thin" size={32} className="text-kumo-subtle" />
                <span className="mt-2 text-xs font-semibold text-kumo-default">No projects found</span>
                <span className="text-[11px] text-kumo-subtle">
                  {filter === "pending"
                    ? "No student projects are currently waiting for milestone inspection."
                    : "No advising projects match your search criteria."}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => {
                  return (
                    <LayerCard
                      key={p.id}
                      className={`flex flex-col justify-between p-5 ring ring-kumo-line rounded-xl bg-kumo-base transition-all duration-150 shadow-sm ${
                        p.needsInspection ? "border-l-4 border-amber-500 ring-amber-500/30" : ""
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-kumo-line pb-3">
                          <div className="min-w-0">
                            <span className="rounded bg-kumo-brand/10 px-2 py-0.5 text-[10px] font-medium text-kumo-brand">
                              {p.subjectName}
                            </span>
                            <h3 className="mt-1.5 text-sm font-semibold text-kumo-default truncate">
                              {p.name}
                            </h3>
                          </div>

                          {p.needsInspection ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                              Inspection Ready
                            </Badge>
                          ) : (
                            <Badge
                              variant={p.currentProgress === 100 ? "primary" : "secondary"}
                            >
                              {p.currentProgress}%
                            </Badge>
                          )}
                        </div>

                        {/* Progress Bar Track */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-kumo-subtle mb-1">
                            <span>Milestone Progress</span>
                            <span className="font-semibold text-kumo-default">{p.currentProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-kumo-control rounded-full overflow-hidden">
                            <div
                              className="h-full bg-kumo-brand transition-all duration-300"
                              style={{ width: `${p.currentProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* Creator & Teammates */}
                        <div className="mt-4 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <UserAvatar
                              src={p.creator?.avatarUrl}
                              name={p.creator?.name}
                              size={20}
                            />
                            <span className="text-kumo-default font-medium truncate max-w-[120px]">
                              {p.creator?.name}
                            </span>
                          </div>

                          <div className="flex items-center -space-x-1.5">
                            {p.members.map((m) => (
                              <UserAvatar
                                key={m.id}
                                src={m.user?.avatarUrl}
                                name={m.user?.name}
                                size={18}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Pending Inspection Alert Pill */}
                        {p.pendingMilestone && (
                          <div className="mt-3 rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="flex items-center gap-1">
                                <QrCode weight="bold" size={14} />
                                Stage {p.pendingMilestone.stage}% Ready
                              </span>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedProject(p);
                                  setEvaluatingMilestone(p.pendingMilestone);
                                }}
                                className="!py-0.5 !px-2 !text-[11px]"
                              >
                                Review Now
                              </Button>
                            </div>
                            {p.pendingMilestone.submissionNote && (
                              <p className="mt-1 line-clamp-1 text-[11px] italic text-amber-600 dark:text-amber-300">
                                &ldquo;{p.pendingMilestone.submissionNote}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* View Detail Trigger */}
                      <div className="mt-4 pt-3 border-t border-kumo-line flex items-center justify-between text-xs">
                        <span className="text-kumo-subtle">
                          {p.milestones.filter((m) => m.status === "approved").length} of 4 Milestones
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedProject(p)}
                          className="text-kumo-brand font-medium flex items-center gap-1 hover:underline"
                        >
                          <span>Open Track</span>
                          <ArrowRight weight="thin" size={12} />
                        </button>
                      </div>
                    </LayerCard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Onsite Evaluation Modal */}
      {evaluatingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-kumo-line bg-kumo-base p-6 shadow-2xl ring-1 ring-black/10">
            <div className="flex items-center justify-between border-b border-kumo-line pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle weight="thin" size={20} className="text-kumo-brand" />
                <h3 className="text-base font-bold text-kumo-default">
                  Onsite Milestone Evaluation ({evaluatingMilestone.stage}%)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEvaluatingMilestone(null)}
                className="text-kumo-subtle hover:text-kumo-default"
              >
                <X weight="bold" size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-kumo-default">Milestone:</span>
                <span className="ml-1 text-kumo-subtle">{evaluatingMilestone.title}</span>
              </div>

              {evaluatingMilestone.goalScope && (
                <div className="rounded-md bg-kumo-control p-3">
                  <span className="font-semibold text-kumo-default block mb-1">Student Scope & Goals:</span>
                  <p className="text-kumo-subtle whitespace-pre-wrap">{evaluatingMilestone.goalScope}</p>
                </div>
              )}

              {evaluatingMilestone.submissionNote && (
                <div>
                  <span className="font-semibold text-kumo-default block mb-1">Submission Notes:</span>
                  <p className="text-kumo-subtle italic bg-kumo-control p-2.5 rounded">
                    &ldquo;{evaluatingMilestone.submissionNote}&rdquo;
                  </p>
                </div>
              )}

              {/* Deliverable links */}
              {evaluatingMilestone.deliverableLinks && (
                <div>
                  <span className="font-semibold text-kumo-default block mb-1">Submitted Links / Artifacts:</span>
                  <div className="space-y-1">
                    {(() => {
                      try {
                        const parsed = JSON.parse(evaluatingMilestone.deliverableLinks);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          return parsed.map((link: string, idx: number) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-kumo-brand hover:underline font-mono text-[11px]"
                            >
                              <LinkIcon weight="thin" size={13} />
                              <span className="truncate">{link}</span>
                            </a>
                          ));
                        }
                      } catch {}
                      return <span className="text-kumo-subtle italic">No external links attached</span>;
                    })()}
                  </div>
                </div>
              )}

              {/* Decision Radio / Tabs */}
              <div className="pt-2">
                <span className="font-semibold text-kumo-default block mb-2">Advisor Decision:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEvaluationAction("approve")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 font-semibold transition-all ${
                      evaluationAction === "approve"
                        ? "border-green-600 bg-green-500/10 text-green-700 dark:text-green-400 ring-2 ring-green-500/30"
                        : "border-kumo-line text-kumo-subtle hover:bg-kumo-tint"
                    }`}
                  >
                    <CheckCircle weight="fill" size={16} />
                    <span>Approve & Unlock Next</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEvaluationAction("revise")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 font-semibold transition-all ${
                      evaluationAction === "revise"
                        ? "border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/30"
                        : "border-kumo-line text-kumo-subtle hover:bg-kumo-tint"
                    }`}
                  >
                    <WarningCircle weight="fill" size={16} />
                    <span>Request Revision</span>
                  </button>
                </div>
              </div>

              {/* Feedback Note Input */}
              <div>
                <label className="font-semibold text-kumo-default block mb-1">
                  Advisor Feedback & Instructions:
                </label>
                <textarea
                  rows={3}
                  value={evaluationFeedback}
                  onChange={(e) => setEvaluationFeedback(e.target.value)}
                  placeholder={
                    evaluationAction === "approve"
                      ? "Optional commendation or guidance for the next phase..."
                      : "Required: specify what parts need to be revised or improved..."
                  }
                  className="w-full rounded-md border border-kumo-line bg-kumo-base p-2 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex justify-end gap-2 border-t border-kumo-line pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEvaluatingMilestone(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEvaluate}
                disabled={evaluatingLoading}
              >
                {evaluatingLoading ? "Submitting..." : "Confirm Evaluation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-kumo-line bg-kumo-base p-5 shadow-2xl ring-1 ring-black/10">
            <div className="flex items-center justify-between border-b border-kumo-line pb-3">
              <div className="flex items-center gap-2">
                <Camera weight="thin" size={20} className="text-kumo-brand" />
                <h3 className="text-sm font-bold text-kumo-default">Scan Student Milestone QR</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(false)}
                className="text-kumo-subtle hover:text-kumo-default"
              >
                <X weight="bold" size={16} />
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center">
              <div
                id="advisor-qr-reader"
                className="w-full overflow-hidden rounded-lg border border-kumo-line bg-kumo-canvas text-xs"
              />
              {scannerError && (
                <div className="mt-3 text-xs text-red-600 dark:text-red-400">
                  {scannerError}
                </div>
              )}
              <p className="mt-3 text-center text-[11px] text-kumo-subtle">
                Point your device camera at the student&apos;s screen showing their milestone inspection QR code.
              </p>
            </div>

            <div className="mt-4 flex justify-end border-t border-kumo-line pt-3">
              <Button variant="secondary" size="sm" onClick={() => setShowScanner(false)}>
                Close Scanner
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Responsive Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          className="fixed z-50 transition-all duration-300 ease-out top-4 left-4 right-4 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-auto"
        >
          <div className="flex items-center gap-2.5 rounded-lg border border-kumo-line bg-kumo-base px-4 py-2.5 text-xs font-medium shadow-lg ring-1 ring-black/5">
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
    </div>
  );
}

export default function AdvisorPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-kumo-canvas">
          <span className="text-xs text-kumo-subtle">Loading Advisor Portal...</span>
        </div>
      }
    >
      <AdvisorPortalContent />
    </Suspense>
  );
}

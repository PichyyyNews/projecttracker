"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  CheckCircle,
  Clock,
  WarningCircle,
  Lock,
  ArrowRight,
  QrCode,
  Link as LinkIcon,
  FileText,
  PaperPlaneTilt,
  X,
  Sparkle,
  ChatCircleDots,
  Plus,
  CheckSquare,
  Square,
  Trash,
  Check,
  CaretLeft,
} from "@phosphor-icons/react";
import { Button, LayerCard, Badge } from "@cloudflare/kumo";
import UserAvatar from "@/components/UserAvatar";

export interface MilestoneTaskItem {
  id: number;
  milestoneId: number;
  title: string;
  isCompleted: boolean;
  assignedUserId?: number | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface MilestoneItem {
  id: number;
  projectId: number;
  stage: number; // 25, 50, 75, 100
  title: string;
  description: string | null;
  goalScope: string | null;
  deliverableLinks: string | null; // JSON string
  deliverableFiles: string | null; // JSON string
  submissionNote: string | null;
  status: "locked" | "in_progress" | "pending_inspection" | "needs_revision" | "approved";
  feedbackNotes: string | null;
  qrToken: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: number | null;
  tasks?: MilestoneTaskItem[];
  totalTasks?: number;
  completedTasks?: number;
  taskPercentage?: number;
  approver?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  } | null;
}

interface MilestoneTimelineProps {
  milestones: MilestoneItem[];
  isAdvisorOrAdmin?: boolean;
  projectInfo?: {
    name: string;
    subjectName: string;
    description?: string | null;
    advisor?: {
      name: string;
      avatarUrl?: string | null;
    } | null;
    members?: {
      id: number;
      user?: {
        name: string;
        avatarUrl?: string | null;
      };
    }[];
  };
  onRefresh?: () => void;
  onOpenEvaluationModal?: (m: MilestoneItem) => void;
  onBack?: () => void;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
  isAdvisorOrAdmin = false,
  projectInfo,
  onRefresh,
  onOpenEvaluationModal,
  onBack,
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneItem | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [linksList, setLinksList] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Milestone Sub-Tasks State
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone || !newTaskTitle.trim()) return;

    setAddingTask(true);
    try {
      const res = await fetch("/api/milestones/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: selectedMilestone.id,
          title: newTaskTitle.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add job");

      setNewTaskTitle("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add job");
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (taskId: number, currentCompleted: boolean) => {
    try {
      const res = await fetch("/api/milestones/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          isCompleted: !currentCompleted,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update job");

      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update job");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const res = await fetch(`/api/milestones/tasks?taskId=${taskId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete job");

      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete job");
    }
  };

  // QR Modal
  const [qrModalMilestone, setQrModalMilestone] = useState<MilestoneItem | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  // Auto-select the active / first non-approved milestone on load
  useEffect(() => {
    if (!selectedMilestone && milestones.length > 0) {
      const active = milestones.find((m) => m.status === "in_progress" || m.status === "pending_inspection" || m.status === "needs_revision") || milestones[0];
      setSelectedMilestone(active);
    } else if (selectedMilestone) {
      // Sync with updated prop
      const refreshed = milestones.find((m) => m.id === selectedMilestone.id);
      if (refreshed) setSelectedMilestone(refreshed);
    }
  }, [milestones]);

  // Sync inputs when selecting a milestone
  useEffect(() => {
    if (selectedMilestone) {
      setGoalInput(selectedMilestone.goalScope || "");
      setNoteInput(selectedMilestone.submissionNote || "");
      try {
        setLinksList(selectedMilestone.deliverableLinks ? JSON.parse(selectedMilestone.deliverableLinks) : []);
      } catch {
        setLinksList([]);
      }
    }
  }, [selectedMilestone]);

  // Generate QR Code data URL when opening QR Modal
  const handleOpenQrModal = async (m: MilestoneItem) => {
    setQrModalMilestone(m);
    try {
      // Build inspection URL that works both inside app or via phone camera
      const host = typeof window !== "undefined" ? window.location.origin : "";
      const verificationUrl = `${host}/advisor?inspectProject=${m.projectId}&stage=${m.stage}&token=${m.qrToken}`;
      const dataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (err) {
      console.error("Failed to generate QR code", err);
    }
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    setLinksList([...linksList, linkInput.trim()]);
    setLinkInput("");
  };

  const handleRemoveLink = (index: number) => {
    setLinksList(linksList.filter((_, i) => i !== index));
  };

  // Submit deliverables and request onsite inspection
  const handleSubmitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMilestone) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/milestones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneId: selectedMilestone.id,
          goalScope: goalInput.trim(),
          deliverableLinks: linksList,
          submissionNote: noteInput.trim(),
          action: "submit_inspection",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Submission failed");

      if (onRefresh) onRefresh();
      // Open QR code right away for student to show to advisor
      if (data.data) {
        handleOpenQrModal(data.data);
      }
    } catch (err: any) {
      alert(err.message || "Error submitting milestone");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate overall timeline percentage
  const stages = [
    { stage: 0, label: "Start (0%)" },
    ...milestones.map((m) => ({ stage: m.stage, label: `${m.stage}%` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. HORIZONTAL TIMELINE & PROJECT HEADER IN ONE CARD */}
      <LayerCard className="p-4 sm:p-5 ring ring-kumo-line rounded-xl bg-kumo-base shadow-xs">
        {projectInfo && (
          <div className="flex flex-col gap-3 border-b border-kumo-line pb-4 mb-4">
            {/* Top row: Back button + Subject & Project Name on Left, Advisor & Members on Right */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-kumo-line bg-kumo-control/60 text-kumo-subtle hover:text-kumo-default hover:bg-kumo-control hover:border-kumo-brand/40 transition-colors shrink-0"
                    title="Back to projects"
                  >
                    <CaretLeft weight="bold" size={15} />
                  </button>
                )}
                <span className="rounded bg-kumo-brand/10 px-2 py-0.5 text-[10px] font-medium text-kumo-brand shrink-0">
                  {projectInfo.subjectName}
                </span>
                <h1 className="text-base font-bold text-kumo-default truncate">{projectInfo.name}</h1>
              </div>

              {/* Advisor & Members Row */}
              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs pt-1 sm:pt-0">
                {projectInfo.advisor && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-kumo-subtle">Advisor:</span>
                    <UserAvatar
                      src={projectInfo.advisor.avatarUrl}
                      name={projectInfo.advisor.name}
                      size={20}
                    />
                    <span className="font-semibold text-kumo-default text-xs">
                      {projectInfo.advisor.name}
                    </span>
                  </div>
                )}
                {projectInfo.members && projectInfo.members.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-kumo-line">
                    <span className="text-[11px] text-kumo-subtle">Members:</span>
                    <div className="flex items-center -space-x-1.5">
                      {projectInfo.members.map((m) => (
                        <UserAvatar
                          key={m.id}
                          src={m.user?.avatarUrl}
                          name={m.user?.name}
                          size={20}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {projectInfo.description && (
              <p className="text-xs text-kumo-subtle line-clamp-2">{projectInfo.description}</p>
            )}
          </div>
        )}

        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-kumo-default">Project milestone timeline</h3>
            <p className="text-xs text-kumo-subtle">Sequential track progression from 0% to 100% completion</p>
          </div>
          <div className="flex items-center gap-2 self-start xs:self-auto">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-kumo-control text-kumo-default border border-kumo-line">
              <span className="text-kumo-brand font-semibold mr-1">
                {milestones.filter((m) => m.status === "approved").length} of {milestones.length}
              </span>{" "}
              Milestones completed
            </span>
          </div>
        </div>

        {/* Timeline Bar Track */}
        <div className="relative py-4 px-2 sm:px-4">
          {(() => {
            // Calculate overall progress along the track (0% to 100%)
            let overallTrackPercent = 0;
            const m25 = milestones.find((m) => m.stage === 25);
            const m50 = milestones.find((m) => m.stage === 50);
            const m75 = milestones.find((m) => m.stage === 75);
            const m100 = milestones.find((m) => m.stage === 100);

            const getSegmentProgress = (m?: MilestoneItem) => {
              if (!m) return 0;
              if (m.status === "approved") return 1;
              if (m.status === "in_progress" || m.status === "pending_inspection" || m.status === "needs_revision") {
                const subPct = (m.taskPercentage || 0) / 100;
                return Math.max(0.05, subPct);
              }
              return 0;
            };

            const seg1 = getSegmentProgress(m25);
            const seg2 = m25?.status === "approved" ? getSegmentProgress(m50) : 0;
            const seg3 = m50?.status === "approved" ? getSegmentProgress(m75) : 0;
            const seg4 = m75?.status === "approved" ? getSegmentProgress(m100) : 0;

            overallTrackPercent = (seg1 + seg2 + seg3 + seg4) * 25;

            return (
              <div className="relative flex items-center justify-between w-full">
                {/* Background Track Line */}
                <div className="absolute top-[18px] sm:top-5 left-4 right-4 sm:left-6 sm:right-6 h-0.5 -translate-y-1/2 bg-kumo-line z-0 pointer-events-none" />

                {/* Dynamic Active Progress Fill Bar */}
                <div
                  className="absolute top-[18px] sm:top-5 left-4 sm:left-6 h-0.5 -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-kumo-brand z-0 transition-all duration-500 ease-out pointer-events-none"
                  style={{
                    width: `calc((100% - ${typeof window !== "undefined" && window.innerWidth < 640 ? "32px" : "48px"}) * ${overallTrackPercent / 100})`,
                    maxWidth: "calc(100% - 32px)",
                  }}
                />

                {/* 0% Origin Node */}
                <div className="relative z-10 flex flex-col items-center w-14 sm:w-20">
                  <div className="rounded-full bg-kumo-base p-1 ring-2 ring-emerald-500/20 shadow-xs">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      <CheckCircle weight="fill" size={16} />
                    </div>
                  </div>
                  <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-kumo-default">0%</span>
                  <span className="text-[10px] text-kumo-subtle truncate text-center">Kickoff</span>
                </div>

            {/* Milestone Nodes (25%, 50%, 75%, 100%) */}
            {milestones.map((m) => {
              const isSelected = selectedMilestone?.id === m.id;
              const isApproved = m.status === "approved";
              const isPending = m.status === "pending_inspection";
              const isNeedsRevision = m.status === "needs_revision";
              const isInProgress = m.status === "in_progress";

              let iconNode = <Lock weight="bold" size={13} className="opacity-60" />;
              let nodeBg = "bg-kumo-control/60 text-kumo-subtle";
              let ringColor = isSelected ? "ring-kumo-brand" : "ring-kumo-line";

              if (isApproved) {
                iconNode = <CheckCircle weight="fill" size={16} />;
                nodeBg = "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
                ringColor = isSelected ? "ring-emerald-500" : "ring-emerald-500/30";
              } else if (isPending) {
                iconNode = <Clock weight="fill" size={16} />;
                nodeBg = "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 animate-pulse";
                ringColor = isSelected ? "ring-amber-500" : "ring-amber-500/30";
              } else if (isNeedsRevision) {
                iconNode = <WarningCircle weight="fill" size={16} />;
                nodeBg = "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400";
                ringColor = isSelected ? "ring-rose-500" : "ring-rose-500/30";
              } else if (isInProgress) {
                iconNode = <Sparkle weight="fill" size={16} />;
                nodeBg = "bg-kumo-brand/10 text-kumo-brand dark:bg-kumo-brand/20";
                ringColor = isSelected ? "ring-kumo-brand" : "ring-kumo-brand/30";
              }

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMilestone(m)}
                  className="relative z-10 flex flex-col items-center cursor-pointer group w-14 sm:w-20"
                >
                  <div
                    className={`rounded-full bg-kumo-base p-1 ring-2 transition-all shadow-xs ${ringColor}`}
                  >
                    <div
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ${nodeBg}`}
                    >
                      {iconNode}
                    </div>
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] sm:text-xs font-semibold transition-colors ${
                      isSelected ? "text-kumo-brand" : "text-kumo-default"
                    }`}
                  >
                    {m.stage}%
                  </span>
                  <span className="text-[10px] text-kumo-subtle truncate text-center w-full px-0.5">
                    {m.status === "approved"
                      ? "Approved"
                      : m.status === "pending_inspection"
                      ? "Inspect"
                      : m.status === "needs_revision"
                      ? "Revision"
                      : m.totalTasks && m.totalTasks > 0
                      ? `${m.completedTasks}/${m.totalTasks} jobs (${m.taskPercentage}%)`
                      : m.status === "in_progress"
                      ? "In progress"
                      : "Locked"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  </LayerCard>

      {/* 2. SELECTED MILESTONE DETAILS & SUBMISSION CARD */}
      {selectedMilestone && (
        <LayerCard className="p-4 sm:p-6 ring ring-kumo-line rounded-xl bg-kumo-base shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-kumo-line pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded bg-kumo-control px-2 py-0.5 text-[10px] font-semibold tracking-wider text-kumo-subtle uppercase">
                  Stage {selectedMilestone.stage}%
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    selectedMilestone.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : selectedMilestone.status === "pending_inspection"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : selectedMilestone.status === "needs_revision"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : selectedMilestone.status === "in_progress"
                      ? "bg-kumo-brand/10 text-kumo-brand"
                      : "bg-kumo-control text-kumo-subtle"
                  }`}
                >
                  {selectedMilestone.status === "approved"
                    ? "Approved"
                    : selectedMilestone.status === "pending_inspection"
                    ? "Awaiting Inspection"
                    : selectedMilestone.status === "needs_revision"
                    ? "Needs Revision"
                    : selectedMilestone.status === "in_progress"
                    ? "In Progress"
                    : "Locked"}
                </span>
              </div>
              <h2 className="text-base font-semibold text-kumo-default mt-1.5 leading-snug">
                {selectedMilestone.title}
              </h2>
              {selectedMilestone.description && (
                <p className="text-xs text-kumo-subtle mt-0.5">
                  {selectedMilestone.description}
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
              {/* Show QR code button if waiting for inspection or in progress */}
              {(selectedMilestone.status === "pending_inspection" || selectedMilestone.status === "in_progress") && (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => handleOpenQrModal(selectedMilestone)}
                >
                  <QrCode weight="thin" size={16} className="mr-1.5" />
                  <span>Show Onsite QR</span>
                </Button>
              )}

              {/* Advisor direct evaluation trigger if advisor */}
              {isAdvisorOrAdmin && onOpenEvaluationModal && (
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => onOpenEvaluationModal(selectedMilestone)}
                >
                  <span>Evaluate & Grade</span>
                </Button>
              )}
            </div>
          </div>

          {/* Feedback from Advisor if revisions or approved */}
          {selectedMilestone.feedbackNotes && (
            <div
              className={`rounded-lg border p-4 text-xs ${
                selectedMilestone.status === "approved"
                  ? "border-emerald-600/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
                  : "border-rose-600/20 bg-rose-500/5 text-rose-800 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold mb-1">
                <ChatCircleDots weight="thin" size={16} />
                <span>Advisor feedback note:</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{selectedMilestone.feedbackNotes}</p>
            </div>
          )}

          {/* Milestone Sub-Tasks & Work Breakdown Checklist (Flat, No Nested Card Borders) */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-kumo-default">
                    Milestone Jobs Checklist
                  </span>
                  <span className="rounded bg-kumo-control px-2 py-0.5 text-[10px] font-medium text-kumo-subtle">
                    {selectedMilestone.totalTasks || 0} jobs
                  </span>
                </div>
                <p className="text-[11px] text-kumo-subtle mt-0.5">
                  Break down this stage into specific tasks to track sub-percentage completion.
                </p>
              </div>

              {/* Job Progress & Remaining Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-start sm:items-end sm:text-right">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-kumo-brand">
                      {selectedMilestone.taskPercentage || 0}%
                    </span>
                    <span className="text-[11px] text-kumo-subtle">
                      ({selectedMilestone.completedTasks || 0}/{selectedMilestone.totalTasks || 0} done)
                    </span>
                  </div>
                  <span className="text-[10px] text-kumo-subtle">
                    {(selectedMilestone.totalTasks || 0) - (selectedMilestone.completedTasks || 0) === 0 && (selectedMilestone.totalTasks || 0) > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">All jobs finished for this stage!</span>
                    ) : (
                      <span>
                        {Math.max(0, (selectedMilestone.totalTasks || 0) - (selectedMilestone.completedTasks || 0))} job(s) remaining for {selectedMilestone.stage}%
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Progress Bar */}
            <div className="h-1 w-full bg-kumo-control rounded-full overflow-hidden">
              <div
                className="h-full bg-kumo-brand transition-all duration-300"
                style={{ width: `${selectedMilestone.taskPercentage || 0}%` }}
              />
            </div>

            {/* Task Checklist Items - Clean Flat Borderless Rows */}
            <div className="divide-y divide-kumo-line/40">
              {(!selectedMilestone.tasks || selectedMilestone.tasks.length === 0) ? (
                <div className="text-center py-3 text-xs text-kumo-subtle">
                  No sub-jobs added yet for this milestone. Add your first job below to start tracking.
                </div>
              ) : (
                selectedMilestone.tasks.map((task) => {
                  const canModify = selectedMilestone.status !== "approved" && selectedMilestone.status !== "locked";
                  return (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between py-2 px-1 hover:bg-kumo-tint/30 rounded transition-colors"
                    >
                      <button
                        type="button"
                        disabled={!canModify}
                        onClick={() => handleToggleTask(task.id, task.isCompleted)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        {task.isCompleted ? (
                          <CheckSquare weight="fill" size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Square weight="thin" size={17} className="text-kumo-subtle group-hover:text-kumo-brand shrink-0" />
                        )}
                        <span className={`text-xs truncate ${task.isCompleted ? "line-through opacity-60 text-kumo-subtle" : "text-kumo-default"}`}>
                          {task.title}
                        </span>
                      </button>

                      {canModify && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-kumo-subtle hover:text-rose-500 p-1 transition-opacity"
                          title="Delete job"
                        >
                          <Trash weight="thin" size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New Job Input */}
            {selectedMilestone.status !== "approved" && selectedMilestone.status !== "locked" && (
              <form onSubmit={handleAddTask} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add specific job or feature for this stage (e.g. Design ER Diagram, Set up Auth API)..."
                  className="flex-1 rounded border border-kumo-line bg-kumo-control py-1.5 px-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
                <Button variant="secondary" size="sm" type="submit" disabled={addingTask || !newTaskTitle.trim()}>
                  <Plus weight="thin" size={14} className="mr-1" />
                  <span>{addingTask ? "Adding..." : "Add Job"}</span>
                </Button>
              </form>
            )}
          </div>

          {/* Form for Student: Goal & Scope, Deliverables Links */}
          <form onSubmit={handleSubmitMilestone} className="space-y-4">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-kumo-default">
                Milestone goals & detailed scope
              </label>
              <textarea
                rows={3}
                disabled={selectedMilestone.status === "locked" || selectedMilestone.status === "approved"}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="Detail what your team has achieved, specific modules completed, or documentation prepared..."
                className="w-full rounded border border-kumo-line bg-kumo-control p-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none resize-none disabled:opacity-60"
                required
              />
            </div>

            {/* Links Section */}
            <div className="grid gap-2">
              <label className="text-xs font-medium text-kumo-default">
                Deliverable external links (GitHub, Figma, Google Drive, Docs)
              </label>

              {linksList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {linksList.map((link, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded border border-kumo-line bg-kumo-control py-1 px-2.5 text-xs text-kumo-default"
                    >
                      <LinkIcon weight="thin" size={13} className="text-kumo-brand shrink-0" />
                      <a href={link} target="_blank" rel="noreferrer" className="truncate max-w-[240px] hover:underline">
                        {link}
                      </a>
                      {selectedMilestone.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="text-kumo-subtle hover:text-red-500"
                        >
                          <X weight="bold" size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedMilestone.status !== "approved" && selectedMilestone.status !== "locked" && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://github.com/... or https://docs.google.com/..."
                    className="flex-1 rounded border border-kumo-line bg-kumo-control py-1.5 px-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                  />
                  <Button variant="secondary" size="sm" type="button" onClick={handleAddLink}>
                    <span>Add link</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Submission Note */}
            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-kumo-default">
                Submission note for onsite inspection
              </label>
              <input
                type="text"
                disabled={selectedMilestone.status === "locked" || selectedMilestone.status === "approved"}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Ready for onsite testing and review on Thursday afternoon."
                className="w-full rounded border border-kumo-line bg-kumo-control py-2 px-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none disabled:opacity-60"
              />
            </div>

            {/* Action Submit Button - Sticky at bottom so no need to scroll */}
            {selectedMilestone.status !== "approved" && selectedMilestone.status !== "locked" && (
              <div className="sticky bottom-0 z-20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-kumo-line bg-kumo-base/95 p-4 sm:px-6 backdrop-blur-md rounded-b-xl shadow-lg ring-1 ring-black/5">
                <span className="text-[11px] text-kumo-subtle">
                  Submitting will generate a secure QR code for onsite advisor inspection.
                </span>
                <Button variant="primary" size="sm" type="submit" disabled={submitting} className="shrink-0 w-full sm:w-auto">
                  <PaperPlaneTilt weight="thin" size={14} className="mr-1.5" />
                  <span>{submitting ? "Submitting..." : "Submit & Get Onsite QR"}</span>
                </Button>
              </div>
            )}
          </form>
        </LayerCard>
      )}

      {/* 3. ONSITE QR CODE POPUP MODAL */}
      {qrModalMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-kumo-line bg-kumo-base p-6 shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-kumo-line pb-3">
              <div className="text-left">
                <span className="font-mono text-[11px] text-kumo-subtle">ONSITE INSPECTION</span>
                <h3 className="text-sm font-semibold text-kumo-default">{qrModalMilestone.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalMilestone(null)}
                className="text-kumo-subtle hover:text-kumo-default"
              >
                <X weight="thin" size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-2">
              <div className="p-3 rounded-lg border border-kumo-line bg-white shadow-xs">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="Inspection QR Code" className="h-60 w-60 object-contain" />
                ) : (
                  <div className="flex h-60 w-60 items-center justify-center text-xs text-kumo-subtle">
                    Generating QR code...
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-kumo-subtle leading-relaxed">
                Show this QR Code to your Project Advisor during your in-person (onsite) consultation.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQrModalMilestone(null)}
              className="w-full justify-center"
            >
              <span>Close QR Window</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilestoneTimeline;

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
} from "@phosphor-icons/react";
import { Button, LayerCard, Badge } from "@cloudflare/kumo";

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
  approver?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
  } | null;
}

interface MilestoneTimelineProps {
  milestones: MilestoneItem[];
  isAdvisorOrAdmin?: boolean;
  onRefresh?: () => void;
  onOpenEvaluationModal?: (m: MilestoneItem) => void;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  milestones,
  isAdvisorOrAdmin = false,
  onRefresh,
  onOpenEvaluationModal,
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneItem | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [linksList, setLinksList] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      {/* 1. HORIZONTAL TIMELINE (Left to Right) */}
      <LayerCard className="p-5 ring ring-kumo-line rounded-xl bg-kumo-base shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-kumo-default">Project milestone timeline</h3>
            <p className="text-xs text-kumo-subtle">Sequential track progression from 0% to 100% completion</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              {milestones.filter((m) => m.status === "approved").length} of {milestones.length} Milestones passed
            </Badge>
          </div>
        </div>

        {/* Timeline Bar Track */}
        <div className="relative flex items-center justify-between min-w-[560px] py-4 px-3">
          {/* Connecting Track Line */}
          <div className="absolute top-1/2 left-8 right-8 h-1 -translate-y-1/2 bg-kumo-control -z-0" />

          {/* 0% Origin Node */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-4 ring-kumo-base">
              <CheckCircle weight="fill" size={18} />
            </div>
            <span className="mt-2 text-[11px] font-semibold text-kumo-default">0%</span>
            <span className="text-[10px] text-kumo-subtle">Kickoff</span>
          </div>

          {/* Milestone Nodes (25%, 50%, 75%, 100%) */}
          {milestones.map((m) => {
            const isSelected = selectedMilestone?.id === m.id;
            const isApproved = m.status === "approved";
            const isPending = m.status === "pending_inspection";
            const isNeedsRevision = m.status === "needs_revision";
            const isInProgress = m.status === "in_progress";
            const isLocked = m.status === "locked";

            let iconNode = <Lock weight="thin" size={16} />;
            let nodeBg = "bg-kumo-control text-kumo-subtle";

            if (isApproved) {
              iconNode = <CheckCircle weight="fill" size={18} />;
              nodeBg = "bg-emerald-500/10 text-emerald-600";
            } else if (isPending) {
              iconNode = <Clock weight="fill" size={18} />;
              nodeBg = "bg-amber-500/10 text-amber-600 animate-pulse";
            } else if (isNeedsRevision) {
              iconNode = <WarningCircle weight="fill" size={18} />;
              nodeBg = "bg-rose-500/10 text-rose-600";
            } else if (isInProgress) {
              iconNode = <Sparkle weight="fill" size={18} />;
              nodeBg = "bg-kumo-brand/10 text-kumo-brand";
            }

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMilestone(m)}
                className={`relative z-10 flex flex-col items-center cursor-pointer group transition-transform ${
                  isSelected ? "scale-105" : "hover:scale-105"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ring-4 transition-all ${nodeBg} ${
                    isSelected ? "ring-kumo-brand" : "ring-kumo-base"
                  }`}
                >
                  {iconNode}
                </div>
                <span
                  className={`mt-2 text-[11px] font-semibold transition-colors ${
                    isSelected ? "text-kumo-brand" : "text-kumo-default"
                  }`}
                >
                  {m.stage}%
                </span>
                <span className="text-[10px] text-kumo-subtle max-w-[90px] truncate text-center">
                  {m.status === "approved"
                    ? "Approved"
                    : m.status === "pending_inspection"
                    ? "Inspection"
                    : m.status === "needs_revision"
                    ? "Needs fix"
                    : m.status === "in_progress"
                    ? "In progress"
                    : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </LayerCard>

      {/* 2. SELECTED MILESTONE DETAILS & SUBMISSION CARD */}
      {selectedMilestone && (
        <LayerCard className="p-6 ring ring-kumo-line rounded-xl bg-kumo-base shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-kumo-line pb-4">
            <div>
              <div className="flex items-center gap-2">
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
              <h2 className="text-base font-semibold text-kumo-default mt-1">
                {selectedMilestone.title}
              </h2>
              <p className="text-xs text-kumo-subtle mt-0.5">
                {selectedMilestone.description}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
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

            {/* Action Submit Button */}
            {selectedMilestone.status !== "approved" && selectedMilestone.status !== "locked" && (
              <div className="flex items-center justify-between pt-3 border-t border-kumo-line">
                <span className="text-[11px] text-kumo-subtle">
                  Submitting will generate a secure QR code for onsite advisor inspection.
                </span>
                <Button variant="primary" size="sm" type="submit" disabled={submitting}>
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

"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, LayerCard, Badge } from "@cloudflare/kumo";
import {
  EnvelopeSimple,
  PaperPlaneRight,
  Shield,
  User,
  CheckCircle,
  WarningCircle,
  X,
  MagnifyingGlass,
  Plus,
  ArrowBendUpLeft,
  Lifebuoy,
  Sparkle,
  ChatCircleText,
  CaretDown,
  Check,
  Tray,
  PaperPlaneTilt,
  ClockCountdown,
  CaretLeft,
} from "@phosphor-icons/react";
import UserAvatar from "@/components/UserAvatar";
import AppNavbar from "@/components/AppNavbar";
import { USER_ROLES, UserRole } from "@/lib/roles";

interface MessageUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface MessageItem {
  id: number;
  senderId: number | null;
  receiverId: number | null;
  subject: string;
  content: string;
  type: string; // direct, system, ticket
  status: string; // unread, read, archived, resolved
  parentId: number | null;
  createdAt: string;
  sender: MessageUser;
  receiver: MessageUser | null;
  invitationInfo?: {
    projectId: number;
    status: string; // pending, accepted, rejected
    role: string;
    respondedAt?: string | null;
  } | null;
}

export default function MailPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messagesList, setMessagesList] = useState<MessageItem[]>([]);
  const [contactsList, setContactsList] = useState<MessageUser[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [activeFilter, setActiveFilter] = useState<"all" | "system" | "direct" | "tickets">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // New message / compose modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    receiverId: "system", // 'system' or user ID
    subject: "",
    content: "",
  });
  const [recipientSearch, setRecipientSearch] = useState("");
  const [isRecipientMenuOpen, setIsRecipientMenuOpen] = useState(false);
  const recipientDropdownRef = useRef<HTMLDivElement>(null);

  // Reply state
  const [replyContent, setReplyContent] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    loadMailData(activeTab);
  }, [activeTab]);

  // Close recipient dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        recipientDropdownRef.current &&
        !recipientDropdownRef.current.contains(e.target as Node)
      ) {
        setIsRecipientMenuOpen(false);
      }
    };
    if (isRecipientMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isRecipientMenuOpen]);

  const loadMailData = async (tab: "inbox" | "sent" = activeTab) => {
    setLoading(true);
    try {
      const [meRes, msgRes, usersRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/messages?tab=${tab}`),
        fetch("/api/users"),
      ]);

      const meData = await meRes.json();
      if (!meData.authenticated || !meData.user) {
        router.replace("/login");
        return;
      }
      setCurrentUser(meData.user);

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        if (msgData.success) {
          setMessagesList(msgData.data);
          if (msgData.data.length > 0) {
            setSelectedMessage((prev) => {
              if (prev) {
                const refreshed = msgData.data.find((m: MessageItem) => m.id === prev.id);
                if (refreshed) return refreshed;
              }
              return msgData.data[0];
            });
          } else {
            setSelectedMessage(null);
          }
        }
      }

      if (usersRes.ok) {
        const uData = await usersRes.json();
        if (uData.success) {
          // exclude current user from recipient choices
          setContactsList(uData.data.filter((u: any) => u.id !== meData.user.id));
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load messages", "error");
    } finally {
      setLoading(false);
    }
  };

  // Mark message as read
  const handleSelectMessage = async (msg: MessageItem) => {
    setSelectedMessage(msg);
    setMobileView("detail");
    if (msg.status === "unread" && msg.receiverId === currentUser?.id) {
      try {
        await fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: msg.id, status: "read" }),
        });
        setMessagesList((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, status: "read" } : m))
        );
      } catch (err) {
        // ignore
      }
    }
  };

  // Send Direct Message or Ticket
  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.content.trim()) return;

    setSending(true);
    try {
      const isSystemOrTicket = composeData.receiverId === "system";
      const payload = {
        receiverId: isSystemOrTicket ? null : parseInt(composeData.receiverId, 10),
        subject: composeData.subject || (isSystemOrTicket ? "Support Ticket" : "Direct Message"),
        content: composeData.content.trim(),
        type: isSystemOrTicket ? "ticket" : "direct",
      };

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }

      setIsComposeOpen(false);
      setComposeData({ receiverId: "system", subject: "", content: "" });
      setRecipientSearch("Administration");
      setIsRecipientMenuOpen(false);
      showToast(
        isSystemOrTicket
          ? "Support ticket sent to administration"
          : "Message sent successfully"
      );
      loadMailData(activeTab);
    } catch (err: any) {
      showToast(err.message || "Error sending message", "error");
    } finally {
      setSending(false);
    }
  };

  // Quick reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyContent.trim()) return;

    setSending(true);
    try {
      const isSystemSender = selectedMessage.type === "system" || selectedMessage.senderId === null;
      const targetReceiverId = isSystemSender
        ? null
        : selectedMessage.senderId === currentUser?.id
        ? selectedMessage.receiverId
        : selectedMessage.senderId;

      const payload = {
        receiverId: targetReceiverId,
        subject: `Re: ${selectedMessage.subject}`,
        content: replyContent.trim(),
        type: isSystemSender ? "ticket" : "direct",
        parentId: selectedMessage.id,
      };

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send reply");
      }

      setReplyContent("");
      showToast(
        isSystemSender
          ? "Ticket response sent to admin console"
          : "Reply sent successfully"
      );
      loadMailData(activeTab);
    } catch (err: any) {
      showToast(err.message || "Error sending reply", "error");
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messagesList.filter((m) => {
    if (activeFilter === "system" && m.type !== "system") return false;
    if (activeFilter === "direct" && m.type !== "direct") return false;
    if (activeFilter === "tickets" && m.type !== "ticket") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = m.subject.toLowerCase().includes(q);
      const matchContent = m.content.toLowerCase().includes(q);
      const matchSender = m.sender?.name?.toLowerCase().includes(q);
      const matchReceiver = m.receiver?.name?.toLowerCase().includes(q);
      return matchSubject || matchContent || matchSender || matchReceiver;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-kumo-canvas">
      <AppNavbar currentUser={currentUser} subtitle="Mail & Communications" />

      {/* Main Mail Layout */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 px-0 py-0 sm:px-6 sm:py-10">
        <LayerCard className="flex w-full flex-col overflow-hidden rounded-none border-0 bg-kumo-base shadow-none sm:rounded-xl sm:border sm:border-kumo-line sm:shadow-sm md:flex-row h-[calc(100dvh-57px)] sm:h-[680px]">
          {/* Left Column: Sidebar / Message List (hidden on mobile when viewing detail) */}
          <div
            className={`flex w-full flex-col border-b border-kumo-line md:w-80 md:border-b-0 md:border-r h-full ${
              mobileView === "detail" ? "hidden md:flex" : "flex"
            }`}
          >
            {/* Header & Compose Button */}
            <div className="flex items-center justify-between border-b border-kumo-line p-4">
              <h1 className="text-base font-semibold text-kumo-default">Mail & Chat</h1>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsComposeOpen(true)}
              >
                <Plus weight="thin" size={16} className="mr-1" />
                <span>New</span>
              </Button>
            </div>

            {/* Mail Box Tabs: Inbox vs Sent */}
            <div className="grid grid-cols-2 border-b border-kumo-line bg-kumo-control/20 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={`flex items-center justify-center gap-1.5 py-2.5 font-medium transition-colors border-b-2 ${
                  activeTab === "inbox"
                    ? "border-kumo-brand bg-kumo-base text-kumo-brand"
                    : "border-transparent text-kumo-subtle hover:text-kumo-default"
                }`}
              >
                <Tray weight="thin" size={15} />
                <span>Inbox</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("sent")}
                className={`flex items-center justify-center gap-1.5 py-2.5 font-medium transition-colors border-b-2 ${
                  activeTab === "sent"
                    ? "border-kumo-brand bg-kumo-base text-kumo-brand"
                    : "border-transparent text-kumo-subtle hover:text-kumo-default"
                }`}
              >
                <PaperPlaneTilt weight="thin" size={15} />
                <span>Sent</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-kumo-line bg-kumo-control/40 px-3 py-1.5 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeFilter === "all"
                    ? "bg-kumo-base text-kumo-brand shadow-xs"
                    : "text-kumo-subtle hover:text-kumo-default"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("system")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeFilter === "system"
                    ? "bg-kumo-base text-kumo-brand shadow-xs"
                    : "text-kumo-subtle hover:text-kumo-default"
                }`}
              >
                System
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("direct")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeFilter === "direct"
                    ? "bg-kumo-base text-kumo-brand shadow-xs"
                    : "text-kumo-subtle hover:text-kumo-default"
                }`}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("tickets")}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  activeFilter === "tickets"
                    ? "bg-kumo-base text-kumo-brand shadow-xs"
                    : "text-kumo-subtle hover:text-kumo-default"
                }`}
              >
                Tickets
              </button>
            </div>

            {/* Search Input */}
            <div className="border-b border-kumo-line p-3 shrink-0">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                  <MagnifyingGlass weight="thin" size={14} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === "sent" ? "Search sent mail..." : "Search inbox..."}
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
              </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-kumo-line">
              {loading ? (
                <div className="p-8 text-center text-xs text-kumo-subtle">Loading messages...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-kumo-subtle">
                  {activeTab === "sent" ? "No sent messages found" : "No messages found"}
                </div>
              ) : (
                filteredMessages.map((m) => {
                  const isSelected = selectedMessage?.id === m.id;
                  const isSystem = m.type === "system";
                  const isTicket = m.type === "ticket";
                  const isSentView = activeTab === "sent";
                  const counterpart = isSentView ? m.receiver : m.sender;

                  return (
                    <div
                      key={m.id}
                      onClick={() => handleSelectMessage(m)}
                      className={`cursor-pointer p-4 transition-colors select-none ${
                        isSelected
                          ? "bg-kumo-tint border-l-2 border-kumo-brand"
                          : "hover:bg-kumo-tint/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSystem ? (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kumo-control p-1 ring-1 ring-kumo-line overflow-hidden">
                              <img src="/logo.svg" alt="System Logo" className="h-full w-full object-contain" />
                            </div>
                          ) : isTicket ? (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                              <Lifebuoy weight="thin" size={16} />
                            </div>
                          ) : (
                            <UserAvatar
                              src={counterpart?.avatarUrl || null}
                              name={counterpart?.name}
                              size={28}
                            />
                          )}
                          <div className="min-w-0">
                            <span className="truncate text-xs font-semibold text-kumo-default block">
                              {isSentView ? (
                                <>
                                  <span className="text-[10px] font-normal text-kumo-subtle mr-1">To:</span>
                                  {m.receiver ? m.receiver.name : "Administration"}
                                </>
                              ) : isSystem ? (
                                "System Automated"
                              ) : (
                                m.sender?.name
                              )}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] text-kumo-subtle shrink-0">
                          {new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div className="truncate text-xs font-medium text-kumo-default">
                          {m.subject}
                        </div>
                        {/* Invitation Status Tag in List */}
                        {m.invitationInfo && (
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              m.invitationInfo.status === "accepted"
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : m.invitationInfo.status === "rejected"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {m.invitationInfo.status === "accepted"
                              ? "Accepted"
                              : m.invitationInfo.status === "rejected"
                              ? "Declined"
                              : "Pending"}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 line-clamp-2 text-xs text-kumo-subtle">
                        {m.content.replace(/\[ACCEPT_PROJECT:\d+\]\s*\[REJECT_PROJECT:\d+\]/g, "")}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Message Details & Conversation Thread */}
          <div
            className={`flex flex-1 flex-col h-full min-h-0 bg-kumo-base ${
              mobileView === "list" ? "hidden md:flex" : "flex"
            }`}
          >
            {selectedMessage ? (
              <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
                {/* Header with Back button on mobile */}
                <div className="flex items-center justify-between border-b border-kumo-line p-4 sm:p-6 shrink-0 bg-kumo-base">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Back Button on Mobile */}
                    <button
                      type="button"
                      onClick={() => setMobileView("list")}
                      className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-kumo-line text-kumo-subtle hover:text-kumo-default hover:bg-kumo-tint shrink-0 mr-1"
                      title="Back to messages"
                    >
                      <CaretLeft weight="bold" size={16} />
                    </button>

                    {selectedMessage.type === "system" ? (
                      <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-kumo-control p-1.5 ring-1 ring-kumo-line overflow-hidden">
                        <img src="/logo.svg" alt="System Logo" className="h-full w-full object-contain" />
                      </div>
                    ) : selectedMessage.type === "ticket" ? (
                      <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                        <Lifebuoy weight="thin" size={20} className="sm:hidden" />
                        <Lifebuoy weight="thin" size={24} className="hidden sm:block" />
                      </div>
                    ) : (
                      <UserAvatar
                        src={(activeTab === "sent" ? selectedMessage.receiver?.avatarUrl : selectedMessage.sender?.avatarUrl) || null}
                        name={activeTab === "sent" ? selectedMessage.receiver?.name : selectedMessage.sender?.name}
                        size={36}
                        className="rounded-full ring-1 ring-kumo-line"
                      />
                    )}

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h2 className="text-sm sm:text-base font-semibold text-kumo-default truncate">
                          {selectedMessage.subject}
                        </h2>
                        {selectedMessage.type === "system" && (
                          <Badge variant="primary">System</Badge>
                        )}
                        {selectedMessage.type === "ticket" && (
                          <Badge variant="warning">Ticket</Badge>
                        )}
                      </div>
                      <span className="text-[11px] sm:text-xs text-kumo-subtle truncate">
                        {activeTab === "sent" ? (
                          <>
                            To: <span className="text-kumo-default">{selectedMessage.receiver?.name || "Administration"}</span>
                          </>
                        ) : (
                          <>
                            From: <span className="text-kumo-default">{selectedMessage.sender?.name}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] sm:text-xs text-kumo-subtle shrink-0">
                    {new Date(selectedMessage.createdAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {/* Message Body (Scrolls independently, leaving reply box pinned at bottom) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {/* Sender View: Invitation Status Tracker */}
                  {selectedMessage.senderId === currentUser?.id && selectedMessage.invitationInfo && (
                    <div
                      className={`rounded-lg border p-3.5 sm:p-4 text-xs ${
                        selectedMessage.invitationInfo.status === "accepted"
                          ? "border-green-500/30 bg-green-500/5 text-green-800 dark:text-green-300"
                          : selectedMessage.invitationInfo.status === "rejected"
                          ? "border-red-500/30 bg-red-500/5 text-red-800 dark:text-red-300"
                          : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      <div className="font-semibold mb-1 flex items-center gap-2">
                        {selectedMessage.invitationInfo.status === "accepted" ? (
                          <CheckCircle weight="fill" size={16} className="text-green-600 dark:text-green-400" />
                        ) : selectedMessage.invitationInfo.status === "rejected" ? (
                          <WarningCircle weight="fill" size={16} className="text-red-600 dark:text-red-400" />
                        ) : (
                          <ClockCountdown weight="thin" size={16} className="text-amber-600 dark:text-amber-400" />
                        )}
                        <span>
                          {selectedMessage.invitationInfo.status === "accepted"
                            ? "Invitation Accepted"
                            : selectedMessage.invitationInfo.status === "rejected"
                            ? "Invitation Declined"
                            : "Pending Response"}
                        </span>
                      </div>
                      <p className="opacity-90 leading-relaxed text-[11px] sm:text-xs">
                        {selectedMessage.invitationInfo.status === "accepted"
                          ? `${selectedMessage.receiver?.name || "Recipient"} has accepted to join as ${selectedMessage.invitationInfo.role} in this project.`
                          : selectedMessage.invitationInfo.status === "rejected"
                          ? `${selectedMessage.receiver?.name || "Recipient"} has declined this invitation.`
                          : `Invitation was sent to ${selectedMessage.receiver?.name || "Recipient"}. Awaiting confirmation or decline.`}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-kumo-line bg-kumo-control/30 p-4 sm:p-5 text-xs text-kumo-default leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.content.replace(/\[ACCEPT_PROJECT:\d+\]\s*\[REJECT_PROJECT:\d+\]/g, "").trim()}
                  </div>

                  {/* Recipient View: Interactive Project Invitation Banner if invitation detected and pending */}
                  {selectedMessage.receiverId === currentUser?.id &&
                    selectedMessage.content.includes("[ACCEPT_PROJECT:") && (
                      (() => {
                        const match = selectedMessage.content.match(/\[ACCEPT_PROJECT:(\d+)\]/);
                        const invProjectId = match ? parseInt(match[1], 10) : null;
                        if (!invProjectId) return null;

                        const isAlreadyResponded =
                          selectedMessage.invitationInfo?.status &&
                          selectedMessage.invitationInfo.status !== "pending";

                        if (isAlreadyResponded) {
                          return (
                            <div
                              className={`rounded-lg border p-3.5 sm:p-4 text-xs ${
                                selectedMessage.invitationInfo?.status === "accepted"
                                  ? "border-green-500/30 bg-green-500/5 text-green-800 dark:text-green-300"
                                  : "border-red-500/30 bg-red-500/5 text-red-800 dark:text-red-300"
                              }`}
                            >
                              <div className="font-semibold mb-1 flex items-center gap-2">
                                <CheckCircle weight="fill" size={16} />
                                <span>
                                  {selectedMessage.invitationInfo?.status === "accepted"
                                    ? "You have accepted this invitation."
                                    : "You have declined this invitation."}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="rounded-lg border border-kumo-brand/30 bg-kumo-brand/5 p-4 text-xs">
                            <div className="font-semibold text-kumo-default mb-1 flex items-center gap-2">
                              <Sparkle weight="thin" size={16} className="text-kumo-brand" />
                              <span>Action Required: Project Invitation Response</span>
                            </div>
                            <p className="text-kumo-subtle mb-4">
                              You have been invited to collaborate on this project. Please confirm whether you accept or decline.
                            </p>
                            <div className="flex items-center gap-2.5">
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={sending}
                                onClick={async () => {
                                  setSending(true);
                                  try {
                                    const res = await fetch("/api/projects/respond", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ projectId: invProjectId, action: "accept" }),
                                    });
                                    const d = await res.json();
                                    if (d.success) {
                                      showToast("Project invitation accepted successfully!");
                                      loadMailData(activeTab);
                                    } else {
                                      showToast(d.error || "Failed to accept", "error");
                                    }
                                  } catch (e: any) {
                                    showToast(e.message || "Error", "error");
                                  } finally {
                                    setSending(false);
                                  }
                                }}
                              >
                                <Check weight="bold" size={14} className="mr-1.5" />
                                <span>Accept Invitation</span>
                              </Button>

                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={sending}
                                onClick={async () => {
                                  setSending(true);
                                  try {
                                    const res = await fetch("/api/projects/respond", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ projectId: invProjectId, action: "reject" }),
                                    });
                                    const d = await res.json();
                                    if (d.success) {
                                      showToast("Project invitation declined.");
                                      loadMailData(activeTab);
                                    } else {
                                      showToast(d.error || "Failed to decline", "error");
                                    }
                                  } catch (e: any) {
                                    showToast(e.message || "Error", "error");
                                  } finally {
                                    setSending(false);
                                  }
                                }}
                              >
                                <X weight="bold" size={14} className="mr-1.5 text-red-600" />
                                <span>Decline</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })()
                    )}

                  {selectedMessage.type === "system" && (
                    <div className="rounded-lg border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-xs text-blue-800 dark:text-blue-300">
                      <div className="font-semibold mb-1 flex items-center gap-1.5">
                        <Lifebuoy weight="thin" size={16} />
                        <span>Need assistance or have feedback?</span>
                      </div>
                      <p className="text-blue-700/80 dark:text-blue-300/80">
                        Replying to this system announcement will automatically create a <strong>Support Ticket</strong> delivered directly to the College Administrator.
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Reply Form (Always pinned at bottom, no page scrolling needed) */}
                <div className="border-t border-kumo-line p-3 sm:p-4 bg-kumo-base shrink-0">
                  <form onSubmit={handleSendReply} className="space-y-2.5">
                    <div className="relative">
                      <textarea
                        rows={2}
                        required
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={
                          selectedMessage.type === "system"
                            ? "Reply to create a support ticket for college administrators..."
                            : `Reply to ${selectedMessage.sender?.name}...`
                        }
                        className="w-full rounded-md border border-kumo-line bg-kumo-control p-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-[11px] text-kumo-subtle truncate max-w-[170px] sm:max-w-none">
                        {selectedMessage.type === "system"
                          ? "Converted to Admin Ticket"
                          : `Reply to ${selectedMessage.sender?.email || "user"}`}
                      </span>

                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        disabled={sending || !replyContent.trim()}
                      >
                        <PaperPlaneRight weight="thin" size={14} className="mr-1.5" />
                        <span>{sending ? "Sending..." : "Send"}</span>
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-12 text-center">
                <ChatCircleText weight="thin" size={48} className="text-kumo-subtle mb-3" />
                <h3 className="text-sm font-semibold text-kumo-default">No message selected</h3>
                <p className="text-xs text-kumo-subtle mt-1 max-w-xs">
                  {activeTab === "sent"
                    ? "Choose a sent message from the list to view invitation status and details."
                    : "Choose a message from the list or click New to compose a direct message or ticket."}
                </p>
              </div>
            )}
          </div>
        </LayerCard>
      </main>

      {/* Compose Message Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-kumo-line bg-kumo-base p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-kumo-line pb-3">
              <h3 className="text-sm font-semibold text-kumo-default">New Message or Support Ticket</h3>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="text-kumo-subtle hover:text-kumo-default"
              >
                <X weight="thin" size={18} />
              </button>
            </div>

            <form onSubmit={handleSendCompose} className="space-y-4">
              <div className="grid gap-1.5 relative" ref={recipientDropdownRef}>
                <label className="text-xs font-medium text-kumo-default">Recipient</label>
                
                {/* Unified Searchable Input with Inline Selected Recipient Profile */}
                <div
                  onClick={() => setIsRecipientMenuOpen(true)}
                  className={`flex items-center gap-2 rounded-md border bg-kumo-control px-2.5 py-1.5 text-xs transition-colors cursor-text ${
                    isRecipientMenuOpen ? "border-kumo-brand ring-1 ring-kumo-brand" : "border-kumo-line"
                  }`}
                >
                  {/* Selected Recipient Avatar / Icon */}
                  <div className="shrink-0 flex items-center">
                    {composeData.receiverId === "system" ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-kumo-control p-1 ring-1 ring-kumo-line overflow-hidden">
                        <img src="/logo.svg" alt="System Logo" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      (() => {
                        const user = contactsList.find((c) => c.id.toString() === composeData.receiverId);
                        return user ? (
                          <UserAvatar
                            src={user.avatarUrl || null}
                            name={user.name}
                            size={24}
                            role={user.role}
                            showRoleBadge={true}
                          />
                        ) : (
                          <div className="text-kumo-subtle">
                            <MagnifyingGlass weight="thin" size={14} />
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Input field */}
                  <input
                    type="text"
                    value={recipientSearch}
                    onFocus={() => setIsRecipientMenuOpen(true)}
                    onChange={(e) => {
                      setRecipientSearch(e.target.value);
                      setIsRecipientMenuOpen(true);
                    }}
                    placeholder="Search by name, role, email..."
                    className="flex-1 bg-transparent text-xs font-medium text-kumo-default placeholder:text-kumo-subtle placeholder:font-normal focus:outline-none min-w-0"
                  />

                  {/* Caret Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRecipientMenuOpen(!isRecipientMenuOpen);
                    }}
                    className="text-kumo-subtle hover:text-kumo-default pl-1"
                  >
                    <CaretDown
                      weight="thin"
                      size={14}
                      className={`transition-transform duration-200 ${isRecipientMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {/* Dropdown Suggestions List with Profile Photos */}
                {isRecipientMenuOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-kumo-line bg-kumo-base shadow-xl ring-1 ring-black/5 divide-y divide-kumo-line">
                    {/* 1. System Support Ticket option */}
                    {("administration support ticket".includes(recipientSearch.toLowerCase()) || !recipientSearch.trim()) && (
                      <div
                        onClick={() => {
                          setComposeData({ ...composeData, receiverId: "system" });
                          setRecipientSearch("Administration");
                          setIsRecipientMenuOpen(false);
                        }}
                        className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                          composeData.receiverId === "system" ? "bg-kumo-tint font-medium" : "hover:bg-kumo-tint/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-kumo-control p-1 ring-1 ring-kumo-line overflow-hidden">
                            <img src="/logo.svg" alt="System Logo" className="h-full w-full object-contain" />
                          </div>
                          <div>
                            <div className="font-semibold text-kumo-default">Administration</div>
                            <div className="text-[11px] text-kumo-subtle">Official Support Ticket to Admins</div>
                          </div>
                        </div>
                        {composeData.receiverId === "system" && (
                          <Check weight="bold" size={14} className="text-kumo-brand" />
                        )}
                      </div>
                    )}

                    {/* 2. Filtered User Contacts */}
                    {contactsList
                      .filter((contact) => {
                        if (!recipientSearch.trim()) return true;
                        const q = recipientSearch.toLowerCase();
                        return (
                          contact.name.toLowerCase().includes(q) ||
                          contact.email.toLowerCase().includes(q) ||
                          contact.role.toLowerCase().includes(q)
                        );
                      })
                      .map((contact) => {
                        const isSelected = composeData.receiverId === contact.id.toString();
                        return (
                          <div
                            key={contact.id}
                            onClick={() => {
                              setComposeData({ ...composeData, receiverId: contact.id.toString() });
                              setRecipientSearch(contact.name);
                              setIsRecipientMenuOpen(false);
                            }}
                            className={`flex items-center justify-between p-2.5 cursor-pointer text-xs transition-colors ${
                              isSelected ? "bg-kumo-tint font-medium" : "hover:bg-kumo-tint/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <UserAvatar
                                src={contact.avatarUrl || null}
                                name={contact.name}
                                size={28}
                                role={contact.role}
                                showRoleBadge={true}
                              />
                              <div className="min-w-0">
                                <span className="font-semibold text-kumo-default truncate block">{contact.name}</span>
                                <div className="text-[11px] text-kumo-subtle truncate">{contact.email}</div>
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

              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Subject</label>
                <input
                  type="text"
                  required
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="e.g. Project consultation request"
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Message content</label>
                <textarea
                  rows={5}
                  required
                  value={composeData.content}
                  onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                  placeholder="Write your message here..."
                  className="w-full rounded-md border border-kumo-line bg-kumo-control p-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-kumo-line">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={sending}>
                  <PaperPlaneRight weight="thin" size={14} className="mr-1.5" />
                  <span>{sending ? "Sending..." : "Send"}</span>
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
    </div>
  );
}

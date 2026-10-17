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
  Clock,
  Sparkle,
  ChatCircleText,
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
}

export default function MailPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messagesList, setMessagesList] = useState<MessageItem[]>([]);
  const [contactsList, setContactsList] = useState<MessageUser[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
    loadMailData();
  }, []);

  const loadMailData = async () => {
    try {
      const [meRes, msgRes, usersRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/messages"),
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
          if (msgData.data.length > 0 && !selectedMessage) {
            setSelectedMessage(msgData.data[0]);
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
      showToast(
        isSystemOrTicket
          ? "Support ticket sent to college admin"
          : "Message sent successfully"
      );
      loadMailData();
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
      loadMailData();
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
      const matchSender = m.sender?.name.toLowerCase().includes(q);
      return matchSubject || matchContent || matchSender;
    }
    return true;
  });

  return (
    <div className="flex min-h-screen flex-col bg-kumo-canvas">
      <AppNavbar currentUser={currentUser} subtitle="Mail & Communications" />

      {/* Main Mail Layout */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <LayerCard className="flex w-full flex-col overflow-hidden rounded-xl border border-kumo-line bg-kumo-base shadow-sm md:flex-row">
          {/* Left Column: Sidebar / Message List */}
          <div className="flex w-full flex-col border-b border-kumo-line md:w-80 md:border-b-0 md:border-r">
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

            {/* Filter Tabs */}
            <div className="flex border-b border-kumo-line bg-kumo-control/30 px-3 py-1.5 text-xs">
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
            <div className="border-b border-kumo-line p-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-kumo-subtle">
                  <MagnifyingGlass weight="thin" size={14} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mail..."
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-1.5 pl-8 pr-2.5 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none"
                />
              </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-kumo-line">
              {loading ? (
                <div className="p-8 text-center text-xs text-kumo-subtle">Loading messages...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-xs text-kumo-subtle">No messages found</div>
              ) : (
                filteredMessages.map((m) => {
                  const isSelected = selectedMessage?.id === m.id;
                  const isSystem = m.type === "system";
                  const isTicket = m.type === "ticket";

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
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                              <Sparkle weight="thin" size={16} />
                            </div>
                          ) : isTicket ? (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                              <Lifebuoy weight="thin" size={16} />
                            </div>
                          ) : (
                            <UserAvatar
                              src={m.sender?.avatarUrl || null}
                              name={m.sender?.name}
                              size={28}
                            />
                          )}
                          <span className="truncate text-xs font-semibold text-kumo-default">
                            {isSystem ? "System Automated" : m.sender?.name}
                          </span>
                        </div>

                        <span className="text-[10px] text-kumo-subtle shrink-0">
                          {new Date(m.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <div className="mt-1.5 truncate text-xs font-medium text-kumo-default">
                        {m.subject}
                      </div>

                      <div className="mt-1 line-clamp-2 text-xs text-kumo-subtle">
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Message Details & Conversation Thread */}
          <div className="flex flex-1 flex-col">
            {selectedMessage ? (
              <div className="flex flex-1 flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-kumo-line p-6">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedMessage.type === "system" ? (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        <Sparkle weight="thin" size={24} />
                      </div>
                    ) : selectedMessage.type === "ticket" ? (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                        <Lifebuoy weight="thin" size={24} />
                      </div>
                    ) : (
                      <UserAvatar
                        src={selectedMessage.sender?.avatarUrl || null}
                        name={selectedMessage.sender?.name}
                        size={44}
                        className="rounded-full ring-1 ring-kumo-line"
                      />
                    )}

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-kumo-default truncate">
                          {selectedMessage.subject}
                        </h2>
                        {selectedMessage.type === "system" && (
                          <Badge variant="primary">System</Badge>
                        )}
                        {selectedMessage.type === "ticket" && (
                          <Badge variant="warning">Support Ticket</Badge>
                        )}
                      </div>
                      <span className="text-xs text-kumo-subtle">
                        From: <span className="text-kumo-default">{selectedMessage.sender?.name}</span> ({selectedMessage.sender?.email})
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-kumo-subtle">
                    {new Date(selectedMessage.createdAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {/* Message Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="rounded-lg border border-kumo-line bg-kumo-control/30 p-5 text-xs text-kumo-default leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.content}
                  </div>

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

                {/* Quick Reply Form */}
                <div className="border-t border-kumo-line p-4 bg-kumo-base">
                  <form onSubmit={handleSendReply} className="space-y-3">
                    <div className="relative">
                      <textarea
                        rows={3}
                        required
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={
                          selectedMessage.type === "system"
                            ? "Reply to create a support ticket for college administrators..."
                            : `Reply to ${selectedMessage.sender?.name}...`
                        }
                        className="w-full rounded-md border border-kumo-line bg-kumo-control p-3 text-xs text-kumo-default placeholder:text-kumo-subtle focus:border-kumo-brand focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-kumo-subtle">
                        {selectedMessage.type === "system"
                          ? "Response will be converted to an Admin Ticket"
                          : `Direct reply to ${selectedMessage.sender?.email}`}
                      </span>

                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        disabled={sending || !replyContent.trim()}
                      >
                        <PaperPlaneRight weight="thin" size={14} className="mr-1.5" />
                        <span>{sending ? "Sending..." : "Send reply"}</span>
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
                  Choose a message from the list or click New to compose a direct message or ticket.
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
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Recipient (ผู้รับ)</label>
                <select
                  value={composeData.receiverId}
                  onChange={(e) => setComposeData({ ...composeData, receiverId: e.target.value })}
                  className="w-full rounded-md border border-kumo-line bg-kumo-control py-2 px-3 text-xs text-kumo-default focus:border-kumo-brand focus:outline-none"
                >
                  <option value="system">College Administration - Support Ticket</option>
                  <optgroup label="Colleagues & Mentors">
                    {contactsList.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({USER_ROLES[contact.role as UserRole]?.label || contact.role}) - {contact.email}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-kumo-default">Subject (หัวข้อ)</label>
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
                <label className="text-xs font-medium text-kumo-default">Message content (ข้อความ)</label>
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
            className={`flex items-center gap-2.5 rounded-lg border backdrop-blur-md px-4 py-2.5 text-xs font-medium shadow-lg ring-1 ring-black/5 ${
              toastType === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300 dark:bg-green-950/80"
                : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300 dark:bg-red-950/80"
            }`}
          >
            {toastType === "success" ? (
              <CheckCircle weight="fill" size={18} className="text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <WarningCircle weight="fill" size={18} className="text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span className="truncate">{toastMessage}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 opacity-70 hover:opacity-100"
            >
              <X weight="bold" size={14} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";

async function isPinAuthorized() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_pin_session")?.value === "authorized";
}

export async function GET() {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tickets = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        subject: messages.subject,
        content: messages.content,
        type: messages.type,
        status: messages.status,
        parentId: messages.parentId,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
      })
      .from(messages)
      .where(or(eq(messages.type, "ticket"), eq(messages.type, "system")))
      .orderBy(desc(messages.createdAt));

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        department: users.department,
        studentId: users.studentId,
      })
      .from(users);

    const userMap = new Map();
    allUsers.forEach((u) => userMap.set(u.id, u));

    const enrichedTickets = tickets.map((t) => ({
      ...t,
      sender: t.senderId ? userMap.get(t.senderId) : { id: 0, name: "System Broadcast", email: "system@internal", role: "system" },
    }));

    return NextResponse.json({ success: true, data: enrichedTickets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ticketId, status } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    await db
      .update(messages)
      .set({ status, updatedAt: new Date() })
      .where(eq(messages.id, ticketId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { receiverId, subject, content, parentId } = body;

    if (!receiverId || !content) {
      return NextResponse.json({ success: false, error: "Recipient and content required" }, { status: 400 });
    }

    // Admin replying to user ticket
    const [reply] = await db
      .insert(messages)
      .values({
        senderId: null, // System / Admin representation
        receiverId: receiverId,
        subject: subject || "Admin Support Reply",
        content: content.trim(),
        type: "ticket",
        status: "unread",
        parentId: parentId || null,
      })
      .returning();

    return NextResponse.json({ success: true, data: reply });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send response" },
      { status: 500 }
    );
  }
}

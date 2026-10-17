import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function isPinAuthorized() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_pin_session")?.value === "authorized";
}

// GET all messages across the system
export async function GET() {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allMsgs = await db
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

    const enriched = allMsgs.map((m) => ({
      ...m,
      sender: m.senderId
        ? userMap.get(m.senderId) || null
        : { id: 0, name: "System", email: "system@internal", role: "system" },
      receiver: m.receiverId
        ? userMap.get(m.receiverId) || null
        : { id: 0, name: "Administration", email: "admin@internal", role: "admin" },
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST: Send a message or Broadcast to all users
export async function POST(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { target, receiverId, subject, content, type = "system" } = body;

    if (!subject?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: "Subject and content are required" },
        { status: 400 }
      );
    }

    if (target === "broadcast") {
      // Broadcast to every user in the database
      const allUsers = await db.select({ id: users.id }).from(users);
      if (allUsers.length > 0) {
        const rowsToInsert = allUsers.map((u) => ({
          senderId: null, // null represents Administration / System
          receiverId: u.id,
          subject: subject.trim(),
          content: content.trim(),
          type: "system",
          status: "unread",
        }));
        await db.insert(messages).values(rowsToInsert);
      }
      return NextResponse.json({
        success: true,
        broadcastCount: allUsers.length,
      });
    }

    // Direct message from Administration to specific user
    const targetUserId = receiverId ? parseInt(receiverId, 10) : null;
    const [inserted] = await db
      .insert(messages)
      .values({
        senderId: null, // null represents Administration
        receiverId: targetUserId,
        subject: subject.trim(),
        content: content.trim(),
        type: type || "direct",
        status: "unread",
      })
      .returning();

    return NextResponse.json({ success: true, data: inserted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}

// PATCH: Edit any message (subject, content, status, type)
export async function PATCH(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, subject, content, status, type } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Message ID is required" },
        { status: 400 }
      );
    }

    const updateFields: any = { updatedAt: new Date() };
    if (subject !== undefined) updateFields.subject = subject.trim();
    if (content !== undefined) updateFields.content = content.trim();
    if (status !== undefined) updateFields.status = status;
    if (type !== undefined) updateFields.type = type;

    const [updated] = await db
      .update(messages)
      .set(updateFields)
      .where(eq(messages.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update message" },
      { status: 500 }
    );
  }
}

// DELETE: Remove any message
export async function DELETE(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Message ID is required" },
        { status: 400 }
      );
    }

    await db.delete(messages).where(eq(messages.id, parseInt(id, 10)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete message" },
      { status: 500 }
    );
  }
}

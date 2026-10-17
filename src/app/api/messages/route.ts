import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { messages, users } from "@/db/schema";
import { eq, or, desc, and, isNull } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all"; // all, system, direct, tickets

    // Fetch inbox messages where user is receiver or system announcements
    const userMessages = await db
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
      .where(
        or(
          eq(messages.receiverId, payload.id),
          and(eq(messages.type, "system"), or(isNull(messages.receiverId), eq(messages.receiverId, payload.id)))
        )
      )
      .orderBy(desc(messages.createdAt));

    // Get all unique user IDs involved to populate sender info
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
      })
      .from(users);

    const userMap = new Map();
    allUsers.forEach((u) => userMap.set(u.id, u));

    const enrichedMessages = userMessages.map((msg) => {
      const sender = msg.senderId ? userMap.get(msg.senderId) : null;
      const receiver = msg.receiverId ? userMap.get(msg.receiverId) : null;
      return {
        ...msg,
        sender: sender
          ? { id: sender.id, name: sender.name, email: sender.email, role: sender.role, avatarUrl: sender.avatarUrl }
          : { id: 0, name: "System", email: "system@projecttracker.internal", role: "system", avatarUrl: null },
        receiver: receiver
          ? { id: receiver.id, name: receiver.name, email: receiver.email, role: receiver.role, avatarUrl: receiver.avatarUrl }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedMessages,
      currentUser: { id: payload.id, role: payload.role },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, subject, content, type = "direct", parentId = null } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 });
    }

    // Determine type: If user is replying to system, type becomes "ticket"
    let finalType = type;
    let finalReceiverId = receiverId;

    if (type === "system" || receiverId === 0 || receiverId === null) {
      finalType = "ticket";
      finalReceiverId = null; // null receiver indicates ticket routed to Admin console
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        senderId: payload.id,
        receiverId: finalReceiverId,
        subject: subject || (finalType === "ticket" ? "Support Ticket" : "Direct Message"),
        content: content.trim(),
        type: finalType,
        status: "unread",
        parentId: parentId,
      })
      .returning();

    return NextResponse.json({ success: true, data: newMessage });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messageId, status } = body;

    if (!messageId || !status) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    await db
      .update(messages)
      .set({ status, updatedAt: new Date() })
      .where(eq(messages.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update message" },
      { status: 500 }
    );
  }
}

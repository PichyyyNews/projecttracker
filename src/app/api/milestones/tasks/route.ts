import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { milestoneTasks, milestones, projects, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// POST /api/milestones/tasks - Add a new task to milestone
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { milestoneId, title } = body;

    if (!milestoneId || !title?.trim()) {
      return NextResponse.json({ success: false, error: "milestoneId and title required" }, { status: 400 });
    }

    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
    if (!milestone) return NextResponse.json({ success: false, error: "Milestone not found" }, { status: 404 });

    if (milestone.status === "approved" || milestone.status === "locked") {
      return NextResponse.json({ success: false, error: "Cannot add task to locked or approved milestone" }, { status: 400 });
    }

    const [newTask] = await db
      .insert(milestoneTasks)
      .values({
        milestoneId,
        title: title.trim(),
        assignedUserId: payload.id,
        isCompleted: false,
      })
      .returning();

    return NextResponse.json({ success: true, data: newTask });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/milestones/tasks - Toggle task completion status or update title
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { taskId, isCompleted, title } = body;

    if (!taskId) return NextResponse.json({ success: false, error: "taskId required" }, { status: 400 });

    const [task] = await db.select().from(milestoneTasks).where(eq(milestoneTasks.id, taskId));
    if (!task) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

    const updateData: any = { updatedAt: new Date() };
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted;
      updateData.completedAt = isCompleted ? new Date() : null;
    }
    if (title !== undefined && title.trim()) {
      updateData.title = title.trim();
    }

    const [updated] = await db
      .update(milestoneTasks)
      .set(updateData)
      .where(eq(milestoneTasks.id, taskId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/milestones/tasks - Delete a task
export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const taskIdParam = url.searchParams.get("taskId");
    if (!taskIdParam) return NextResponse.json({ success: false, error: "taskId required" }, { status: 400 });

    const taskId = parseInt(taskIdParam, 10);
    await db.delete(milestoneTasks).where(eq(milestoneTasks.id, taskId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

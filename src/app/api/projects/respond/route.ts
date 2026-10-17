import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { projectMembers, projects, messages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
    const { projectId, action } = body; // action: 'accept' or 'reject'

    if (!projectId || !action || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Valid projectId and action ('accept' | 'reject') are required" }, { status: 400 });
    }

    const targetStatus = action === "accept" ? "accepted" : "rejected";

    // Update project_members table
    const [updatedMember] = await db
      .update(projectMembers)
      .set({
        status: targetStatus,
        respondedAt: new Date(),
      })
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, payload.id)
        )
      )
      .returning();

    if (!updatedMember) {
      return NextResponse.json({ success: false, error: "Invitation not found or you are not a member of this project" }, { status: 404 });
    }

    // If an advisor rejects, remove them from projects.advisorId
    if (updatedMember.role === "advisor" && action === "reject") {
      await db
        .update(projects)
        .set({ advisorId: null })
        .where(eq(projects.id, projectId));
    }

    // Check all members status for this project
    const allMembers = await db
      .select({ status: projectMembers.status })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    // If there are NO pending members left and at least one accepted member, transition project to active
    const hasPending = allMembers.some((m) => m.status === "pending");
    const hasAccepted = allMembers.some((m) => m.status === "accepted");

    if (!hasPending && hasAccepted) {
      await db
        .update(projects)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    // Get project details to send feedback message back to creator
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (project && project.creatorId) {
      const verb = action === "accept" ? "accepted" : "declined";
      await db.insert(messages).values({
        senderId: payload.id,
        receiverId: project.creatorId,
        subject: `Project Invitation ${action === "accept" ? "Accepted" : "Declined"}: ${project.name}`,
        content: `${payload.name} has ${verb} the invitation for project "${project.name}".`,
        type: "direct",
        status: "unread",
      });
    }

    return NextResponse.json({
      success: true,
      message: `You have successfully ${action === "accept" ? "accepted" : "declined"} the invitation.`,
      data: updatedMember,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}

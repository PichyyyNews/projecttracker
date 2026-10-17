import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, milestones, messages, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { milestoneId, qrToken, action, feedbackNotes } = body; // action: 'approve' | 'revise'

    if (!milestoneId || !action || !["approve", "revise"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
    if (!milestone) {
      return NextResponse.json({ success: false, error: "Milestone not found" }, { status: 404 });
    }

    // Verify QR token matches if token was provided
    if (qrToken && milestone.qrToken && qrToken !== milestone.qrToken) {
      return NextResponse.json({ success: false, error: "Invalid or expired QR token" }, { status: 403 });
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, milestone.projectId));
    if (!project) return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });

    // Verify caller is advisor or admin
    const isAdvisor = project.advisorId === payload.id;
    const isAdmin = payload.role === "admin";
    if (!isAdvisor && !isAdmin) {
      return NextResponse.json({ success: false, error: "Only project advisor or admin can evaluate onsite" }, { status: 403 });
    }

    if (action === "approve") {
      // 1. Mark current milestone as approved
      await db
        .update(milestones)
        .set({
          status: "approved",
          feedbackNotes: feedbackNotes || null,
          approvedAt: new Date(),
          approvedBy: payload.id,
          updatedAt: new Date(),
        })
        .where(eq(milestones.id, milestone.id));

      // 2. Unlock next milestone sequentially (25 -> 50 -> 75 -> 100)
      const nextStages: Record<number, number> = { 25: 50, 50: 75, 75: 100 };
      const nextStage = nextStages[milestone.stage];
      if (nextStage) {
        await db
          .update(milestones)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(and(eq(milestones.projectId, project.id), eq(milestones.stage, nextStage)));
      } else if (milestone.stage === 100) {
        // Project 100% completed
        await db
          .update(projects)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(projects.id, project.id));
      }

      // Notify project creator
      await db.insert(messages).values({
        senderId: payload.id,
        receiverId: project.creatorId,
        subject: `Milestone Passed (${milestone.stage}%): ${project.name}`,
        content: `Congratulations! Advisor ${payload.name} has approved ${milestone.title} onsite.\n\nFeedback: ${feedbackNotes || "Great work! Proceed to the next milestone."}`,
        type: "direct",
        status: "unread",
      });

      return NextResponse.json({
        success: true,
        message: `${milestone.title} approved successfully. Next stage unlocked!`,
      });
    }

    if (action === "revise") {
      // Mark as needs_revision so students can revise
      await db
        .update(milestones)
        .set({
          status: "needs_revision",
          feedbackNotes: feedbackNotes || "Revision requested by advisor onsite.",
          updatedAt: new Date(),
        })
        .where(eq(milestones.id, milestone.id));

      // Notify project creator
      await db.insert(messages).values({
        senderId: payload.id,
        receiverId: project.creatorId,
        subject: `Milestone Needs Revision (${milestone.stage}%): ${project.name}`,
        content: `Advisor ${payload.name} inspected ${milestone.title} onsite and requested adjustments.\n\nPoints to improve:\n${feedbackNotes || "Please review the feedback and resubmit."}`,
        type: "direct",
        status: "unread",
      });

      return NextResponse.json({
        success: true,
        message: "Revision requested. Student notified.",
      });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

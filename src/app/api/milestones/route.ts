import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, milestones, users, messages, milestoneTasks } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import crypto from "crypto";

const DEFAULT_STAGES = [
  { stage: 25, title: "Milestone 1 (25%): Proposal & Requirements", description: "Project proposal, scope definition, requirements analysis, and advisor alignment." },
  { stage: 50, title: "Milestone 2 (50%): System Architecture & Design", description: "Database schema, UI/UX prototype, system architecture, and module breakdown." },
  { stage: 75, title: "Milestone 3 (75%): Implementation & Core Features", description: "Functional development, core integrations, initial testing, and code review." },
  { stage: 100, title: "Milestone 4 (100%): Final Deliverable & Defense", description: "Fully deployed application, user acceptance testing, final report, and project defense." },
];

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const projectIdParam = url.searchParams.get("projectId");
    if (!projectIdParam) return NextResponse.json({ success: false, error: "projectId required" }, { status: 400 });

    const projectId = parseInt(projectIdParam, 10);

    // Verify user is member, advisor, or admin
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });

    // Fetch existing milestones
    let projectMilestones = await db
      .select()
      .from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(milestones.stage);

    // If no milestones exist yet, auto-seed the 4 default stages
    if (projectMilestones.length === 0) {
      const rowsToInsert = DEFAULT_STAGES.map((s, index) => ({
        projectId,
        stage: s.stage,
        title: s.title,
        description: s.description,
        status: index === 0 ? "in_progress" : "locked",
        qrToken: crypto.randomBytes(16).toString("hex"),
      }));

      await db.insert(milestones).values(rowsToInsert);

      projectMilestones = await db
        .select()
        .from(milestones)
        .where(eq(milestones.projectId, projectId))
        .orderBy(milestones.stage);
    }

    // Fetch all sub-tasks for these milestones
    const milestoneIds = projectMilestones.map((m) => m.id);
    let allTasks: any[] = [];
    if (milestoneIds.length > 0) {
      allTasks = await db
        .select()
        .from(milestoneTasks)
        .where(inArray(milestoneTasks.milestoneId, milestoneIds))
        .orderBy(milestoneTasks.createdAt);
    }

    // Enrich with approver details & sub-tasks
    const approverIds = projectMilestones.map((m) => m.approvedBy).filter(Boolean) as number[];
    let approverMap = new Map();
    if (approverIds.length > 0) {
      const approvers = await db.select().from(users);
      approvers.forEach((u) => approverMap.set(u.id, u));
    }

    const enriched = projectMilestones.map((m) => {
      const mTasks = allTasks.filter((t) => t.milestoneId === m.id);
      const totalTasks = mTasks.length;
      const completedTasks = mTasks.filter((t) => t.isCompleted).length;
      const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...m,
        tasks: mTasks,
        totalTasks,
        completedTasks,
        taskPercentage,
        approver: m.approvedBy ? approverMap.get(m.approvedBy) : null,
      };
    });

    return NextResponse.json({ success: true, data: enriched, project });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Student submit or update milestone goals / deliverables
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { milestoneId, goalScope, deliverableLinks, deliverableFiles, submissionNote, action } = body;

    if (!milestoneId) return NextResponse.json({ success: false, error: "milestoneId required" }, { status: 400 });

    const [currentMilestone] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
    if (!currentMilestone) return NextResponse.json({ success: false, error: "Milestone not found" }, { status: 404 });

    const updateData: any = { updatedAt: new Date() };
    if (goalScope !== undefined) updateData.goalScope = goalScope;
    if (deliverableLinks !== undefined) updateData.deliverableLinks = JSON.stringify(deliverableLinks);
    if (deliverableFiles !== undefined) updateData.deliverableFiles = JSON.stringify(deliverableFiles);
    if (submissionNote !== undefined) updateData.submissionNote = submissionNote;

    // If student triggers submit for onsite inspection
    if (action === "submit_inspection") {
      updateData.status = "pending_inspection";
      updateData.submittedAt = new Date();
      // Generate a fresh QR verification token
      updateData.qrToken = crypto.randomBytes(16).toString("hex");

      // Notify advisor in Mail
      const [project] = await db.select().from(projects).where(eq(projects.id, currentMilestone.projectId));
      if (project && project.advisorId) {
        await db.insert(messages).values({
          senderId: payload.id,
          receiverId: project.advisorId,
          subject: `Onsite Inspection Ready: ${project.name} (${currentMilestone.stage}%)`,
          content: `Team "${project.name}" has submitted deliverables for ${currentMilestone.title}.\n\nPlease inspect onsite and scan the student's QR Code to approve or request revision.`,
          type: "direct",
          status: "unread",
        });
      }
    }

    const [updated] = await db
      .update(milestones)
      .set(updateData)
      .where(eq(milestones.id, milestoneId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

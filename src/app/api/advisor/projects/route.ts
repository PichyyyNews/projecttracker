import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, milestones, users, milestoneTasks } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = await verifySession(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // Verify role is advisor, instructor, or admin
    if (!["advisor", "instructor", "admin"].includes(payload.role)) {
      return NextResponse.json({ success: false, error: "Access restricted to project advisors and instructors" }, { status: 403 });
    }

    // Find all projects where this user is advisor
    let advisingProjects: any[] = [];
    if (payload.role === "admin") {
      advisingProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
    } else {
      advisingProjects = await db.select().from(projects).where(eq(projects.advisorId, payload.id)).orderBy(desc(projects.createdAt));
    }

    const projectIds = advisingProjects.map((p) => p.id);
    let allMilestones: any[] = [];
    let allMembers: any[] = [];
    let allMilestoneTasks: any[] = [];

    if (projectIds.length > 0) {
      allMilestones = await db.select().from(milestones).where(inArray(milestones.projectId, projectIds));
      allMembers = await db.select().from(projectMembers).where(inArray(projectMembers.projectId, projectIds));
      const mIds = allMilestones.map((m) => m.id);
      if (mIds.length > 0) {
        allMilestoneTasks = await db.select().from(milestoneTasks).where(inArray(milestoneTasks.milestoneId, mIds));
      }
    }

    const allUsers = await db.select().from(users);
    const userMap = new Map();
    allUsers.forEach((u) => userMap.set(u.id, u));

    const enriched = advisingProjects.map((p) => {
      const pMilestones = allMilestones
        .filter((m) => m.projectId === p.id)
        .sort((a, b) => a.stage - b.stage)
        .map((m) => {
          const mTasks = allMilestoneTasks.filter((t) => t.milestoneId === m.id);
          const totalTasks = mTasks.length;
          const completedTasks = mTasks.filter((t) => t.isCompleted).length;
          const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return {
            ...m,
            tasks: mTasks,
            totalTasks,
            completedTasks,
            taskPercentage,
          };
        });

      const pMembers = allMembers
        .filter((m) => m.projectId === p.id)
        .map((m) => ({
          ...m,
          user: userMap.get(m.userId),
        }));

      // Calculate progress percentage based on highest approved milestone
      const approvedMilestones = pMilestones.filter((m) => m.status === "approved");
      const currentProgress = approvedMilestones.length > 0
        ? Math.max(...approvedMilestones.map((m) => m.stage))
        : 0;

      // Pending inspection milestone
      const pendingMilestone = pMilestones.find((m) => m.status === "pending_inspection");

      return {
        ...p,
        creator: userMap.get(p.creatorId),
        advisor: p.advisorId ? userMap.get(p.advisorId) : null,
        members: pMembers,
        milestones: pMilestones,
        currentProgress,
        pendingMilestone: pendingMilestone || null,
        needsInspection: Boolean(pendingMilestone),
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      stats: {
        total: enriched.length,
        needsInspectionCount: enriched.filter((p) => p.needsInspection).length,
        completedCount: enriched.filter((p) => p.currentProgress === 100).length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

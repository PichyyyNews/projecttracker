import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { projects, projectMembers, messages, users } from "@/db/schema";
import { eq, desc, or, and, inArray } from "drizzle-orm";

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

    // Find projects where user is creator or an accepted member/advisor
    // 1. Find project IDs where user is accepted member
    const acceptedMemberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.userId, payload.id),
          eq(projectMembers.status, "accepted")
        )
      );

    const acceptedProjectIds = acceptedMemberships.map((m) => m.projectId);

    // 2. Fetch projects
    let userProjects: any[] = [];
    if (acceptedProjectIds.length > 0) {
      userProjects = await db
        .select()
        .from(projects)
        .where(
          or(
            eq(projects.creatorId, payload.id),
            inArray(projects.id, acceptedProjectIds)
          )
        )
        .orderBy(desc(projects.createdAt));
    } else {
      userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.creatorId, payload.id))
        .orderBy(desc(projects.createdAt));
    }

    // 3. Enrich projects with creator, advisor, and members
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        department: users.department,
        major: users.major,
      })
      .from(users);

    const userMap = new Map();
    allUsers.forEach((u) => userMap.set(u.id, u));

    // Get all members for these projects
    const allProjectIds = userProjects.map((p) => p.id);
    let allMembers: any[] = [];
    if (allProjectIds.length > 0) {
      allMembers = await db
        .select()
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, allProjectIds));
    }

    const enriched = userProjects.map((p) => {
      const pMembers = allMembers
        .filter((m) => m.projectId === p.id)
        .map((m) => ({
          ...m,
          user: userMap.get(m.userId),
        }));

      return {
        ...p,
        creator: userMap.get(p.creatorId),
        advisor: p.advisorId ? userMap.get(p.advisorId) : null,
        members: pMembers,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch projects" },
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
    const { name, subjectName, description, memberIds = [], advisorId = null } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Project name is required" }, { status: 400 });
    }

    if (!subjectName || !subjectName.trim()) {
      return NextResponse.json({ success: false, error: "Subject / course name is required" }, { status: 400 });
    }

    // 1. Create project
    const [newProject] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        subjectName: subjectName.trim(),
        description: description ? description.trim() : null,
        creatorId: payload.id,
        advisorId: advisorId ? parseInt(advisorId, 10) : null,
        status: "pending",
      })
      .returning();

    // 2. Add creator as leader member (auto-accepted)
    await db.insert(projectMembers).values({
      projectId: newProject.id,
      userId: payload.id,
      role: "leader",
      status: "accepted",
      respondedAt: new Date(),
    });

    // 3. Add members with status 'pending' and send invitation mail
    const validMemberIds = Array.isArray(memberIds)
      ? memberIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id) && id !== payload.id)
      : [];

    for (const memId of validMemberIds) {
      await db.insert(projectMembers).values({
        projectId: newProject.id,
        userId: memId,
        role: "member",
        status: "pending",
      });

      // Send invitation message to member's mail
      await db.insert(messages).values({
        senderId: payload.id,
        receiverId: memId,
        subject: `Project Invitation: ${newProject.name}`,
        content: `You have been invited by ${payload.name} to join project "${newProject.name}" in course "${newProject.subjectName}".\n\nPlease review and respond to this invitation:\n[ACCEPT_PROJECT:${newProject.id}] [REJECT_PROJECT:${newProject.id}]`,
        type: "direct",
        status: "unread",
      });
    }

    // 4. Add advisor with status 'pending' if selected and send request mail
    if (advisorId) {
      const parsedAdvisorId = parseInt(advisorId, 10);
      if (!isNaN(parsedAdvisorId)) {
        await db.insert(projectMembers).values({
          projectId: newProject.id,
          userId: parsedAdvisorId,
          role: "advisor",
          status: "pending",
        });

        // Send advisor request message to advisor's mail
        await db.insert(messages).values({
          senderId: payload.id,
          receiverId: parsedAdvisorId,
          subject: `Advisor Request: ${newProject.name}`,
          content: `${payload.name} has requested you to be the project advisor for "${newProject.name}" in course "${newProject.subjectName}".\n\nPlease review and respond to this request:\n[ACCEPT_PROJECT:${newProject.id}] [REJECT_PROJECT:${newProject.id}]`,
          type: "direct",
          status: "unread",
        });
      }
    }

    return NextResponse.json({ success: true, data: newProject }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create project" },
      { status: 500 }
    );
  }
}

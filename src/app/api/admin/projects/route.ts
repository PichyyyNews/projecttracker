import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { projects, projectMembers, users, tasks } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

async function isPinAuthorized() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_pin_session")?.value === "authorized";
}

export async function GET() {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

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

    const allMemberships = await db.select().from(projectMembers);

    const enriched = allProjects.map((p) => {
      const pMembers = allMemberships
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
      { success: false, error: error.message || "Failed to fetch admin projects" },
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
    const { id, name, subjectName, description, status, tier, advisorId } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    const updateFields: any = { updatedAt: new Date() };
    if (name !== undefined) updateFields.name = name.trim();
    if (subjectName !== undefined) updateFields.subjectName = subjectName.trim();
    if (description !== undefined) updateFields.description = description ? description.trim() : null;
    if (status !== undefined) updateFields.status = status;
    if (tier !== undefined) updateFields.tier = tier;
    if (advisorId !== undefined) updateFields.advisorId = advisorId ? parseInt(advisorId, 10) : null;

    const [updated] = await db
      .update(projects)
      .set(updateFields)
      .where(eq(projects.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    await db.delete(projects).where(eq(projects.id, parseInt(id, 10)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { departments, academicClasses } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

async function isPinAuthorized() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_pin_session")?.value === "authorized";
}

// GET: Fetch all departments and academic classes (Accessible to users for profile dropdowns & admin)
export async function GET() {
  try {
    const [deptList, classList] = await Promise.all([
      db.select().from(departments).orderBy(asc(departments.name)),
      db.select().from(academicClasses).orderBy(asc(academicClasses.yearLevel), asc(academicClasses.studyGroup)),
    ]);

    return NextResponse.json({
      success: true,
      departments: deptList,
      academicClasses: classList,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Add new department or academic class (Admin only)
export async function POST(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, name, yearLevel, studyGroup, major } = body;

    if (type === "department") {
      if (!name) return NextResponse.json({ success: false, error: "Department name required" }, { status: 400 });
      const [newDept] = await db.insert(departments).values({ name: name.trim() }).returning();
      return NextResponse.json({ success: true, data: newDept });
    }

    if (type === "academic_class") {
      if (!yearLevel || !studyGroup || !major) {
        return NextResponse.json({ success: false, error: "All class fields are required" }, { status: 400 });
      }
      const [newClass] = await db
        .insert(academicClasses)
        .values({
          yearLevel: yearLevel.trim(),
          studyGroup: studyGroup.trim(),
          major: major.trim(),
        })
        .returning();
      return NextResponse.json({ success: true, data: newClass });
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete department or academic class (Admin only)
export async function DELETE(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    if (type === "department") {
      await db.delete(departments).where(eq(departments.id, Number(id)));
      return NextResponse.json({ success: true });
    }

    if (type === "academic_class") {
      await db.delete(academicClasses).where(eq(academicClasses.id, Number(id)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

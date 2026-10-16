import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const payload = await verifySession(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        avatarUrl: users.avatarUrl,
        studentId: users.studentId,
        phone: users.phone,
        department: users.department,
        major: users.major,
        yearLevel: users.yearLevel,
        studyGroup: users.studyGroup,
      })
      .from(users)
      .where(eq(users.id, payload.id));

    if (!user || user.status === "suspended") {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

export async function POST() {
  // Logout
  const response = NextResponse.json({ success: true });
  response.cookies.delete("auth_token");
  return response;
}

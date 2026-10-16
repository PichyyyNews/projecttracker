import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_PIN = "030347";

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    if (pin !== ADMIN_PIN) {
      return NextResponse.json({ success: false, error: "Invalid PIN code" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: "admin_pin_session",
      value: "authorized",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_pin_session")?.value;
  return NextResponse.json({ authorized: session === "authorized" });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin_pin_session");
  return response;
}

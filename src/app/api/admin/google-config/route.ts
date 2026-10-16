import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

async function isPinAuthorized() {
  const cookieStore = await cookies();
  return cookieStore.get("admin_pin_session")?.value === "authorized";
}

export async function GET() {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await db
      .select()
      .from(systemConfigs)
      .where(
        inArray(systemConfigs.key, [
          "google_client_id",
          "google_client_secret",
          "google_redirect_uri",
        ])
      );

    const configMap: Record<string, string> = {
      google_client_id: "",
      google_client_secret: "",
      google_redirect_uri: "http://localhost:3000/api/auth/google/callback",
    };

    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    // Mask secret for safety in view
    return NextResponse.json({
      success: true,
      data: {
        google_client_id: configMap["google_client_id"] || process.env.GOOGLE_CLIENT_ID || "",
        google_client_secret: configMap["google_client_secret"]
          ? "••••••••••••••••"
          : process.env.GOOGLE_CLIENT_SECRET
          ? "••••••••••••••••"
          : "",
        google_redirect_uri:
          configMap["google_redirect_uri"] ||
          process.env.GOOGLE_REDIRECT_URI ||
          "http://localhost:3000/api/auth/google/callback",
        is_configured: Boolean(
          configMap["google_client_id"] || process.env.GOOGLE_CLIENT_ID
        ),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isPinAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { google_client_id, google_client_secret, google_redirect_uri } = await req.json();

    const upsertConfig = async (key: string, value: string, description?: string) => {
      if (!value || value.startsWith("••••")) return;
      const [existing] = await db.select().from(systemConfigs).where(eq(systemConfigs.key, key));
      if (existing) {
        await db
          .update(systemConfigs)
          .set({ value, updatedAt: new Date() })
          .where(eq(systemConfigs.key, key));
      } else {
        await db.insert(systemConfigs).values({ key, value, description });
      }
    };

    if (google_client_id !== undefined) {
      await upsertConfig("google_client_id", google_client_id, "Google OAuth 2.0 Client ID");
    }
    if (google_client_secret !== undefined && !google_client_secret.startsWith("••••")) {
      await upsertConfig("google_client_secret", google_client_secret, "Google OAuth 2.0 Client Secret");
    }
    if (google_redirect_uri !== undefined) {
      await upsertConfig("google_redirect_uri", google_redirect_uri, "Google OAuth 2.0 Redirect URI");
    }

    return NextResponse.json({ success: true, message: "Configuration updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

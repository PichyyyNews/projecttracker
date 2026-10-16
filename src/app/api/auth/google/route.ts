import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = searchParams.get("origin") || "http://localhost:3000";

    // Read config from DB or fallback to ENV
    const configs = await db
      .select()
      .from(systemConfigs)
      .where(inArray(systemConfigs.key, ["google_client_id", "google_redirect_uri"]));

    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    const clientId = configMap["google_client_id"] || process.env.GOOGLE_CLIENT_ID;
    const redirectUri =
      configMap["google_redirect_uri"] ||
      process.env.GOOGLE_REDIRECT_URI ||
      `${origin}/api/auth/google/callback`;

    if (!clientId) {
      return NextResponse.json(
        {
          configured: false,
          error: "Google OAuth is not configured yet. Configure Client ID in Admin settings.",
        },
        { status: 400 }
      );
    }

    const scope = encodeURIComponent("openid email profile");
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    return NextResponse.json({
      configured: true,
      url: googleAuthUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { configured: false, error: error.message || "Failed to initialize Google Auth" },
      { status: 500 }
    );
  }
}

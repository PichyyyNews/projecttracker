import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfigs, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { signSession, SESSION_MAX_AGE } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Google+login+cancelled`);
  }

  try {
    const configs = await db
      .select()
      .from(systemConfigs)
      .where(inArray(systemConfigs.key, ["google_client_id", "google_client_secret", "google_redirect_uri"]));

    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    const clientId = configMap["google_client_id"] || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = configMap["google_client_secret"] || process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      configMap["google_redirect_uri"] ||
      process.env.GOOGLE_REDIRECT_URI ||
      `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${origin}/login?error=Google+OAuth+credentials+not+configured`
      );
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(tokenData.error_description || "Google token exchange failed")}`
      );
    }

    // Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return NextResponse.redirect(`${origin}/login?error=Unable+to+retrieve+email+from+Google`);
    }

    // Check or upsert user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, profile.email.toLowerCase()));

    let userToSign = existingUser;

    if (!existingUser) {
      const [created] = await db
        .insert(users)
        .values({
          name: profile.name || profile.email.split("@")[0],
          email: profile.email.toLowerCase(),
          avatarUrl: profile.picture || null,
          role: "user",
          provider: "google",
          status: "active",
        })
        .returning();
      userToSign = created;
    } else {
      if (existingUser.status === "suspended") {
        return NextResponse.redirect(`${origin}/login?error=Your+account+has+been+suspended`);
      }
      // Update avatar if provided
      if (profile.picture && !existingUser.avatarUrl) {
        await db
          .update(users)
          .set({ avatarUrl: profile.picture })
          .where(eq(users.id, existingUser.id));
      }
    }

    const token = await signSession({
      id: userToSign.id,
      email: userToSign.email,
      name: userToSign.name,
      role: userToSign.role,
    });

    const res = NextResponse.redirect(`${origin}/`);
    res.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (error: any) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message || "OAuth processing failed")}`
    );
  }
}

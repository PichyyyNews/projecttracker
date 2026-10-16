import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "projecttracker-secret-key-at-least-32-chars-long!"
);

// 30 Days Persistent Session (2,592,000 seconds)
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function signSession(payload: { id: number; email: string; name: string; role: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { id: number; email: string; name: string; role: string };
  } catch (error) {
    return null;
  }
}

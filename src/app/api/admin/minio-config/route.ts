import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { systemConfigs } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getMinioClient } from "@/lib/minio";

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
          "minio_endpoint",
          "minio_port",
          "minio_use_ssl",
          "minio_access_key",
          "minio_secret_key",
          "minio_bucket",
          "minio_public_url",
        ])
      );

    const configMap: Record<string, string> = {
      minio_endpoint: "localhost",
      minio_port: "9000",
      minio_use_ssl: "false",
      minio_access_key: "minioadmin",
      minio_secret_key: "",
      minio_bucket: "avatars",
      minio_public_url: "http://localhost:9000/avatars",
    };

    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    return NextResponse.json({
      success: true,
      data: {
        minio_endpoint: configMap["minio_endpoint"] || "localhost",
        minio_port: configMap["minio_port"] || "9000",
        minio_use_ssl: configMap["minio_use_ssl"] === "true",
        minio_access_key: configMap["minio_access_key"] || "minioadmin",
        minio_secret_key: configMap["minio_secret_key"] ? "••••••••••••••••" : "",
        minio_bucket: configMap["minio_bucket"] || "avatars",
        minio_public_url: configMap["minio_public_url"] || "http://localhost:9000/avatars",
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
    const body = await req.json();

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

    if (body.minio_endpoint !== undefined) await upsertConfig("minio_endpoint", body.minio_endpoint, "MinIO Endpoint host");
    if (body.minio_port !== undefined) await upsertConfig("minio_port", String(body.minio_port), "MinIO Port");
    if (body.minio_use_ssl !== undefined) await upsertConfig("minio_use_ssl", String(body.minio_use_ssl), "MinIO SSL enabled");
    if (body.minio_access_key !== undefined) await upsertConfig("minio_access_key", body.minio_access_key, "MinIO Access Key");
    if (body.minio_secret_key !== undefined && !body.minio_secret_key.startsWith("••••")) {
      await upsertConfig("minio_secret_key", body.minio_secret_key, "MinIO Secret Key");
    }
    if (body.minio_bucket !== undefined) await upsertConfig("minio_bucket", body.minio_bucket, "MinIO Bucket Name");
    if (body.minio_public_url !== undefined) await upsertConfig("minio_public_url", body.minio_public_url, "MinIO Public Image Base URL");

    return NextResponse.json({ success: true, message: "MinIO settings updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

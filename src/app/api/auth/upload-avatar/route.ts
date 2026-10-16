import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getMinioClient, MINIO_BUCKET } from "@/lib/minio";
import { db } from "@/db";
import { users, systemConfigs } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    // Read MinIO configs from DB or fallback
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

    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    const endPoint = configMap["minio_endpoint"] || process.env.MINIO_ENDPOINT || "localhost";
    const port = parseInt(configMap["minio_port"] || process.env.MINIO_PORT || "9000", 10);
    const useSSL = configMap["minio_use_ssl"] === "true";
    const accessKey = configMap["minio_access_key"] || process.env.MINIO_ACCESS_KEY || "minioadmin";
    const secretKey = configMap["minio_secret_key"] || process.env.MINIO_SECRET_KEY || "minioadmin";
    const bucket = configMap["minio_bucket"] || MINIO_BUCKET;
    const publicBaseUrl = configMap["minio_public_url"] || `http://${endPoint}:${port}/${bucket}`;

    const minioClient = getMinioClient({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    // Check / create bucket
    try {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, "us-east-1");
        // Set public read policy for avatar images
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        };
        await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
      }
    } catch (bucketErr: any) {
      console.warn("MinIO bucket verify warning:", bucketErr.message);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop() || "png";
    const objectName = `avatar-${payload.id}-${Date.now()}.${ext}`;

    await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
      "Content-Type": file.type || "image/png",
    });

    const fileUrl = `${publicBaseUrl}/${objectName}`;

    // Update user profile avatarUrl in database
    await db
      .update(users)
      .set({ avatarUrl: fileUrl, updatedAt: new Date() })
      .where(eq(users.id, payload.id));

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          "Failed to upload to MinIO. Please ensure MinIO server is running or configured in Admin.",
      },
      { status: 500 }
    );
  }
}

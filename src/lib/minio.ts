import { Client } from "minio";

// Read from systemConfigs or environment variables
export function getMinioClient(config?: {
  endPoint?: string;
  port?: number;
  useSSL?: boolean;
  accessKey?: string;
  secretKey?: string;
}) {
  const endPoint = config?.endPoint || process.env.MINIO_ENDPOINT || "localhost";
  const port = config?.port || parseInt(process.env.MINIO_PORT || "9000", 10);
  const useSSL = config?.useSSL !== undefined ? config.useSSL : process.env.MINIO_USE_SSL === "true";
  const accessKey = config?.accessKey || process.env.MINIO_ACCESS_KEY || "minioadmin";
  const secretKey = config?.secretKey || process.env.MINIO_SECRET_KEY || "minioadmin";

  return new Client({
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
  });
}

export const MINIO_BUCKET = process.env.MINIO_BUCKET || "avatars";

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// MinIO (S3-compatible) client. In production, set these env vars to point at
// AWS S3, Cloudflare R2, etc. — the same code works.
const endpoint = process.env.S3_ENDPOINT || "http://localhost:9000";
const accessKey = process.env.S3_ACCESS_KEY || "mashinchi";
const secretKey = process.env.S3_SECRET_KEY || "mashinchi123";
const region = process.env.S3_REGION || "us-east-1";

export const S3_BUCKET = process.env.S3_BUCKET || "cars";
// Public URL base — used by the browser to load images. For MinIO dev this
// is the same as the API endpoint. In prod this may be a CDN domain.
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || endpoint;

export const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  forcePathStyle: true, // required for MinIO
});

export async function uploadImage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return getPublicUrl(key);
}

export async function deleteImage(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

export function getPublicUrl(key: string): string {
  return `${S3_PUBLIC_URL}/${S3_BUCKET}/${key}`;
}

// Extract S3 key from a public URL (reverse of getPublicUrl).
// Returns null if the URL is not an S3/MinIO URL we manage.
export function extractKey(url: string): string | null {
  const prefix = `${S3_PUBLIC_URL}/${S3_BUCKET}/`;
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  return null;
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";
import { uploadImage, deleteImage, extractKey } from "@/lib/s3";
import { COMMON_HEADERS } from "@/lib/imageSources/types";

export const maxDuration = 30;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TIMEOUT = 10_000;

// Detect image type from first bytes (magic numbers) so we don't rely on
// remote servers sending an honest Content-Type header.
function sniffContentType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // WebP: "RIFF" .... "WEBP"
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export async function POST(request: NextRequest) {
  const s = await verifyAdmin(request);
  if (!s) return unauthorizedResponse();

  const { carId, imageUrl } = await request.json();
  if (!carId || !imageUrl) {
    return NextResponse.json({ error: "carId and imageUrl required" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(imageUrl, {
      headers: {
        ...COMMON_HEADERS,
        "Referer": new URL(imageUrl).origin,
      },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
      redirect: "follow",
    });
  } catch (e) {
    const msg = (e as Error)?.name === "TimeoutError"
      ? "تایم‌اوت در دانلود — سرور مقصد پاسخ نداد"
      : `عدم دسترسی به منبع: ${(e as Error).message}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: `منبع با کد ${res.status} پاسخ داد` }, { status: 502 });
  }

  const contentLength = Number(res.headers.get("content-length") || 0);
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "تصویر بزرگتر از ۱۰ مگابایت است" }, { status: 413 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return NextResponse.json({ error: `خطا در خواندن داده: ${(e as Error).message}` }, { status: 502 });
  }

  if (buffer.length === 0) {
    return NextResponse.json({ error: "فایل خالی دریافت شد" }, { status: 502 });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: "تصویر بزرگتر از ۱۰ مگابایت است" }, { status: 413 });
  }

  // Trust magic-byte sniffing over remote Content-Type (many CDNs send octet-stream)
  const sniffed = sniffContentType(buffer);
  const headerType = (res.headers.get("content-type") || "").split(";")[0].trim();
  const contentType = sniffed || (ALLOWED_TYPES.includes(headerType) ? headerType : null);

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({
      error: `فرمت پشتیبانی نمی‌شود (${headerType || "نامشخص"}). فقط JPG/PNG/WebP`,
    }, { status: 415 });
  }

  try {
    const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
    const key = `${carId}-${Date.now()}.${ext}`;
    const finalUrl = await uploadImage(key, buffer, contentType);

    const existing = await prisma.car.findUnique({ where: { id: carId }, select: { imageUrl: true } });
    const oldKey = existing?.imageUrl ? extractKey(existing.imageUrl) : null;

    await prisma.car.update({ where: { id: carId }, data: { imageUrl: finalUrl } });

    if (oldKey && oldKey !== key) {
      deleteImage(oldKey).catch(() => {});
    }

    await logAction("update", "car", carId, { action: "image_approved_from_source", sourceUrl: imageUrl });

    return NextResponse.json({ success: true, imageUrl: finalUrl });
  } catch (e) {
    return NextResponse.json({ error: `خطا در ذخیره: ${(e as Error).message}` }, { status: 500 });
  }
}

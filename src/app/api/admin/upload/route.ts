import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";
import { uploadImage, deleteImage, extractKey } from "@/lib/s3";

export async function POST(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const carId = formData.get("carId") as string | null;

  if (!file || !carId) {
    return NextResponse.json({ error: "file and carId required" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP allowed" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  try {
    // Cache-bust by suffixing with a timestamp so the browser refetches.
    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const key = `${carId}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const imageUrl = await uploadImage(key, buffer, file.type);

    // If the car had a previous S3-managed image, delete it.
    const existing = await prisma.car.findUnique({ where: { id: carId }, select: { imageUrl: true } });
    const oldKey = existing?.imageUrl ? extractKey(existing.imageUrl) : null;

    await prisma.car.update({
      where: { id: carId },
      data: { imageUrl },
    });

    if (oldKey && oldKey !== key) {
      deleteImage(oldKey).catch(() => {}); // best-effort cleanup
    }

    await logAction("update", "car", carId, { action: "image_upload", imageUrl });

    return NextResponse.json({ imageUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const carId = searchParams.get("carId");
  if (!carId) return NextResponse.json({ error: "carId required" }, { status: 400 });

  const car = await prisma.car.findUnique({ where: { id: carId }, select: { imageUrl: true } });
  const key = car?.imageUrl ? extractKey(car.imageUrl) : null;

  if (key) {
    try { await deleteImage(key); } catch { /* ignore */ }
  }

  await prisma.car.update({ where: { id: carId }, data: { imageUrl: null } });
  await logAction("update", "car", carId, { action: "image_delete" });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const carId = formData.get("carId") as string | null;

  if (!file || !carId) {
    return NextResponse.json({ error: "file and carId required" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WebP allowed" }, { status: 400 });
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const fileName = `${carId}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "cars");
  const filePath = path.join(uploadDir, fileName);

  try {
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Update car imageUrl
    const imageUrl = `/cars/${fileName}`;
    await prisma.car.update({
      where: { id: carId },
      data: { imageUrl },
    });

    await logAction("update", "car", carId, { action: "image_upload", imageUrl });

    return NextResponse.json({ imageUrl });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

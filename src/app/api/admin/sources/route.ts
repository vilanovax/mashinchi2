import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// GET - list sources for a car or all
export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const carId = request.nextUrl.searchParams.get("carId");
  const status = request.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (carId) where.carId = carId;
  if (status) where.status = status;

  const sources = await prisma.carSource.findMany({
    where,
    include: { car: { select: { nameFa: true, brandFa: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sources.map((s) => ({
    ...s,
    carName: s.car.nameFa,
    carBrand: s.car.brandFa,
    rawText: s.rawText.length > 300 ? s.rawText.slice(0, 300) + "..." : s.rawText,
    rawTextFull: s.rawText,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    appliedAt: s.appliedAt?.toISOString() || null,
    lastCrawledAt: s.lastCrawledAt?.toISOString() || null,
  })));
}

// POST - add new source (URL, text paste, or file content)
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const { carId, type, sourceSite, url, title, rawText } = body;

  if (!carId || !rawText) {
    return NextResponse.json({ error: "carId and rawText required" }, { status: 400 });
  }

  const source = await prisma.carSource.create({
    data: {
      carId,
      type: type || "manual",
      sourceSite: sourceSite || "manual",
      url: url || null,
      title: title || null,
      rawText,
      status: "pending",
    },
  });

  await logAction("create", "source", source.id, { carId, type, sourceSite });

  return NextResponse.json({ ...source, createdAt: source.createdAt.toISOString(), updatedAt: source.updatedAt.toISOString() });
}

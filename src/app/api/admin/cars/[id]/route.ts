import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

// PUT - update car and all related data
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) return unauthorizedResponse();
  const { id } = await params;
  const body = await request.json();

  // Update car basic info
  if (body.car) {
    const { nameEn, nameFa, brand, brandFa, category, year, priceMin, priceMax, origin, description, isNew } = body.car;
    await prisma.car.update({
      where: { id },
      data: {
        ...(nameEn !== undefined && { nameEn }),
        ...(nameFa !== undefined && { nameFa }),
        ...(brand !== undefined && { brand }),
        ...(brandFa !== undefined && { brandFa }),
        ...(category !== undefined && { category }),
        ...(year !== undefined && { year }),
        ...(priceMin !== undefined && { priceMin: BigInt(priceMin) }),
        ...(priceMax !== undefined && { priceMax: BigInt(priceMax) }),
        ...(origin !== undefined && { origin }),
        ...(description !== undefined && { description }),
        ...(isNew !== undefined && { isNew }),
      },
    });
  }

  // Update scores
  if (body.scores) {
    await prisma.carScores.upsert({
      where: { carId: id },
      update: body.scores,
      create: { carId: id, ...body.scores },
    });
  }

  // Update specs
  if (body.specs) {
    await prisma.carSpecs.upsert({
      where: { carId: id },
      update: body.specs,
      create: { carId: id, ...body.specs },
    });
  }

  // Update intel
  if (body.intel) {
    await prisma.carIntelligence.upsert({
      where: { carId: id },
      update: body.intel,
      create: { carId: id, ...body.intel },
    });
  }

  // Update tags
  if (body.tags !== undefined) {
    await prisma.carTag.deleteMany({ where: { carId: id } });
    if (body.tags.length > 0) {
      await prisma.carTag.createMany({
        data: body.tags.map((tag: string) => ({ carId: id, tag })),
      });
    }
  }

  // Fetch updated car
  const updated = await prisma.car.findUnique({
    where: { id },
    include: { scores: true, specs: true, tags: true, intel: true },
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...updated,
    priceMin: updated.priceMin.toString(),
    priceMax: updated.priceMax.toString(),
    tags: updated.tags.map((t) => ({ id: t.id, tag: t.tag })),
  });
}

// DELETE - delete car
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) return unauthorizedResponse();
  const { id } = await params;

  await prisma.car.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

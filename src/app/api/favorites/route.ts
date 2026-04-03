import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function getUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("mashinchi_session")?.value;
  if (!sessionId) return null;
  return prisma.user.findUnique({ where: { sessionId } });
}

// GET - list user's favorites
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ favorites: [] });
  }

  const favoriteInteractions = await prisma.userInteraction.findMany({
    where: { userId: user.id, action: "favorite" },
    include: {
      car: {
        include: {
          scores: true,
          specs: true,
          tags: true,
          intel: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const favorites = favoriteInteractions.map((fi) => ({
    id: fi.car.id,
    nameFa: fi.car.nameFa,
    nameEn: fi.car.nameEn,
    brandFa: fi.car.brandFa,
    category: fi.car.category,
    origin: fi.car.origin,
    priceMin: fi.car.priceMin.toString(),
    priceMax: fi.car.priceMax.toString(),
    description: fi.car.description,
    tags: fi.car.tags.map((t) => t.tag),
    scores: fi.car.scores,
    specs: fi.car.specs,
    intel: fi.car.intel
      ? {
          overallSummary: fi.car.intel.overallSummary,
          ownerSatisfaction: fi.car.intel.ownerSatisfaction,
          purchaseRisk: fi.car.intel.purchaseRisk,
        }
      : null,
    savedAt: fi.createdAt.toISOString(),
  }));

  return NextResponse.json({ favorites });
}

// POST - toggle favorite
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "No session" }, { status: 400 });
  }

  const { carId } = await request.json();
  if (!carId) {
    return NextResponse.json({ error: "carId required" }, { status: 400 });
  }

  // Check if already favorited
  const existing = await prisma.userInteraction.findFirst({
    where: { userId: user.id, carId, action: "favorite" },
  });

  if (existing) {
    // Remove favorite
    await prisma.userInteraction.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  } else {
    // Add favorite
    await prisma.userInteraction.create({
      data: { userId: user.id, carId, action: "favorite" },
    });
    return NextResponse.json({ favorited: true });
  }
}

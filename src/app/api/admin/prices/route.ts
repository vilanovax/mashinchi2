import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const carId = request.nextUrl.searchParams.get("carId");
  if (!carId) return NextResponse.json({ error: "carId required" }, { status: 400 });

  const prices = await prisma.priceHistory.findMany({
    where: { carId },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json(prices.map((p) => ({
    id: p.id, carId: p.carId, price: p.price.toString(),
    date: p.date.toISOString(), source: p.source,
  })));
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();
  const body = await request.json();

  const price = await prisma.priceHistory.create({
    data: {
      carId: body.carId,
      price: BigInt(body.price),
      date: new Date(body.date || Date.now()),
      source: body.source || "manual",
    },
  });

  return NextResponse.json({ id: price.id, price: price.price.toString(), date: price.date.toISOString(), source: price.source });
}

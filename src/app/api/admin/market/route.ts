import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// GET: listing stats + market insights
export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request);
  if (!_s) return unauthorizedResponse();

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") || "listings"; // listings | insights

  if (type === "listings") {
    const carId = sp.get("carId");
    const stats = await prisma.listingStats.findMany({
      where: carId ? { carId } : {},
      include: { car: { select: { nameFa: true, brandFa: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });
    return NextResponse.json(stats.map((s) => ({
      id: s.id, carId: s.carId,
      nameFa: s.car.nameFa, brandFa: s.car.brandFa,
      date: s.date.toISOString().split("T")[0],
      count: s.count, source: s.source,
      avgPrice: s.avgPrice?.toString() || null,
      minPrice: s.minPrice?.toString() || null,
      maxPrice: s.maxPrice?.toString() || null,
    })));
  }

  if (type === "insights") {
    const insights = await prisma.marketInsight.findMany({
      orderBy: { date: "desc" },
      take: 20,
    });
    return NextResponse.json(insights.map((i) => ({
      id: i.id, date: i.date.toISOString().split("T")[0],
      period: i.period, title: i.title, summary: i.summary,
      highlights: i.highlights, topRisers: i.topRisers,
      topFallers: i.topFallers, hotListings: i.hotListings,
      aiAnalysis: i.aiAnalysis,
    })));
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 });
}

// POST: add listing stats or market insight
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const type = body.type; // "listing" | "insight" | "bulk_listings"

  if (type === "listing") {
    const stat = await prisma.listingStats.upsert({
      where: {
        carId_date_source: {
          carId: body.carId,
          date: new Date(body.date),
          source: body.source || "manual",
        },
      },
      update: {
        count: body.count,
        avgPrice: body.avgPrice ? BigInt(body.avgPrice) : null,
        minPrice: body.minPrice ? BigInt(body.minPrice) : null,
        maxPrice: body.maxPrice ? BigInt(body.maxPrice) : null,
      },
      create: {
        carId: body.carId,
        date: new Date(body.date),
        source: body.source || "manual",
        count: body.count,
        avgPrice: body.avgPrice ? BigInt(body.avgPrice) : null,
        minPrice: body.minPrice ? BigInt(body.minPrice) : null,
        maxPrice: body.maxPrice ? BigInt(body.maxPrice) : null,
      },
    });

    await logAction("create", "listing_stats", stat.id, {
      carId: body.carId, count: body.count, date: body.date,
    });

    return NextResponse.json({ id: stat.id, count: stat.count });
  }

  if (type === "bulk_listings") {
    // Bulk import: [{ carId, date, count, source, avgPrice }]
    const items = body.items as any[];
    let created = 0;
    for (const item of items) {
      await prisma.listingStats.upsert({
        where: {
          carId_date_source: {
            carId: item.carId,
            date: new Date(item.date),
            source: item.source || "manual",
          },
        },
        update: {
          count: item.count,
          avgPrice: item.avgPrice ? BigInt(item.avgPrice) : null,
        },
        create: {
          carId: item.carId,
          date: new Date(item.date),
          source: item.source || "manual",
          count: item.count,
          avgPrice: item.avgPrice ? BigInt(item.avgPrice) : null,
        },
      });
      created++;
    }

    await logAction("import", "listing_stats", undefined, { count: created });
    return NextResponse.json({ imported: created });
  }

  if (type === "insight") {
    const insight = await prisma.marketInsight.create({
      data: {
        date: new Date(body.date || Date.now()),
        period: body.period || "weekly",
        title: body.title,
        summary: body.summary,
        highlights: body.highlights || [],
        topRisers: body.topRisers || [],
        topFallers: body.topFallers || [],
        hotListings: body.hotListings || [],
        aiAnalysis: body.aiAnalysis || null,
      },
    });

    await logAction("create", "market_insight", insight.id, {
      title: body.title, period: body.period,
    });

    return NextResponse.json({ id: insight.id });
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 });
}

// DELETE: remove listing stat or insight
export async function DELETE(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const sp = request.nextUrl.searchParams;
  const id = sp.get("id");
  const type = sp.get("type") || "listing"; // listing | insight

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (type === "listing") {
    await prisma.listingStats.delete({ where: { id } });
  } else {
    await prisma.marketInsight.delete({ where: { id } });
  }

  await logAction("delete", type === "listing" ? "listing_stats" : "market_insight", id, {});
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const crawlers = await prisma.crawlerConfig.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(crawlers.map((c) => ({
    ...c,
    lastRunAt: c.lastRunAt?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })));
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();
  const body = await request.json();

  const crawler = await prisma.crawlerConfig.create({
    data: {
      name: body.name,
      url: body.url,
      type: body.type || "price",
      schedule: body.schedule || null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json({ ...crawler, lastRunAt: null, createdAt: crawler.createdAt.toISOString(), updatedAt: crawler.updatedAt.toISOString() });
}

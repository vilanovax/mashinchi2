import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();
  const { id } = await params;
  const body = await request.json();

  const crawler = await prisma.crawlerConfig.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.schedule !== undefined && { schedule: body.schedule }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.simulateRun && { lastRunAt: new Date() }),
    },
  });

  return NextResponse.json({ ...crawler, lastRunAt: crawler.lastRunAt?.toISOString() || null, createdAt: crawler.createdAt.toISOString(), updatedAt: crawler.updatedAt.toISOString() });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();
  const { id } = await params;
  await prisma.crawlerConfig.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

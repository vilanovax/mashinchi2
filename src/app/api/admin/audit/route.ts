import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const _s = await verifyAdmin(request); if (!_s) return unauthorizedResponse();

  const entity = request.nextUrl.searchParams.get("entity");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  const logs = await prisma.auditLog.findMany({
    where: entity ? { entity } : {},
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
  });

  return NextResponse.json(logs.map((l) => ({
    ...l,
    details: JSON.parse(l.details),
    createdAt: l.createdAt.toISOString(),
  })));
}

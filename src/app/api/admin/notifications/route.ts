import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: unreadOnly ? { isRead: false } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  })));
}

// Mark as read
export async function PUT(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const { ids } = await request.json();
  if (ids === "all") {
    await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  } else if (Array.isArray(ids)) {
    await prisma.notification.updateMany({ where: { id: { in: ids } }, data: { isRead: true } });
  }

  return NextResponse.json({ success: true });
}

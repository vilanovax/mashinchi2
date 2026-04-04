import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse, forbiddenResponse, hashPassword, isSuperAdmin } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  if (!isSuperAdmin(session.role)) return forbiddenResponse();

  const admins = await prisma.adminUser.findMany({
    select: { id: true, username: true, name: true, role: true, isActive: true, lastLogin: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(admins.map((a) => ({
    ...a,
    lastLogin: a.lastLogin?.toISOString() || null,
    createdAt: a.createdAt.toISOString(),
  })));
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  if (!isSuperAdmin(session.role)) return forbiddenResponse();

  const { username, password, name, role } = await request.json();
  if (!username || !password || !name) {
    return NextResponse.json({ error: "username, password, name required" }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
  }

  const admin = await prisma.adminUser.create({
    data: { username, password: hashPassword(password), name, role: role || "editor" },
  });

  await logAction("create", "admin_user", admin.id, { username, name, role: role || "editor" });

  return NextResponse.json({ id: admin.id, username: admin.username, name: admin.name, role: admin.role });
}

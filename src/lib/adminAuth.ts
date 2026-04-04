import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Simple hash (not bcrypt - lightweight for this use case)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "h_" + Math.abs(hash).toString(36) + password.length.toString(36);
}

export interface AdminSession {
  id: string;
  username: string;
  name: string;
  role: string;
}

export async function verifyAdmin(request: NextRequest): Promise<AdminSession | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");

  // Legacy support: env-based password
  const envPassword = process.env.ADMIN_PASSWORD || "mashinchi-admin-2024";
  if (token === envPassword) {
    return { id: "env", username: "admin", name: "Admin", role: "super_admin" };
  }

  // Token format: "username:password"
  if (token.includes(":")) {
    const [username, password] = token.split(":", 2);
    const admin = await prisma.adminUser.findUnique({ where: { username } });
    if (admin && admin.isActive && admin.password === hashPassword(password)) {
      // Update last login
      await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLogin: new Date() } });
      return { id: admin.id, username: admin.username, name: admin.name, role: admin.role };
    }
  }

  // Also try as plain env password
  if (token === envPassword) {
    return { id: "env", username: "admin", name: "Admin", role: "super_admin" };
  }

  return null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 });
}

// Role check helpers
export function canEdit(role: string): boolean {
  return role === "super_admin" || role === "editor";
}

export function isSuperAdmin(role: string): boolean {
  return role === "super_admin";
}

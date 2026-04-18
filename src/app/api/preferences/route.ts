import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/session";

export async function GET() {
  const { user } = await getOrCreateUser();
  return NextResponse.json({
    preferredCategories: user.preferredCategories || [],
    excludedOrigins: user.excludedOrigins || [],
    excludedBrands: user.excludedBrands || [],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { preferredCategories, excludedOrigins, excludedBrands } = body;

  const { user, sessionId, isNew } = await getOrCreateUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      preferredCategories: Array.isArray(preferredCategories) ? preferredCategories : [],
      excludedOrigins: Array.isArray(excludedOrigins) ? excludedOrigins : [],
      excludedBrands: Array.isArray(excludedBrands) ? excludedBrands : [],
    },
  });

  const response = NextResponse.json({ success: true });
  if (isNew) {
    response.cookies.set(COOKIE_NAME, sessionId, COOKIE_OPTIONS);
  }
  return response;
}

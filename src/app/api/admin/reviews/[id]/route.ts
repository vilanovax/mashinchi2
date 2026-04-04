import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdmin(request)) return unauthorizedResponse();
  const { id } = await params;
  const body = await request.json();

  const review = await prisma.carReview.update({
    where: { id },
    data: {
      ...(body.source !== undefined && { source: body.source }),
      ...(body.summary !== undefined && { summary: body.summary }),
      ...(body.pros !== undefined && { pros: body.pros }),
      ...(body.cons !== undefined && { cons: body.cons }),
      ...(body.warnings !== undefined && { warnings: body.warnings }),
      ...(body.rating !== undefined && { rating: body.rating ? parseFloat(body.rating) : null }),
    },
  });

  return NextResponse.json(review);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdmin(request)) return unauthorizedResponse();
  const { id } = await params;
  await prisma.carReview.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

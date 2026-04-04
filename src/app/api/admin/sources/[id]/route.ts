import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// DELETE
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  const { id } = await params;
  await prisma.carSource.delete({ where: { id } });
  await logAction("delete", "source", id);
  return NextResponse.json({ success: true });
}

// PUT - update status or edit processed data
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.processedSummary !== undefined) data.processedSummary = body.processedSummary;
  if (body.extractedPros !== undefined) data.extractedPros = body.extractedPros;
  if (body.extractedCons !== undefined) data.extractedCons = body.extractedCons;
  if (body.extractedIssues !== undefined) data.extractedIssues = body.extractedIssues;
  if (body.extractedWarnings !== undefined) data.extractedWarnings = body.extractedWarnings;
  if (body.extractedScores !== undefined) data.extractedScores = body.extractedScores;

  const updated = await prisma.carSource.update({ where: { id }, data });

  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
}

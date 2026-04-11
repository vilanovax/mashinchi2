import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

// All supported source types — kept in sync with /admin/sources UI
export const SOURCE_TYPES = [
  "comment",      // experience / user comments
  "article",      // blog post / news article
  "review",       // expert / journalist review
  "video",        // video review (YouTube, Aparat, …)
  "comparison",   // head-to-head comparison
  "forum",        // forum thread
  "expert",       // dedicated expert opinion
  "manual",       // manually entered note
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

// Minimum healthy count for each type — used for gap detection
const MIN_BY_TYPE: Record<SourceType, number> = {
  comment: 5,
  article: 2,
  review: 1,
  video: 1,
  comparison: 1,
  forum: 1,
  expert: 1,
  manual: 0,
};

// GET - full data inventory for a single car
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const { id } = await params;

  const car = await prisma.car.findUnique({
    where: { id },
    select: {
      id: true,
      nameFa: true,
      nameEn: true,
      brandFa: true,
      origin: true,
      category: true,
      imageUrl: true,
    },
  });

  if (!car) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [sources, rawAnalyses] = await Promise.all([
    prisma.carSource.findMany({
      where: { carId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.carRawAnalysis.findMany({
      where: { carId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        version: true,
        sourceLabel: true,
        pros: true,
        cons: true,
        commonProblems: true,
        processedAt: true,
        createdAt: true,
      },
    }),
  ]);

  // Build per-type breakdown
  const byType: Record<string, {
    type: string;
    total: number;
    pending: number;
    processed: number;
    approved: number;
    rejected: number;
    totalChars: number;
    needed: number;       // minimum healthy count
    gap: number;          // how many we still need
  }> = {};

  for (const t of SOURCE_TYPES) {
    byType[t] = {
      type: t,
      total: 0, pending: 0, processed: 0, approved: 0, rejected: 0,
      totalChars: 0,
      needed: MIN_BY_TYPE[t],
      gap: MIN_BY_TYPE[t],
    };
  }

  for (const s of sources) {
    const bucket = byType[s.type] || byType.manual;
    bucket.total++;
    if (s.status === "pending") bucket.pending++;
    else if (s.status === "processed") bucket.processed++;
    else if (s.status === "approved") bucket.approved++;
    else if (s.status === "rejected") bucket.rejected++;
    bucket.totalChars += s.rawText.length;
    bucket.gap = Math.max(0, bucket.needed - bucket.total);
  }

  // Aggregate stats
  const totalSources = sources.length;
  const approvedSources = sources.filter((s) => s.status === "approved").length;
  const totalChars = sources.reduce((acc, s) => acc + s.rawText.length, 0);

  // Health: % of source types that meet minimum
  const typesWithMin = SOURCE_TYPES.filter((t) => MIN_BY_TYPE[t] > 0);
  const typesMet = typesWithMin.filter((t) => byType[t].total >= MIN_BY_TYPE[t]).length;
  const coverageHealth = Math.round((typesMet / typesWithMin.length) * 100);

  // Missing types — types with minimum > 0 but no sources at all
  const missingTypes = typesWithMin
    .filter((t) => byType[t].total === 0)
    .map((t) => t);

  return NextResponse.json({
    car,
    summary: {
      totalSources,
      approvedSources,
      totalChars,
      rawAnalysesCount: rawAnalyses.length,
      processedAnalysesCount: rawAnalyses.filter((r) => r.status === "processed").length,
      coverageHealth,
      typesMet,
      typesTotal: typesWithMin.length,
      missingTypes,
    },
    byType: SOURCE_TYPES.map((t) => byType[t]),
    sources: sources.map((s) => ({
      id: s.id,
      type: s.type,
      sourceSite: s.sourceSite,
      url: s.url,
      title: s.title,
      rawTextPreview: s.rawText.slice(0, 200),
      rawTextLength: s.rawText.length,
      status: s.status,
      processedSummary: s.processedSummary,
      extractedPros: s.extractedPros,
      extractedCons: s.extractedCons,
      extractedIssues: s.extractedIssues,
      createdAt: s.createdAt.toISOString(),
      appliedAt: s.appliedAt?.toISOString() || null,
    })),
    rawAnalyses: rawAnalyses.map((r) => ({
      id: r.id,
      status: r.status,
      version: r.version,
      sourceLabel: r.sourceLabel,
      prosCount: r.pros.length,
      consCount: r.cons.length,
      problemsCount: r.commonProblems.length,
      processedAt: r.processedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

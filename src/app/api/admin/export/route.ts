import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const type = request.nextUrl.searchParams.get("type");

  if (type === "cars") {
    const cars = await prisma.car.findMany({
      include: { scores: true, specs: true, tags: true, intel: true },
      orderBy: { nameFa: "asc" },
    });

    const rows = cars.map((c) => ({
      nameFa: c.nameFa,
      nameEn: c.nameEn,
      brandFa: c.brandFa,
      category: c.category,
      origin: c.origin,
      year: c.year,
      priceMin: c.priceMin.toString(),
      priceMax: c.priceMax.toString(),
      tags: c.tags.map((t) => t.tag).join("، "),
      comfort: c.scores?.comfort || "",
      performance: c.scores?.performance || "",
      economy: c.scores?.economy || "",
      safety: c.scores?.safety || "",
      reliability: c.scores?.reliability || "",
      engine: c.specs?.engine || "",
      horsepower: c.specs?.horsepower || "",
      transmission: c.specs?.transmission || "",
      fuelConsumption: c.specs?.fuelConsumption || "",
      ownerSatisfaction: c.intel?.ownerSatisfaction || "",
      purchaseRisk: c.intel?.purchaseRisk || "",
    }));

    return buildCsvResponse(rows, "mashinchi-cars.csv");
  }

  if (type === "users") {
    const users = await prisma.user.findMany({
      include: { interactions: { select: { action: true } }, tasteProfile: true },
      orderBy: { createdAt: "desc" },
    });

    const rows = users.map((u) => ({
      sessionId: u.sessionId.slice(0, 12),
      budget: u.budget?.toString() || "",
      likes: u.interactions.filter((i) => i.action === "like").length,
      skips: u.interactions.filter((i) => i.action === "skip").length,
      favorites: u.interactions.filter((i) => i.action === "favorite").length,
      hasTasteProfile: u.tasteProfile ? "yes" : "no",
      createdAt: u.createdAt.toISOString().split("T")[0],
    }));

    return buildCsvResponse(rows, "mashinchi-users.csv");
  }

  if (type === "reviews") {
    const reviews = await prisma.carReview.findMany({
      include: { car: { select: { nameFa: true, brandFa: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = reviews.map((r) => ({
      carName: r.car.nameFa,
      carBrand: r.car.brandFa,
      source: r.source,
      rating: r.rating || "",
      summary: r.summary,
      pros: r.pros.join(" | "),
      cons: r.cons.join(" | "),
      warnings: r.warnings.join(" | "),
    }));

    return buildCsvResponse(rows, "mashinchi-reviews.csv");
  }

  return NextResponse.json({ error: "type required: cars, users, reviews" }, { status: 400 });
}

function buildCsvResponse(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) {
    return new NextResponse("No data", { status: 200 });
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = String(row[h] ?? "");
        return val.includes(",") || val.includes('"') || val.includes("\n")
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      }).join(",")
    ),
  ];

  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const csv = bom + csvLines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

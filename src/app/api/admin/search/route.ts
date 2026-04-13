import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";

// GET /api/admin/search?q=شاهین
export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ cars: [], sources: [], pages: [] });
  }

  const qLower = q.toLowerCase();

  // Search cars by name (Farsi + English + brand)
  const cars = await prisma.car.findMany({
    where: {
      OR: [
        { nameFa: { contains: q } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { brandFa: { contains: q } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true, nameFa: true, nameEn: true, brandFa: true, origin: true, imageUrl: true,
      _count: { select: { sources: true, reviews: true } },
    },
    take: 8,
    orderBy: { nameFa: "asc" },
  });

  // Search sources by title or rawText (limited)
  const sources = await prisma.carSource.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { rawText: { contains: q } },
      ],
      status: { not: "archived" },
    },
    select: {
      id: true, title: true, type: true, sourceSite: true, status: true, carId: true,
      car: { select: { nameFa: true } },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  // Static pages matching query
  const allPages = [
    { path: "/admin", label: "داشبورد", keywords: "dashboard داشبورد خانه" },
    { path: "/admin/cars", label: "خودروها", keywords: "cars خودرو ماشین لیست" },
    { path: "/admin/prices", label: "قیمت‌ها", keywords: "prices قیمت بازار" },
    { path: "/admin/sources", label: "منابع دانش", keywords: "sources منابع کرال crawl" },
    { path: "/admin/enrich", label: "غنی‌سازی AI", keywords: "enrich غنی سازی هوش" },
    { path: "/admin/ai", label: "تولید محتوا AI", keywords: "ai محتوا تولید generate" },
    { path: "/admin/data-health", label: "سلامت دیتا", keywords: "health سلامت کیفیت" },
    { path: "/admin/scoring", label: "پارامترها", keywords: "scoring پارامتر امتیاز وزن" },
    { path: "/admin/reviews", label: "نظرات", keywords: "reviews نظر کامنت بازخورد" },
    { path: "/admin/market", label: "بازار", keywords: "market بازار تحلیل" },
    { path: "/admin/analytics", label: "آمار و تحلیل", keywords: "analytics آمار تحلیل" },
    { path: "/admin/users", label: "کاربران", keywords: "users کاربر" },
    { path: "/admin/audit", label: "لاگ فعالیت", keywords: "audit لاگ فعالیت" },
    { path: "/admin/settings", label: "تنظیمات", keywords: "settings تنظیمات" },
    { path: "/admin/import", label: "افزودن خودرو", keywords: "import اضافه خودرو جدید" },
    { path: "/admin/team", label: "تیم", keywords: "team تیم ادمین" },
  ];

  const pages = allPages.filter((p) =>
    p.label.includes(q) || p.keywords.toLowerCase().includes(qLower)
  ).slice(0, 4);

  return NextResponse.json({
    cars: cars.map((c) => ({
      id: c.id,
      nameFa: c.nameFa,
      nameEn: c.nameEn,
      brandFa: c.brandFa,
      origin: c.origin,
      imageUrl: c.imageUrl,
      sourcesCount: c._count.sources,
      reviewsCount: c._count.reviews,
    })),
    sources: sources.map((s) => ({
      id: s.id,
      title: s.title || s.type,
      type: s.type,
      sourceSite: s.sourceSite,
      status: s.status,
      carId: s.carId,
      carName: s.car.nameFa,
    })),
    pages,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";
import * as cheerio from "cheerio";

// POST - crawl a car.ir page and extract specs, prices, comments
// Body: { url: string, carId?: string }
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const { url, carId } = await request.json();
  if (!url || !url.includes("car.ir")) {
    return NextResponse.json({ error: "فقط لینک‌های car.ir پشتیبانی می‌شود" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status} — صفحه پیدا نشد` }, { status: 400 });
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // ── Car name ──
    const carName = $("h1.page-title").text().trim() || $("h1").first().text().trim() || "";

    // ── Prices ──
    interface PriceItem { label: string; value: number }
    const prices: PriceItem[] = [];
    $(".prices__item").each((_, el) => {
      const label = $(el).find(".prices__title, dt").text().trim() ||
                    $(el).text().replace(/[\d۰-۹,،٬\s]/g, "").trim().slice(0, 20);
      const numText = $(el).text();
      const num = parsePersianNumber(numText);
      if (num > 0) {
        prices.push({ label: label || "قیمت", value: num });
      }
    });

    // ── Specs (table rows) ──
    interface SpecItem { key: string; value: string; category: string }
    const specs: SpecItem[] = [];
    let currentCategory = "";

    $("table tr, .specifications tr").each((_, el) => {
      const cells = $(el).find("td, th");
      if (cells.length >= 2) {
        let key = $(cells[0]).text().trim();
        const val = $(cells[1]).text().trim();

        // Detect category headers (merged cells or bold text containing "مشخصات")
        if (key.includes("مشخصات") || key.includes("سیستم") || key.includes("عملکرد") || key.includes("محدوده")) {
          // Category header might be merged with first spec
          const parts = key.split(/(?:مشخصات فنی |سیستم |عملکرد |محدوده )/);
          if (parts.length > 1 && parts[1].trim()) {
            currentCategory = key.split(parts[1])[0].trim();
            key = parts[1].trim();
          } else {
            currentCategory = key;
            return;
          }
        }

        if (key && val && key !== val) {
          specs.push({ key, value: val, category: currentCategory });
        }
      }
    });

    // ── Comments ──
    interface CommentItem { text: string; user: string }
    const comments: CommentItem[] = [];
    $(".comment-item").each((_, el) => {
      const text = $(el).find(".comment-item__content").text().trim();
      const user = $(el).find(".comment-item__user").text().trim();
      if (text && text.length > 10) {
        comments.push({ text: text.slice(0, 1000), user: user || "ناشناس" });
      }
    });

    // ── Article / Description (مقاله توضیحی) ──
    const articleParts: string[] = [];

    // 1. Typography section — main editorial text about the car
    $(".typography").each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, " ");
      if (t.length > 30) articleParts.push(t);
    });

    // 2. Collapse sections — expandable descriptions (engine, price history, etc.)
    $(".collapse").each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, " ");
      // Skip if it's just specs table text (already captured)
      if (t.length > 50 && !t.startsWith("مشخصات فنی بدنه")) {
        articleParts.push(t);
      }
    });

    // 3. Featured items — highlight sections
    $(".featured-item").each((_, el) => {
      const t = $(el).text().trim().replace(/\s+/g, " ");
      if (t.length > 30) articleParts.push(t);
    });

    // 4. Card specifications — comfort/features
    $(".card.specifications").each((_, el) => {
      const heading = $(el).find("h2, h3, .card-title").text().trim();
      const t = $(el).text().trim().replace(/\s+/g, " ");
      if (t.length > 50 && heading.includes("امکانات")) {
        articleParts.push(t);
      }
    });

    // Deduplicate overlapping sections
    const article = deduplicateSections(articleParts).join("\n\n");

    // ── Full body text — comprehensive (for source storage) ──
    $("script, style, nav, footer, header, aside, iframe, .ads, .menu, .cookie-banner, .breadcrumb").remove();

    // Build rich full text: article + specs summary + comments
    const fullTextParts: string[] = [];

    // Article content first
    if (article) {
      fullTextParts.push(`=== توضیحات و بررسی ${carName} ===\n${article}`);
    }

    // Specs as readable text
    if (specs.length > 0) {
      const specsText = specs.map((s) => `${s.key}: ${s.value}`).join("\n");
      fullTextParts.push(`=== مشخصات فنی ===\n${specsText}`);
    }

    // Prices
    if (prices.length > 0) {
      const pricesText = prices.map((p) => `${p.label}: ${p.value.toLocaleString()} تومان`).join("\n");
      fullTextParts.push(`=== قیمت‌ها ===\n${pricesText}`);
    }

    // Comments
    if (comments.length > 0) {
      const commentsText = comments.map((c) => `[${c.user}]: ${c.text}`).join("\n\n");
      fullTextParts.push(`=== نظرات کاربران (${comments.length} نظر) ===\n${commentsText}`);
    }

    let fullText = fullTextParts.join("\n\n");
    if (fullText.length > 12000) fullText = fullText.slice(0, 12000);

    // ── Try to match with existing car in DB ──
    let matchedCarId = carId || null;
    let matchedCarName = "";

    if (!carId && carName) {
      const cars = await prisma.car.findMany({ select: { id: true, nameFa: true, nameEn: true } });
      // Try fuzzy match on name
      const match = cars.find((c) =>
        carName.includes(c.nameFa) || c.nameFa.includes(carName) ||
        (c.nameEn && carName.toLowerCase().includes(c.nameEn.toLowerCase()))
      );
      if (match) {
        matchedCarId = match.id;
        matchedCarName = match.nameFa;
      }
    }

    return NextResponse.json({
      success: true,
      url,
      carName,
      matchedCarId,
      matchedCarName,
      prices,
      specs,
      comments,
      article,
      fullTextLength: fullText.length,
      fullText,
      summary: {
        specsCount: specs.length,
        commentsCount: comments.length,
        pricesCount: prices.length,
        articleLength: article.length,
      },
    });
  } catch (error) {
    console.error("[car-ir crawl] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `خطا در کرال: ${errMsg}` }, { status: 500 });
  }
}

// Remove sections that are substrings of longer ones
function deduplicateSections(parts: string[]): string[] {
  // Sort longest first
  const sorted = [...parts].sort((a, b) => b.length - a.length);
  const result: string[] = [];
  for (const part of sorted) {
    // Check if this section is already contained in a longer section
    const isDuplicate = result.some((r) =>
      r.includes(part.slice(0, 80)) || part.includes(r.slice(0, 80))
    );
    if (!isDuplicate && part.trim().length > 0) {
      result.push(part);
    }
  }
  return result;
}

function parsePersianNumber(text: string): number {
  // Extract digits (Persian + Latin) from text
  const latin = text.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const matches = latin.match(/[\d,،٬]+/g);
  if (!matches) return 0;

  // Find the largest number (likely the price)
  let max = 0;
  for (const m of matches) {
    const cleaned = m.replace(/[,،٬]/g, "");
    const n = parseInt(cleaned);
    if (n > max) max = n;
  }
  return max;
}

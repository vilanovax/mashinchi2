import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";
import * as cheerio from "cheerio";

// POST - crawl a URL, extract text, optionally detect car
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const { url, carId } = await request.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    // Fetch the page
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status}` }, { status: 400 });

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer
    $("script, style, nav, footer, header, aside, .sidebar, .menu, .ads, .advertisement, iframe").remove();

    // Extract title
    const pageTitle = $("h1").first().text().trim() || $("title").text().trim() || "";

    // Extract main content text
    let bodyText = "";
    const selectors = ["article", "main", ".content", ".post-content", ".article-body", ".review-body", ".comment-list", ".comments"];
    for (const sel of selectors) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 100) {
        bodyText = el.text().trim();
        break;
      }
    }
    if (!bodyText) {
      bodyText = $("body").text().trim();
    }

    // Clean up whitespace
    bodyText = bodyText.replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    // Limit to ~5000 chars
    if (bodyText.length > 5000) bodyText = bodyText.slice(0, 5000);

    // Detect source site
    let sourceSite = "blog";
    if (url.includes("bama.ir")) sourceSite = "bama";
    else if (url.includes("divar.ir")) sourceSite = "divar";
    else if (url.includes("zoomit.ir")) sourceSite = "zoomit";
    else if (url.includes("charkhan.com")) sourceSite = "charkhan";

    // Detect content type
    let type = "article";
    if (url.includes("comment") || url.includes("review") || url.includes("نظر")) type = "comment";
    if (url.includes("بررسی") || url.includes("review")) type = "review";

    // If no carId, try to detect from content using AI
    let detectedCarId = carId || null;
    let detectedCarName = "";

    if (!carId && bodyText.length > 50) {
      // Get all car names for matching
      const cars = await prisma.car.findMany({ select: { id: true, nameFa: true, nameEn: true } });
      const carNames = cars.map((c) => `${c.nameFa} (${c.nameEn})`).join("\n");

      try {
        const detectPrompt = `از لیست خودروهای زیر، کدام خودرو در متن ذکر شده؟ فقط نام انگلیسی دقیق خودرو را بنویس. اگر مشخص نیست بنویس: UNKNOWN

لیست خودروها:
${carNames}

متن:
${bodyText.slice(0, 1500)}

فقط نام انگلیسی (مثلا: Hyundai Accent). بدون توضیح اضافه.`;

        const detected = await callAI(detectPrompt, 50);
        const cleanName = detected.trim().split("\n")[0].trim();

        if (cleanName && cleanName !== "UNKNOWN") {
          const match = cars.find((c) =>
            c.nameEn.toLowerCase().includes(cleanName.toLowerCase()) ||
            cleanName.toLowerCase().includes(c.nameEn.toLowerCase())
          );
          if (match) {
            detectedCarId = match.id;
            detectedCarName = match.nameFa;
          }
        }
      } catch {
        // AI detection failed, that's ok
      }
    }

    return NextResponse.json({
      success: true,
      url,
      title: pageTitle,
      text: bodyText,
      textLength: bodyText.length,
      sourceSite,
      type,
      detectedCarId,
      detectedCarName,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Crawl failed: ${errMsg}` }, { status: 500 });
  }
}

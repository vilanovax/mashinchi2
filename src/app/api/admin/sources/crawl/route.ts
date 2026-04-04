import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { callAI } from "@/lib/ai-provider";
import * as cheerio from "cheerio";

// POST - crawl a URL, extract text, optionally detect car
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const { url, carId, mode = "auto" } = await request.json();
  // mode: "auto" (cheerio first), "browser" (puppeteer), "cheerio" (html only)
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    let bodyText = "";
    let pageTitle = "";
    let method = "cheerio";

    // Step 1: Try cheerio (fast)
    if (mode !== "browser") {
      const result = await crawlWithCheerio(url);
      bodyText = result.text;
      pageTitle = result.title;
      method = "cheerio";
    }

    // Step 2: If not enough text and browser mode available, try puppeteer
    if ((mode === "browser" || (mode === "auto" && bodyText.length < 200)) && typeof process !== "undefined") {
      try {
        const result = await crawlWithBrowser(url);
        if (result.text.length > bodyText.length) {
          bodyText = result.text;
          pageTitle = result.title || pageTitle;
          method = "browser";
        }
      } catch (e) {
        // Puppeteer not available or failed - that's ok, we have cheerio result
        if (bodyText.length === 0) {
          return NextResponse.json({
            error: `کرال ناموفق. متن کافی استخراج نشد. ${mode === "browser" ? (e as Error).message : ""}`,
            suggestion: "متن کامنت‌ها رو از صفحه کپی و در حالت 'متن دستی' paste کنید.",
          }, { status: 400 });
        }
      }
    }

    if (!bodyText || bodyText.length < 30) {
      return NextResponse.json({
        error: "متن کافی از صفحه استخراج نشد",
        suggestion: "این صفحه احتمالا JavaScript-rendered هست. متن رو از مرورگر کپی کنید و در حالت 'متن دستی' paste کنید.",
        textLength: bodyText.length,
      }, { status: 400 });
    }

    // Detect source site
    let sourceSite = "blog";
    if (url.includes("bama.ir")) sourceSite = "bama";
    else if (url.includes("divar.ir")) sourceSite = "divar";
    else if (url.includes("zoomit.ir")) sourceSite = "zoomit";
    else if (url.includes("charkhan.com")) sourceSite = "charkhan";
    else if (url.includes("car.ir")) sourceSite = "car.ir";

    // Detect content type
    let type = "article";
    if (url.includes("comment") || url.includes("review") || url.includes("نظر")) type = "comment";
    if (url.includes("بررسی") || url.includes("specs") || url.includes("review")) type = "review";

    // If no carId, try to detect from content using AI
    let detectedCarId = carId || null;
    let detectedCarName = "";

    if (!carId && bodyText.length > 50) {
      const cars = await prisma.car.findMany({ select: { id: true, nameFa: true, nameEn: true } });
      const carNames = cars.map((c) => `${c.nameFa} (${c.nameEn})`).join("\n");

      try {
        const detectPrompt = `از لیست خودروهای زیر، کدام خودرو در متن ذکر شده؟ فقط نام انگلیسی دقیق خودرو را بنویس. اگر مشخص نیست بنویس: UNKNOWN

لیست خودروها:
${carNames}

عنوان صفحه: ${pageTitle}
متن:
${bodyText.slice(0, 1500)}

فقط نام انگلیسی. بدون توضیح.`;

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
        // AI detection failed
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
      method,
      detectedCarId,
      detectedCarName,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Crawl failed: ${errMsg}` }, { status: 500 });
  }
}

// Cheerio-based crawl (fast, static HTML only)
async function crawlWithCheerio(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noise
  $("script, style, nav, footer, header, aside, .sidebar, .menu, .ads, .advertisement, iframe, .cookie-banner").remove();

  const pageTitle = $("h1").first().text().trim() || $("title").text().trim() || "";

  // Try specific selectors
  let bodyText = "";
  const selectors = [
    "article", "main", ".content", ".post-content", ".article-body",
    ".review-body", ".comment-list", ".comments", ".review-comments",
    "[class*='comment']", "[class*='review']", ".car-review",
  ];

  for (const sel of selectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 100) {
      bodyText = el.text().trim();
      break;
    }
  }

  if (!bodyText) bodyText = $("body").text().trim();

  // Clean whitespace
  bodyText = bodyText.replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (bodyText.length > 6000) bodyText = bodyText.slice(0, 6000);

  return { title: pageTitle, text: bodyText };
}

// Browser-based crawl (Puppeteer - handles lazy load)
async function crawlWithBrowser(url: string): Promise<{ title: string; text: string }> {
  // Dynamic import to avoid errors when puppeteer not installed
  let puppeteer;
  try {
    puppeteer = await import("puppeteer-core");
  } catch {
    throw new Error("puppeteer-core not installed. Use: npm install puppeteer-core");
  }

  // Try to find Chrome
  const chromePaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];

  let executablePath = "";
  for (const p of chromePaths) {
    try {
      const { accessSync } = await import("fs");
      accessSync(p);
      executablePath = p;
      break;
    } catch { continue; }
  }

  if (!executablePath) {
    throw new Error("Chrome not found. Install Chrome or use 'متن دستی' mode.");
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");

    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // Scroll down to trigger lazy load
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Wait for comments to load
    await new Promise((r) => setTimeout(r, 2000));

    // Extract text
    const result = await page.evaluate(() => {
      // Remove noise
      document.querySelectorAll("script, style, nav, footer, header, aside, iframe, .ads").forEach((el) => el.remove());

      const title = document.querySelector("h1")?.textContent?.trim() || document.title || "";

      // Try to get comments/review content
      const selectors = ["article", "main", ".content", ".comments", "[class*='comment']", "[class*='review']"];
      let text = "";
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 100) {
          text = el.textContent.trim();
          break;
        }
      }
      if (!text) text = document.body.textContent?.trim() || "";

      return { title, text: text.replace(/\s+/g, " ").slice(0, 8000) };
    });

    return result;
  } finally {
    await browser.close();
  }
}

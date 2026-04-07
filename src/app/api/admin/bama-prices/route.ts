import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// GET: fetch prices from bama.ir API
export async function GET(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const sp = request.nextUrl.searchParams;
  const priceType = sp.get("priceType") || "MarketPrice"; // MarketPrice | FactoryPrice

  try {
    const res = await fetch(
      `https://bama.ir/api/v1/car/price?priceType=${priceType}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Accept-Language": "fa-IR,fa;q=0.9",
          "Referer": "https://bama.ir/price",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        error: `Bama API returned ${res.status}`,
        suggestion: "از روش کپی-پیست استفاده کنید",
      }, { status: 502 });
    }

    const data = await res.json();

    // Bama returns various structures, normalize it
    const items = extractPriceItems(data);

    // Match with our cars
    const cars = await prisma.car.findMany({
      select: { id: true, nameFa: true, nameEn: true, brand: true, brandFa: true, priceMin: true, priceMax: true },
    });

    const matched = matchPrices(items, cars);

    return NextResponse.json({
      source: "bama_api",
      priceType,
      total: items.length,
      matched: matched.filter((m) => m.carId).length,
      unmatched: matched.filter((m) => !m.carId).length,
      items: matched,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message || "Failed to fetch from Bama",
      suggestion: "از روش کپی-پیست استفاده کنید",
    }, { status: 502 });
  }
}

// POST: apply prices or parse pasted data
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const action = body.action; // "parse_paste" | "apply"

  if (action === "parse_paste") {
    return parsePastedData(body.text, body.priceType || "market");
  }

  if (action === "apply") {
    return applyPrices(body.items, body.priceType || "market");
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

// ── Parse pasted text from bama price table ──
// Bama copy format (each car spans multiple lines):
//   برند ,
//   مدل ,
//   تریم
//   سال
//   تاریخ یا "20 ساعت پیش"
//   نوع قیمت (قیمت بازار / قیمت نمایندگی)
//   درصد تغییر
//   قیمت عددی
//   تومان
async function parsePastedData(text: string, priceType: string) {
  if (!text || text.trim().length < 10) {
    return NextResponse.json({ error: "متن خالی یا خیلی کوتاه" }, { status: 400 });
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: BamaPriceItem[] = [];

  // Helper: convert Persian digits to Latin
  const toLatinDigits = (s: string) =>
    s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  // Helper: check if a line is a price (number with commas > 100M)
  const parseAsBamaPrice = (s: string): number => {
    const cleaned = toLatinDigits(s).replace(/[,،٬\s]/g, "");
    const num = parseInt(cleaned);
    return (!isNaN(num) && num >= 100_000_000) ? num : 0;
  };

  // Helper: check if line is a change percentage
  const parseAsChange = (s: string): number | null => {
    const match = toLatinDigits(s).match(/^[+-]?\s*(\d+)\s*%$/);
    if (match) return parseInt(toLatinDigits(s));
    if (s === "0%" || s === "۰%") return 0;
    return null;
  };

  // Helper: check if line is a year (2020-2030 or 1400-1410)
  const parseAsYear = (s: string): number => {
    const num = parseInt(toLatinDigits(s));
    if (!isNaN(num) && ((num >= 2020 && num <= 2030) || (num >= 1400 && num <= 1410))) return num;
    return 0;
  };

  // Skip header lines
  const SKIP_PATTERNS = [
    /قیمت خودرو/,
    /مشاهده تمام/,
    /^همه$/,
    /^بـا\s*مـا$/,
    /آخرین به روز/,
    /^تومان$/,
    /^ریال$/,
  ];

  const PRICE_TYPE_PATTERNS = [
    { pattern: /قیمت بازار/, type: "market" },
    { pattern: /قیمت نمایندگی|قیمت کارخانه/, type: "factory" },
  ];

  // State machine to collect multi-line records
  let currentBrand = "";
  let currentModel = "";
  let currentTrim = "";
  let currentYear = 0;
  let currentPriceType = "";
  let currentChange = 0;
  let nameParts: string[] = [];

  const flushRecord = (price: number) => {
    const fullName = nameParts.join(" ").replace(/\s+/g, " ").trim();
    if (fullName.length > 1 && price > 0) {
      items.push({
        brand: currentBrand,
        model: currentModel || fullName,
        trim: currentTrim,
        year: currentYear,
        price,
        change: currentChange,
        priceLabel: currentPriceType,
      });
    }
    // Reset for next record
    currentBrand = "";
    currentModel = "";
    currentTrim = "";
    currentYear = 0;
    currentPriceType = "";
    currentChange = 0;
    nameParts = [];
  };

  for (const line of lines) {
    // Skip known headers/noise
    if (SKIP_PATTERNS.some((p) => p.test(line))) continue;

    // Check if it's a price value → flush the record
    const priceVal = parseAsBamaPrice(line);
    if (priceVal > 0) {
      flushRecord(priceVal);
      continue;
    }

    // Check if it's a change percentage
    const changeVal = parseAsChange(line);
    if (changeVal !== null) {
      currentChange = changeVal;
      continue;
    }

    // Check if it's a year
    const yearVal = parseAsYear(line);
    if (yearVal > 0) {
      currentYear = yearVal;
      continue;
    }

    // Check if it's a price type label
    const ptMatch = PRICE_TYPE_PATTERNS.find((p) => p.pattern.test(line));
    if (ptMatch) {
      currentPriceType = ptMatch.type;
      continue;
    }

    // Check if it's a date (1404/12/24 or "20 ساعت پیش")
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(toLatinDigits(line)) || /ساعت|روز|دقیقه/.test(line)) {
      continue; // Skip dates
    }

    // Otherwise it's a name part (brand, model, trim)
    // Bama uses commas to separate: "نیسان ," then "آلتیما ," then "2.0 لیتر"
    const cleanedName = line.replace(/[,،]$/g, "").trim();
    if (cleanedName.length === 0) continue;

    if (!currentBrand) {
      currentBrand = cleanedName;
      nameParts.push(cleanedName);
    } else if (!currentModel) {
      currentModel = cleanedName;
      nameParts.push(cleanedName);
    } else {
      currentTrim = cleanedName;
      nameParts.push(cleanedName);
    }
  }

  // Match with DB cars
  const cars = await prisma.car.findMany({
    select: { id: true, nameFa: true, nameEn: true, brand: true, brandFa: true, priceMin: true, priceMax: true },
  });

  const matched = matchPrices(items, cars);

  return NextResponse.json({
    source: "paste",
    priceType,
    total: items.length,
    matched: matched.filter((m) => m.carId).length,
    unmatched: matched.filter((m) => !m.carId).length,
    items: matched,
  });
}

// ── Apply matched prices to database ──
async function applyPrices(items: MatchedPrice[], priceType: string) {
  let applied = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.carId || !item.price || item.price <= 0) {
      skipped++;
      continue;
    }

    // Ensure price is in Toman (if seems like Rial, convert)
    let priceToman = item.price;
    if (priceToman > 100_000_000_000) {
      priceToman = Math.round(priceToman / 10); // Rial to Toman
    }

    // Add to PriceHistory
    await prisma.priceHistory.create({
      data: {
        carId: item.carId,
        price: BigInt(priceToman),
        date: new Date(),
        source: "bama",
      },
    });

    // Update car priceMin/priceMax
    const car = await prisma.car.findUnique({
      where: { id: item.carId },
      select: { priceMin: true, priceMax: true, nameFa: true },
    });

    if (car) {
      const updates: any = {};
      if (priceToman < Number(car.priceMin) || Number(car.priceMin) === 0) {
        updates.priceMin = BigInt(priceToman);
      }
      if (priceToman > Number(car.priceMax)) {
        updates.priceMax = BigInt(priceToman);
      }
      if (Object.keys(updates).length > 0) {
        await prisma.car.update({ where: { id: item.carId }, data: updates });
      }

      // Notification for significant changes
      if (item.change && Math.abs(item.change) >= 2) {
        const direction = item.change > 0 ? "افزایش" : "کاهش";
        await prisma.notification.create({
          data: {
            type: "price_change",
            title: `${direction} قیمت ${car.nameFa}`,
            message: `${direction} ${Math.abs(item.change)}% بر اساس ${priceType === "factory" ? "قیمت کارخانه" : "قیمت بازار"} باما`,
            entityId: item.carId,
          },
        });
      }
    }

    applied++;
  }

  await logAction("import", "bama_prices", undefined, {
    priceType, applied, skipped, source: "bama",
  });

  return NextResponse.json({ applied, skipped });
}

// ── Types ──
interface BamaPriceItem {
  brand: string;
  model: string;
  trim: string;
  year: number;
  price: number;
  change: number;
  priceLabel?: string; // "market" | "factory"
}

interface MatchedPrice extends BamaPriceItem {
  carId: string | null;
  carNameFa: string | null;
  matchScore: number;
}

// ── Extract items from various bama response structures ──
function extractPriceItems(data: any): BamaPriceItem[] {
  // Bama might return { data: [...] } or { result: [...] } or just [...]
  let list: any[] = [];
  if (Array.isArray(data)) list = data;
  else if (data?.data && Array.isArray(data.data)) list = data.data;
  else if (data?.result && Array.isArray(data.result)) list = data.result;
  else if (data?.data?.result && Array.isArray(data.data.result)) list = data.data.result;
  else if (data?.data?.items && Array.isArray(data.data.items)) list = data.data.items;
  else {
    // Try to find any array in the response
    for (const key of Object.keys(data || {})) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        list = data[key];
        break;
      }
    }
  }

  return list.map((item: any) => ({
    brand: item.brand || item.Brand || item.brandName || "",
    model: item.model || item.Model || item.modelName || item.title || item.name || "",
    trim: item.trim || item.Trim || item.trimName || "",
    year: item.year || item.Year || item.modelYear || 0,
    price: parsePrice(item.price || item.Price || item.marketPrice || item.factoryPrice || 0),
    change: parseFloat(item.change || item.Change || item.priceChange || "0") || 0,
  }));
}

function parsePrice(val: any): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    return parseInt(val.replace(/[,،٬\s]/g, "")) || 0;
  }
  return 0;
}

// ── Match bama items with our car database ──
function matchPrices(items: BamaPriceItem[], cars: any[]): MatchedPrice[] {
  return items.map((item) => {
    const searchName = `${item.brand} ${item.model} ${item.trim}`.trim().toLowerCase();
    const searchNameFa = searchName;

    let bestMatch: any = null;
    let bestScore = 0;

    for (const car of cars) {
      let score = 0;
      const carNameFa = car.nameFa.toLowerCase();
      const carNameEn = car.nameEn.toLowerCase();
      const carBrand = car.brandFa.toLowerCase();

      // Exact name match
      if (carNameFa === searchNameFa || carNameEn === searchName) {
        score = 100;
      }
      // Contains check
      else if (searchNameFa.includes(carNameFa) || carNameFa.includes(searchNameFa)) {
        score = 80;
      }
      else if (searchName.includes(carNameEn) || carNameEn.includes(searchName)) {
        score = 80;
      }
      // Partial model match
      else {
        const modelWords = item.model.toLowerCase().split(/\s+/);
        const brandMatch = searchNameFa.includes(carBrand) || searchName.includes(car.brand.toLowerCase());
        const modelMatch = modelWords.some((w) =>
          w.length > 2 && (carNameFa.includes(w) || carNameEn.includes(w))
        );

        if (brandMatch && modelMatch) score = 60;
        else if (modelMatch) score = 40;
        else if (brandMatch) score = 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = car;
      }
    }

    return {
      ...item,
      carId: bestScore >= 40 ? bestMatch?.id : null,
      carNameFa: bestMatch?.nameFa || null,
      matchScore: bestScore,
    };
  });
}

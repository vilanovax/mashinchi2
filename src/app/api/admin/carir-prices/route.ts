import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

// POST: parse pasted data from car.ir OR apply prices
export async function POST(request: NextRequest) {
  const session = await verifyAdmin(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json();
  const action = body.action; // "parse" | "apply"

  if (action === "parse") {
    return parsePastedData(body.text);
  }

  if (action === "apply") {
    return applyPrices(body.items, body.date);
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

// ── Parse pasted text from car.ir/prices ──
// Format per car (tab/newline separated):
//   نام خودرو (e.g. "جک J4")
//   قیمت بازار (e.g. "۱,۷۳۰,۰۰۰,۰۰۰")
//   قیمت کارخانه (e.g. "۱,۲۳۵,۰۰۰,۰۰۰")
//   تغییر درصد (e.g. "(%۶.۴۹)") or "۰"
//   مبلغ تغییر (optional, e.g. "۱۲۰,۱۰۰,۰۰۰")
//   (empty line separator)
async function parsePastedData(text: string) {
  if (!text || text.trim().length < 10) {
    return NextResponse.json({ error: "متن خالی یا خیلی کوتاه" }, { status: 400 });
  }

  const toLatinDigits = (s: string) =>
    s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  // Parse a Persian number with commas to integer
  const parseNum = (s: string): number => {
    const cleaned = toLatinDigits(s).replace(/[,،٬\s]/g, "");
    const num = parseInt(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Check if a line is a price (number >= 100M toman)
  const isPrice = (s: string): boolean => {
    const num = parseNum(s);
    return num >= 100_000_000;
  };

  // Check if a line is a change percentage like (%۶.۴۹) or (۰.۸۲%) or ۰
  const isChange = (s: string): boolean => {
    const latin = toLatinDigits(s).trim();
    return /^\(?%?-?\d+\.?\d*%?\)?$/.test(latin) || latin === "0";
  };

  // Parse change percentage
  const parseChange = (s: string): number => {
    const latin = toLatinDigits(s).replace(/[()%]/g, "").trim();
    return parseFloat(latin) || 0;
  };

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Skip header line
  const SKIP = [/^نام خودرو/, /^قیمت بازار/, /^قیمت کارخانه/, /^تغییر/];

  interface CarirItem {
    name: string;
    marketPrice: number;
    factoryPrice: number;
    changePct: number;
  }

  const items: CarirItem[] = [];

  // State machine
  let currentName = "";
  let pricesCollected: number[] = [];
  let changePct = 0;

  const flush = () => {
    if (currentName && pricesCollected.length >= 1) {
      items.push({
        name: currentName,
        marketPrice: pricesCollected[0], // First number = market price
        factoryPrice: pricesCollected[1] || 0,
        changePct,
      });
    }
    currentName = "";
    pricesCollected = [];
    changePct = 0;
  };

  for (const line of lines) {
    // Skip headers
    if (SKIP.some((p) => p.test(line))) continue;

    // Is it a price?
    if (isPrice(line)) {
      pricesCollected.push(parseNum(line));
      continue;
    }

    // Is it a change percentage?
    if (isChange(line)) {
      changePct = parseChange(line);
      continue;
    }

    // Is it a small change amount (< 100M)? Skip
    const numVal = parseNum(line);
    if (numVal > 0 && numVal < 100_000_000) {
      continue;
    }

    // Otherwise it's a car name → flush previous and start new
    if (line.length > 1 && !/^\d+$/.test(toLatinDigits(line))) {
      flush();
      currentName = line;
    }
  }
  flush(); // Don't forget the last one

  // Match with DB cars
  const cars = await prisma.car.findMany({
    select: { id: true, nameFa: true, nameEn: true, brand: true, brandFa: true, priceMin: true, priceMax: true },
  });

  const matched = items.map((item) => {
    const searchName = item.name.trim();
    let bestMatch: typeof cars[0] | null = null;
    let bestScore = 0;

    for (const car of cars) {
      let score = 0;
      const carNameFa = car.nameFa;
      const carBrandFa = car.brandFa;

      // Exact match
      if (carNameFa === searchName) {
        score = 100;
      }
      // Car name contains search or vice versa
      else if (searchName.includes(carNameFa) || carNameFa.includes(searchName)) {
        score = 85;
      }
      // Brand + model matching
      else {
        const searchWords = searchName.split(/\s+/);
        const brandMatch = searchWords.some((w) => carBrandFa.includes(w) || w.includes(carBrandFa));
        const nameWords = carNameFa.split(/\s+/);
        const modelMatch = searchWords.some((sw) =>
          sw.length > 1 && nameWords.some((nw) => nw.length > 1 && (nw.includes(sw) || sw.includes(nw)))
        );

        if (brandMatch && modelMatch) score = 65;
        else if (modelMatch) score = 45;
        else if (brandMatch) score = 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = car;
      }
    }

    return {
      name: item.name,
      marketPrice: item.marketPrice,
      factoryPrice: item.factoryPrice,
      changePct: item.changePct,
      carId: bestScore >= 40 ? bestMatch?.id || null : null,
      carNameFa: bestScore >= 40 ? bestMatch?.nameFa || null : null,
      matchScore: bestScore,
    };
  });

  return NextResponse.json({
    source: "car.ir",
    total: items.length,
    matched: matched.filter((m) => m.carId).length,
    unmatched: matched.filter((m) => !m.carId).length,
    items: matched,
  });
}

// ── Apply matched prices to database ──
interface ApplyItem {
  carId: string | null;
  marketPrice: number;
  changePct: number;
  name: string;
  carNameFa: string | null;
}

async function applyPrices(items: ApplyItem[], date?: string) {
  const priceDate = date ? new Date(date) : new Date();
  let applied = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.carId || !item.marketPrice || item.marketPrice <= 0) {
      skipped++;
      continue;
    }

    // Add to PriceHistory
    await prisma.priceHistory.create({
      data: {
        carId: item.carId,
        price: BigInt(item.marketPrice),
        date: priceDate,
        source: "car.ir",
      },
    });

    // Update car priceMin/priceMax
    const car = await prisma.car.findUnique({
      where: { id: item.carId },
      select: { priceMin: true, priceMax: true, nameFa: true },
    });

    if (car) {
      const updates: Record<string, bigint> = {};
      if (item.marketPrice < Number(car.priceMin) || Number(car.priceMin) === 0) {
        updates.priceMin = BigInt(item.marketPrice);
      }
      if (item.marketPrice > Number(car.priceMax)) {
        updates.priceMax = BigInt(item.marketPrice);
      }
      if (Object.keys(updates).length > 0) {
        await prisma.car.update({ where: { id: item.carId }, data: updates });
      }

      // Notification for significant changes
      if (item.changePct && Math.abs(item.changePct) >= 2) {
        const direction = item.changePct > 0 ? "افزایش" : "کاهش";
        await prisma.notification.create({
          data: {
            type: "price_change",
            title: `${direction} قیمت ${car.nameFa}`,
            message: `${direction} ${Math.abs(item.changePct).toFixed(1)}% بر اساس car.ir`,
            entityId: item.carId,
          },
        });
      }
    }

    applied++;
  }

  await logAction("import", "carir_prices", undefined, {
    applied, skipped, source: "car.ir",
  });

  return NextResponse.json({ applied, skipped });
}

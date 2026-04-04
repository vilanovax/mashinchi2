import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdmin, unauthorizedResponse } from "@/lib/adminAuth";
import { logAction } from "@/lib/auditLog";

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();

  const carId = request.nextUrl.searchParams.get("carId");
  if (!carId) return NextResponse.json({ error: "carId required" }, { status: 400 });

  const prices = await prisma.priceHistory.findMany({
    where: { carId },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json(prices.map((p) => ({
    id: p.id, carId: p.carId, price: p.price.toString(),
    date: p.date.toISOString(), source: p.source,
  })));
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorizedResponse();
  const body = await request.json();

  const newPrice = BigInt(body.price);

  // Get car info and last price for change detection
  const car = await prisma.car.findUnique({ where: { id: body.carId }, select: { nameFa: true, priceMin: true } });
  const lastPrice = await prisma.priceHistory.findFirst({
    where: { carId: body.carId },
    orderBy: { date: "desc" },
  });

  const price = await prisma.priceHistory.create({
    data: {
      carId: body.carId,
      price: newPrice,
      date: new Date(body.date || Date.now()),
      source: body.source || "manual",
    },
  });

  // Detect price change and create notification
  if (lastPrice && car) {
    const oldPrice = Number(lastPrice.price);
    const newPriceNum = Number(newPrice);
    const changePercent = Math.round(((newPriceNum - oldPrice) / oldPrice) * 100);

    if (changePercent !== 0) {
      const direction = changePercent > 0 ? "افزایش" : "کاهش";
      await prisma.notification.create({
        data: {
          type: "price_change",
          title: `تغییر قیمت ${car.nameFa}`,
          message: `${direction} ${Math.abs(changePercent)}% - از ${formatToman(oldPrice)} به ${formatToman(newPriceNum)}`,
          entityId: body.carId,
        },
      });

      await logAction("update", "price", body.carId, {
        nameFa: car.nameFa, oldPrice: oldPrice.toString(), newPrice: newPriceNum.toString(), changePercent,
      });

      // Also update car priceMin/priceMax if needed
      if (newPriceNum < Number(car.priceMin)) {
        await prisma.car.update({ where: { id: body.carId }, data: { priceMin: newPrice } });
      }
    }
  }

  return NextResponse.json({ id: price.id, price: price.price.toString(), date: price.date.toISOString(), source: price.source });
}

function formatToman(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} میلیارد`;
  if (num >= 1_000_000) return `${Math.round(num / 1_000_000)} میلیون`;
  return num.toLocaleString();
}

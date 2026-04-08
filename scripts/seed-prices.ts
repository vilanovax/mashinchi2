import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  const cars = await prisma.car.findMany({ select: { id: true, priceMin: true, priceMax: true } });
  console.log('Found', cars.length, 'cars');

  const now = new Date();
  const records: { carId: string; price: bigint; date: Date; source: string }[] = [];

  for (const car of cars) {
    const basePrice = Number((BigInt(car.priceMin) + BigInt(car.priceMax)) / 2n);
    const trendPct = (Math.random() * 15 - 5) / 100;

    for (let d = 90; d >= 0; d -= 3) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);

      const progress = (90 - d) / 90;
      const trend = basePrice * trendPct * progress;
      const noise = basePrice * (Math.random() * 0.02 - 0.01);
      const price = Math.round(basePrice + trend + noise);

      records.push({
        carId: car.id,
        price: BigInt(price),
        date: date,
        source: ['bama', 'divar'][Math.floor(Math.random() * 2)],
      });
    }
  }

  await prisma.priceHistory.deleteMany();

  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500);
    await prisma.priceHistory.createMany({ data: batch });
  }

  console.log('Seeded', records.length, 'price history records');
  await pool.end();
}

seed().catch(console.error);

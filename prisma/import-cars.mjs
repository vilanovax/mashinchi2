import 'dotenv/config';
import { readFileSync } from 'fs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const clientMod = await import('../src/generated/prisma/client.ts');
const { PrismaClient } = clientMod.default || clientMod;
const prisma = new PrismaClient({ adapter });

// ── Read JSON file from command line argument ──
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npm run db:import -- <path-to-json-file>');
  console.error('Example: npm run db:import -- data/new-cars.json');
  process.exit(1);
}

const raw = readFileSync(filePath, 'utf-8');
let carsData = JSON.parse(raw);

// Support both single object and array
if (!Array.isArray(carsData)) {
  carsData = [carsData];
}

async function importCars() {
  console.log(`Importing ${carsData.length} car(s) from ${filePath}...\n`);

  let imported = 0;
  let skipped = 0;

  for (const data of carsData) {
    // Check if car already exists
    const existing = await prisma.car.findFirst({
      where: { nameEn: data.nameEn },
    });

    if (existing) {
      console.log(`  ⏭ ${data.nameFa} (${data.nameEn}) — already exists, skipping`);
      skipped++;
      continue;
    }

    // Create car with scores, specs, tags
    const carCreateData = {
      nameEn: data.nameEn,
      nameFa: data.nameFa,
      brand: data.brand,
      brandFa: data.brandFa,
      category: data.category,
      year: data.year,
      priceMin: BigInt(data.priceMin),
      priceMax: BigInt(data.priceMax),
      origin: data.origin,
      description: data.description || '',
      imageUrl: data.imageUrl || null,
    };

    // Scores
    if (data.scores) {
      carCreateData.scores = { create: data.scores };
    }

    // Specs
    if (data.specs) {
      carCreateData.specs = { create: data.specs };
    }

    // Tags
    if (data.tags && data.tags.length > 0) {
      carCreateData.tags = {
        create: data.tags.map((tag) => ({ tag })),
      };
    }

    const car = await prisma.car.create({ data: carCreateData });

    // Intelligence (if provided)
    if (data.intelligence) {
      const intel = data.intelligence;
      // Convert string arrays fields if they're arrays
      const arrayFields = [
        'frequentPros', 'frequentCons', 'commonIssues', 'purchaseWarnings',
      ];
      for (const field of arrayFields) {
        if (Array.isArray(intel[field])) {
          // Prisma expects string arrays — keep as-is
        } else if (typeof intel[field] === 'string') {
          intel[field] = [intel[field]];
        }
      }

      await prisma.carIntelligence.create({
        data: {
          carId: car.id,
          ...intel,
        },
      });
    }

    console.log(`  ✅ ${car.nameFa} (${car.nameEn})`);
    imported++;
  }

  console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}`);
}

importCars()
  .catch((e) => { console.error('Import error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

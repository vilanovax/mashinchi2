-- CreateTable
CREATE TABLE "ListingStats" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "avgPrice" BIGINT,
    "minPrice" BIGINT,
    "maxPrice" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketInsight" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "highlights" TEXT[],
    "topRisers" TEXT[],
    "topFallers" TEXT[],
    "hotListings" TEXT[],
    "aiAnalysis" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingStats_carId_date_idx" ON "ListingStats"("carId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ListingStats_carId_date_source_key" ON "ListingStats"("carId", "date", "source");

-- CreateIndex
CREATE INDEX "MarketInsight_date_period_idx" ON "MarketInsight"("date", "period");

-- AddForeignKey
ALTER TABLE "ListingStats" ADD CONSTRAINT "ListingStats_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

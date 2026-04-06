-- CreateTable
CREATE TABLE "CarRawAnalysis" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "rawJson" TEXT NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "commonProblems" TEXT[],
    "buyReasons" TEXT[],
    "avoidReasons" TEXT[],
    "statements" TEXT,
    "featureStats" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "processLog" TEXT,
    "sourceLabel" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarRawAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarRawAnalysis_carId_status_idx" ON "CarRawAnalysis"("carId", "status");

-- AddForeignKey
ALTER TABLE "CarRawAnalysis" ADD CONSTRAINT "CarRawAnalysis_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

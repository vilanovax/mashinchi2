-- CreateTable
CREATE TABLE "CarSource" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "rawText" TEXT NOT NULL,
    "processedSummary" TEXT,
    "extractedPros" TEXT[],
    "extractedCons" TEXT[],
    "extractedIssues" TEXT[],
    "extractedWarnings" TEXT[],
    "extractedScores" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedAt" TIMESTAMP(3),
    "lastCrawledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarSource_carId_status_idx" ON "CarSource"("carId", "status");

-- AddForeignKey
ALTER TABLE "CarSource" ADD CONSTRAINT "CarSource_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

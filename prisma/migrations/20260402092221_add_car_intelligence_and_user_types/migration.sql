-- AlterTable
ALTER TABLE "UserTasteProfile" ADD COLUMN     "typeCity" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeEconomic" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeFamily" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeOffroad" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typePrestige" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeSafe" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeSpecial" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeSport" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "typeTravel" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CarIntelligence" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "acceleration" INTEGER NOT NULL DEFAULT 5,
    "depreciation" INTEGER NOT NULL DEFAULT 5,
    "repairCost" INTEGER NOT NULL DEFAULT 5,
    "secondHandMarket" INTEGER NOT NULL DEFAULT 5,
    "priceDropRate" INTEGER NOT NULL DEFAULT 5,
    "buildQuality" INTEGER NOT NULL DEFAULT 5,
    "afterSalesService" INTEGER NOT NULL DEFAULT 5,
    "ownerSatisfaction" INTEGER NOT NULL DEFAULT 5,
    "purchaseRisk" INTEGER NOT NULL DEFAULT 5,
    "fuelEconomy" INTEGER NOT NULL DEFAULT 5,
    "suitFamily" INTEGER NOT NULL DEFAULT 5,
    "suitCity" INTEGER NOT NULL DEFAULT 5,
    "suitTravel" INTEGER NOT NULL DEFAULT 5,
    "suitYoung" INTEGER NOT NULL DEFAULT 5,
    "suitInvestment" INTEGER NOT NULL DEFAULT 5,
    "frequentPros" TEXT[],
    "frequentCons" TEXT[],
    "commonIssues" TEXT[],
    "purchaseWarnings" TEXT[],
    "ownerVerdict" TEXT NOT NULL,
    "overallSummary" TEXT NOT NULL,
    "whyBuy" TEXT NOT NULL,
    "whyNotBuy" TEXT NOT NULL,

    CONSTRAINT "CarIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarIntelligence_carId_key" ON "CarIntelligence"("carId");

-- AddForeignKey
ALTER TABLE "CarIntelligence" ADD CONSTRAINT "CarIntelligence_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

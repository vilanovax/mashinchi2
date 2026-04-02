-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "brandFa" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "priceMin" BIGINT NOT NULL,
    "priceMax" BIGINT NOT NULL,
    "imageUrl" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT true,
    "origin" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarScores" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "comfort" INTEGER NOT NULL DEFAULT 5,
    "performance" INTEGER NOT NULL DEFAULT 5,
    "economy" INTEGER NOT NULL DEFAULT 5,
    "safety" INTEGER NOT NULL DEFAULT 5,
    "prestige" INTEGER NOT NULL DEFAULT 5,
    "reliability" INTEGER NOT NULL DEFAULT 5,
    "resaleValue" INTEGER NOT NULL DEFAULT 5,
    "familyFriendly" INTEGER NOT NULL DEFAULT 5,
    "sportiness" INTEGER NOT NULL DEFAULT 5,
    "offroad" INTEGER NOT NULL DEFAULT 5,
    "cityDriving" INTEGER NOT NULL DEFAULT 5,
    "longTrip" INTEGER NOT NULL DEFAULT 5,
    "maintenanceRisk" INTEGER NOT NULL DEFAULT 5,
    "afterSales" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "CarScores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarSpecs" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "engine" TEXT,
    "horsepower" INTEGER,
    "torque" INTEGER,
    "transmission" TEXT,
    "fuelType" TEXT,
    "fuelConsumption" DOUBLE PRECISION,
    "acceleration" DOUBLE PRECISION,
    "trunkVolume" INTEGER,
    "groundClearance" INTEGER,
    "length" INTEGER,
    "width" INTEGER,
    "weight" INTEGER,
    "seatingCapacity" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "CarSpecs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarTag" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "CarTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarReview" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "warnings" TEXT[],
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "budget" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTasteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comfort" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "economy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safety" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prestige" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reliability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resaleValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "familyFriendly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sportiness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "offroad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cityDriving" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longTrip" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTasteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "schedule" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarScores_carId_key" ON "CarScores"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "CarSpecs_carId_key" ON "CarSpecs"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "CarTag_carId_tag_key" ON "CarTag"("carId", "tag");

-- CreateIndex
CREATE INDEX "PriceHistory_carId_date_idx" ON "PriceHistory"("carId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "User_sessionId_key" ON "User"("sessionId");

-- CreateIndex
CREATE INDEX "UserInteraction_userId_action_idx" ON "UserInteraction"("userId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "UserTasteProfile_userId_key" ON "UserTasteProfile"("userId");

-- AddForeignKey
ALTER TABLE "CarScores" ADD CONSTRAINT "CarScores_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarSpecs" ADD CONSTRAINT "CarSpecs_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarTag" ADD CONSTRAINT "CarTag_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarReview" ADD CONSTRAINT "CarReview_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTasteProfile" ADD CONSTRAINT "UserTasteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

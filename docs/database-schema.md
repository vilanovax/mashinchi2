# Database Schema — Mashinchi

> PostgreSQL via Prisma ORM
> Last updated: 2026-04-08

---

## Models Overview

| Model | Purpose | Relations |
|-------|---------|-----------|
| Car | Main car entity | Scores, Specs, Tags, Intel, Reviews, Prices, Sources, Listings, RawAnalyses |
| CarScores | 14-dimension scoring (1-10) | Car (1:1) |
| CarSpecs | Technical specifications | Car (1:1) |
| CarTag | Persian categorization tags | Car (1:N) |
| CarIntelligence | AI-generated insights + scores | Car (1:1) |
| CarReview | User/expert reviews | Car (1:N) |
| PriceHistory | Price tracking over time | Car (1:N) |
| CarSource | Raw crawled/pasted content | Car (1:N) |
| CarRawAnalysis | AI-extracted analysis data | Car (1:N) |
| ListingStats | Daily listing count snapshots | Car (1:N) |
| MarketInsight | Market analysis reports | standalone |
| User | Session-based user | Interactions, TasteProfile |
| UserInteraction | like/skip/compare/detail_view | User, Car |
| UserTasteProfile | Personalized taste vector | User (1:1) |
| CrawlerConfig | Web crawler definitions | standalone |
| AuditLog | Activity logging | standalone |
| AdminUser | Admin accounts with roles | standalone |
| AppSettings | Key-value config store | standalone |
| Notification | System notifications | standalone |

---

## Car (Main Entity)

```
id          String   @id @default(cuid())
nameEn      String                        # "Hyundai Tucson"
nameFa      String                        # "هیوندای توسان"
brand       String                        # "Hyundai"
brandFa     String                        # "هیوندای"
category    String                        # sedan | suv | hatchback | crossover | pickup
year        Int                           # 1403 (Shamsi) or 2024
priceMin    BigInt                        # min price in Toman
priceMax    BigInt                        # max price in Toman
imageUrl    String?
isNew       Boolean  @default(true)       # zero-km vs used
origin      String                        # iranian | chinese | korean | japanese | european
description String?                       # short Persian description
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

## CarScores (1:1 with Car)

All fields `Int @default(5)` — scale 1-10:

| Field | Description |
|-------|-------------|
| comfort | Ride comfort |
| performance | Engine power & acceleration |
| economy | Fuel + maintenance cost |
| safety | Active & passive safety |
| prestige | Social status |
| reliability | Durability & dependability |
| resaleValue | Liquidity in used market |
| familyFriendly | Suitability for families |
| sportiness | Sport driving feel |
| offroad | Off-road capability |
| cityDriving | City driving suitability |
| longTrip | Long distance comfort |
| maintenanceRisk | Breakdown risk (10 = very risky) |
| afterSales | Dealer/service quality |

## CarSpecs (1:1 with Car)

```
engine          String?   # "1.5L Turbo"
horsepower      Int?
torque          Int?
transmission    String?   # manual | automatic | CVT
fuelType        String?   # gasoline | diesel | hybrid | electric
fuelConsumption Float?    # liters per 100km
acceleration    Float?    # 0-100 km/h seconds
trunkVolume     Int?      # liters
groundClearance Int?      # mm
length          Int?      # mm
width           Int?      # mm
weight          Int?      # kg
seatingCapacity Int       # default 5
```

## CarIntelligence (1:1 with Car)

**Core scores (1-10):**
acceleration, depreciation, repairCost, secondHandMarket, priceDropRate, buildQuality, afterSalesService, ownerSatisfaction, purchaseRisk, fuelEconomy

**Suitability scores (1-10):**
suitFamily, suitCity, suitTravel, suitYoung, suitInvestment

**Rich text (Farsi):**

| Field | Type | Description |
|-------|------|-------------|
| frequentPros | String[] | Common strengths |
| frequentCons | String[] | Common weaknesses |
| commonIssues | String[] | Known problems |
| purchaseWarnings | String[] | Buyer alerts |
| ownerVerdict | String | Owner consensus |
| overallSummary | String | AI summary |
| whyBuy | String | Reasons to buy |
| whyNotBuy | String | Reasons to avoid |

## CarRawAnalysis (1:N with Car)

Stores AI-extracted analysis data in raw form for later processing.

```
rawJson         String    # entire AI-extracted JSON
pros            String[]  # parsed for quick access
cons            String[]
commonProblems  String[]
buyReasons      String[]
avoidReasons    String[]
statements      String?   # JSON: [{ feature, sentiment, problem, importance, source, statement }]
featureStats    String?   # JSON: [{ feature, positive_count, negative_count, overall_result }]
status          String    # pending | processing | processed | failed
processedAt     DateTime?
processLog      String?   # what was generated
sourceLabel     String?   # "ChatGPT extraction"
version         Int       # for re-processing
```

**Processing flow:** Raw JSON → parse statements/featureStats → generate CarScores + CarIntelligence

## PriceHistory (1:N with Car)

```
carId     String
price     BigInt     # price in Toman
date      DateTime
source    String     # bama | divar | manual
```
Index: `[carId, date]`

## ListingStats (1:N with Car)

Daily snapshot of listings count per car per source.

```
carId     String
date      DateTime
count     Int
source    String     # bama | divar | manual
avgPrice  BigInt?
minPrice  BigInt?
maxPrice  BigInt?
```
Unique: `[carId, date, source]`

## MarketInsight (standalone)

```
date        DateTime
period      String     # daily | weekly | monthly | quarterly
title       String
summary     String
highlights  String[]
topRisers   String[]   # car names with biggest price increase
topFallers  String[]
hotListings String[]   # cars with most listings
aiAnalysis  String?
```

## User & Taste System

**User:** Session-based (cookie), no auth needed. Has optional `budget` (BigInt).

**UserInteraction:** Tracks `like`, `skip`, `compare`, `detail_view` per car per round.

**UserTasteProfile:** 14 taste dimensions (Float) + 10 user type scores:
- typeEconomic, typeFamily, typeSport, typePrestige, typeSafe
- typeSpecial, typeOffroad, typeCity, typeTravel, typeInvestment

## Admin System

**AdminUser:** Roles are `super_admin`, `editor`, `viewer`. Password stored as simple hash.

**AuditLog:** Tracks all admin actions with entity type, entity ID, and JSON details.

**AppSettings:** Key-value store for AI provider, model, API keys.

**Notification:** Price changes, new reviews, system alerts. Has `isRead` flag.

---

## Migrations History

| Migration | Description |
|-----------|-------------|
| 20260402045304_init | Car, CarScores, CarSpecs, CarTag, CarReview, PriceHistory, User |
| 20260402092221_add_car_intelligence | CarIntelligence + user type scores |
| 20260404054158_add_audit_log | AuditLog |
| 20260404061022_add_admin_users | AdminUser, Notification |
| 20260404124932_add_app_settings | AppSettings |
| 20260404133135_add_car_sources | CarSource |
| 20260406082750_add_market_models | ListingStats, MarketInsight |
| 20260406121239_add_car_raw_analysis | CarRawAnalysis |

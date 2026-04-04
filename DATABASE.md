# ماشینچی - مستندات دیتابیس و راه‌اندازی محلی

## فهرست
- [راه‌اندازی سریع](#راه‌اندازی-سریع)
- [Docker و PostgreSQL](#docker-و-postgresql)
- [تنظیمات محیطی](#تنظیمات-محیطی)
- [Prisma ORM](#prisma-orm)
- [اسکیمای دیتابیس](#اسکیمای-دیتابیس)
- [Seed Data](#seed-data)
- [Migration History](#migration-history)
- [دستورات مفید](#دستورات-مفید)
- [عیب‌یابی](#عیب‌یابی)

---

## راه‌اندازی سریع

```bash
# 1. Clone و نصب
git clone https://github.com/vilanovax/mashinchi2.git
cd mashinchi2
npm install

# 2. فایل محیطی
cp .env.example .env
# ANTHROPIC_API_KEY خود را در .env وارد کنید

# 3. اجرای PostgreSQL با Docker
docker compose up -d

# 4. اعمال migration‌ها و ساخت Prisma Client
npx prisma migrate dev
npx prisma generate

# 5. Seed دیتابیس (۵۰ خودرو + نظرات + اطلاعات هوشمند)
npm run db:seed
node --import jiti/register prisma/seed-reviews.mjs
npm run db:seed-intel

# 6. اجرا
npm run dev
# http://localhost:3000
# پنل ادمین: http://localhost:3000/admin (رمز: mashinchi-admin-2024)
```

---

## Docker و PostgreSQL

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: mashinchi-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: mashinchi2
      POSTGRES_USER: mashinchi
      POSTGRES_PASSWORD: mashinchi
    ports:
      - "5434:5432"    # پورت خارجی 5434 (تداخل نداشته باشد با postgres محلی)
    volumes:
      - mashinchi_data:/var/lib/postgresql/data

volumes:
  mashinchi_data:       # داده‌ها persistent هستند
```

### اطلاعات اتصال

| پارامتر | مقدار |
|---------|-------|
| Host | `localhost` |
| Port | `5434` |
| Database | `mashinchi2` |
| User | `mashinchi` |
| Password | `mashinchi` |
| Connection String | `postgresql://mashinchi:mashinchi@localhost:5434/mashinchi2` |

### دستورات Docker

```bash
docker compose up -d          # اجرا در پس‌زمینه
docker compose down           # توقف (داده‌ها حفظ می‌شوند)
docker compose down -v        # توقف + حذف داده‌ها (fresh start)
docker compose logs -f db     # مشاهده لاگ
docker exec -it mashinchi-db psql -U mashinchi -d mashinchi2  # دسترسی مستقیم به DB
```

---

## تنظیمات محیطی

فایل `.env` در ریشه پروژه:

```env
# اتصال به دیتابیس (الزامی)
DATABASE_URL="postgresql://mashinchi:mashinchi@localhost:5434/mashinchi2"

# کلید API آنتروپیک برای تولید محتوای AI (الزامی برای /api/summary و admin/ai)
ANTHROPIC_API_KEY="sk-ant-api03-..."

# رمز عبور پنل ادمین (اختیاری - پیش‌فرض: mashinchi-admin-2024)
ADMIN_PASSWORD="mashinchi-admin-2024"
```

---

## Prisma ORM

### ساختار فایل‌ها

```
prisma/
├── schema.prisma              # اسکیمای دیتابیس
├── prisma.config.ts           # (ریشه پروژه) تنظیمات Prisma
├── seed.mjs                   # Seed اصلی: 50 خودرو با scores + specs + tags
├── seed-reviews.mjs           # Seed نظرات: ~150 نظر برای 50 خودرو
├── seed-intelligence.mjs      # Seed اطلاعات هوشمند: intel data برای 50 خودرو
└── migrations/
    ├── 20260402045304_init/
    ├── 20260402092221_add_car_intelligence_and_user_types/
    ├── 20260404054158_add_audit_log/
    └── 20260404061022_add_admin_users_notifications/
```

### Prisma Client

```
src/
├── generated/prisma/          # Auto-generated (gitignore شده)
└── lib/prisma.ts              # Singleton instance با PrismaPg adapter
```

Prisma Client از `@prisma/adapter-pg` (driver adapter) استفاده می‌کند - نه driver پیش‌فرض.

---

## اسکیمای دیتابیس

### نمودار روابط (ERD)

```
Car (1) ──── (1) CarScores          امتیازات 14 بعدی (1-10)
 │  ──── (1) CarSpecs             مشخصات فنی
 │  ──── (1) CarIntelligence      هوش خودرو (متون + امتیازات)
 │  ──── (*) CarTag               تگ‌های فارسی
 │  ──── (*) CarReview            نظرات کاربران/کارشناسان
 │  ──── (*) PriceHistory         تاریخچه قیمت
 │  ──── (*) UserInteraction ──── (1) User
 │                                    │
 │                                    └── (1) UserTasteProfile
 │
 ├── CrawlerConfig               تنظیمات اسکرپر
 ├── AuditLog                    لاگ عملیات ادمین
 ├── AdminUser                   کاربران پنل ادمین
 └── Notification                اعلان‌ها (تغییر قیمت و...)
```

### جداول اصلی

#### 1. `Car` - خودرو (جدول مرکزی)

| فیلد | نوع | توضیح |
|------|-----|-------|
| `id` | String (cuid) | شناسه یکتا |
| `nameEn` | String | نام انگلیسی (مثلا "Iran Khodro Tara") |
| `nameFa` | String | نام فارسی (مثلا "تارا") |
| `brand` | String | برند انگلیسی |
| `brandFa` | String | برند فارسی |
| `category` | String | `sedan`, `suv`, `hatchback`, `crossover`, `pickup` |
| `year` | Int | سال مدل |
| `priceMin` | BigInt | حداقل قیمت (تومان) |
| `priceMax` | BigInt | حداکثر قیمت (تومان) |
| `imageUrl` | String? | آدرس تصویر (مثلا `/cars/xxx.jpg`) |
| `isNew` | Boolean | صفر کیلومتر یا دسته‌دوم |
| `origin` | String | `iranian`, `chinese`, `korean`, `japanese`, `european` |
| `description` | String? | توضیح کوتاه فارسی |

**Cascade Delete:** حذف Car تمام رکوردهای مرتبط را حذف می‌کند.

#### 2. `CarScores` - امتیازات (1:1 با Car)

14 معیار، هر کدام عدد 1-10:

| فیلد | توضیح فارسی |
|------|-------------|
| `comfort` | راحتی |
| `performance` | عملکرد |
| `economy` | صرفه اقتصادی (سوخت + نگهداری) |
| `safety` | ایمنی |
| `prestige` | پرستیژ |
| `reliability` | قابلیت اطمینان |
| `resaleValue` | نقدشوندگی |
| `familyFriendly` | مناسب خانواده |
| `sportiness` | اسپرت بودن |
| `offroad` | آفرود |
| `cityDriving` | رانندگی شهری |
| `longTrip` | سفر طولانی |
| `maintenanceRisk` | ریسک نگهداری (بالاتر = بدتر) |
| `afterSales` | کیفیت خدمات پس از فروش |

#### 3. `CarSpecs` - مشخصات فنی (1:1 با Car)

| فیلد | نوع | توضیح |
|------|-----|-------|
| `engine` | String? | مثلا "1.5L Turbo" |
| `horsepower` | Int? | اسب بخار |
| `torque` | Int? | گشتاور (Nm) |
| `transmission` | String? | `manual`, `automatic`, `CVT` |
| `fuelType` | String? | `gasoline`, `diesel`, `hybrid`, `electric` |
| `fuelConsumption` | Float? | لیتر بر ۱۰۰ کیلومتر |
| `acceleration` | Float? | ۰ تا ۱۰۰ (ثانیه) |
| `trunkVolume` | Int? | حجم صندوق (لیتر) |
| `groundClearance` | Int? | ارتفاع از زمین (mm) |
| `length` | Int? | طول (mm) |
| `width` | Int? | عرض (mm) |
| `weight` | Int? | وزن (kg) |
| `seatingCapacity` | Int | ظرفیت سرنشین (پیش‌فرض: 5) |

#### 4. `CarIntelligence` - هوش خودرو (1:1 با Car)

**امتیازات هوشمند (1-10):**

| فیلد | توضیح |
|------|-------|
| `acceleration` | شتاب |
| `depreciation` | نرخ استهلاک |
| `repairCost` | هزینه تعمیر (10 = خیلی گران) |
| `secondHandMarket` | نقدشوندگی بازار دست‌دوم |
| `priceDropRate` | سرعت افت قیمت |
| `buildQuality` | کیفیت ساخت |
| `afterSalesService` | خدمات پس از فروش |
| `ownerSatisfaction` | رضایت مالکان |
| `purchaseRisk` | ریسک خرید (10 = خیلی پرریسک) |
| `fuelEconomy` | بهره‌وری سوخت |
| `suitFamily/City/Travel/Young/Investment` | تناسب با نیازهای مختلف |

**متون فارسی:**

| فیلد | نوع | توضیح |
|------|-----|-------|
| `frequentPros` | String[] | نقاط قوت پرتکرار |
| `frequentCons` | String[] | نقاط ضعف پرتکرار |
| `commonIssues` | String[] | خرابی‌های رایج |
| `purchaseWarnings` | String[] | هشدارهای خرید |
| `ownerVerdict` | String | نظر رایج مالکان |
| `overallSummary` | String | جمع‌بندی هوشمند |
| `whyBuy` | String | چرا بخری |
| `whyNotBuy` | String | چرا نخری |

#### 5. `CarTag` - تگ‌ها (N:1 با Car)

تگ‌های فارسی مثل "خانوادگی"، "اسپرت"، "کم‌مصرف".
Unique constraint روی `(carId, tag)`.

#### 6. `CarReview` - نظرات (N:1 با Car)

| فیلد | توضیح |
|------|-------|
| `source` | `bama`, `blog`, `user`, `expert` |
| `summary` | خلاصه نظر (فارسی) |
| `pros` | String[] - مزایا |
| `cons` | String[] - معایب |
| `warnings` | String[] - هشدارها |
| `rating` | Float? (1-5) |

#### 7. `PriceHistory` - تاریخچه قیمت (N:1 با Car)

| فیلد | توضیح |
|------|-------|
| `price` | BigInt - قیمت (تومان) |
| `date` | DateTime - تاریخ ثبت |
| `source` | `bama`, `divar`, `manual` |

Index: `(carId, date)`

#### 8. `User` - کاربر

| فیلد | توضیح |
|------|-------|
| `sessionId` | Unique - شناسه cookie-based |
| `budget` | BigInt? - بودجه کاربر (تومان) |

#### 9. `UserInteraction` - تعامل کاربر (N:1 با User و Car)

| فیلد | توضیح |
|------|-------|
| `action` | `like`, `skip`, `compare`, `detail_view`, `favorite` |
| `round` | شماره دور پیشنهاد |

Index: `(userId, action)`

#### 10. `UserTasteProfile` - پروفایل سلیقه (1:1 با User)

**12 بعد سلیقه (Float):** محاسبه شده از تعاملات کاربر
- comfort, performance, economy, safety, prestige, reliability
- resaleValue, familyFriendly, sportiness, offroad, cityDriving, longTrip

**10 تیپ خریدار (Float):** محاسبه شده از وزن‌دهی ابعاد
- typeEconomic, typeFamily, typeSport, typePrestige, typeSafe
- typeSpecial, typeOffroad, typeCity, typeTravel, typeInvestment

#### 11. `CrawlerConfig` - تنظیمات اسکرپر

| فیلد | توضیح |
|------|-------|
| `name` | نام (مثلا "bama_prices") |
| `url` | آدرس هدف |
| `type` | `price`, `review`, `listing` |
| `schedule` | cron expression (اختیاری) |
| `isActive` | فعال/غیرفعال |
| `lastRunAt` | آخرین اجرا |

#### 12. `AuditLog` - لاگ عملیات

| فیلد | توضیح |
|------|-------|
| `action` | `create`, `update`, `delete`, `import`, `ai_generate` |
| `entity` | `car`, `review`, `crawler`, `price`, `settings` |
| `entityId` | شناسه رکورد مرتبط |
| `details` | JSON string با جزئیات تغییر |
| `adminId` | شناسه ادمین |

Index: `(entity, createdAt)`

#### 13. `AdminUser` - کاربران ادمین

| فیلد | توضیح |
|------|-------|
| `username` | Unique - نام کاربری |
| `password` | هش شده |
| `name` | نام نمایشی |
| `role` | `super_admin`, `editor`, `viewer` |
| `isActive` | فعال/غیرفعال |
| `lastLogin` | آخرین ورود |

#### 14. `Notification` - اعلان‌ها

| فیلد | توضیح |
|------|-------|
| `type` | `price_change`, `new_review`, `system` |
| `title` | عنوان |
| `message` | متن |
| `entityId` | شناسه مرتبط |
| `isRead` | خوانده شده/نشده |

Index: `(isRead, createdAt)`

---

## Seed Data

### ترتیب اجرا (مهم!)

```bash
# 1. ابتدا 50 خودرو اصلی با scores + specs + tags
npm run db:seed

# 2. سپس ~150 نظر برای خودروها
node --import jiti/register prisma/seed-reviews.mjs

# 3. سپس اطلاعات هوشمند (intel) برای خودروها
npm run db:seed-intel
```

### خودروهای موجود (50 عدد)

| مبدا | تعداد | نمونه‌ها |
|------|-------|---------|
| ایرانی | ~12 | تارا، دنا پلاس، شاهین، پژو 207، کوییک |
| چینی | ~15 | چری تیگو 7، ام‌وی‌ام X55، جک S5، فیدلیتی |
| کره‌ای | ~8 | هیوندای اکسنت، کیا سراتو، توسان |
| ژاپنی | ~8 | هوندا سیویک، تویوتا کرولا، مزدا 3 |
| اروپایی | ~7 | رنو تلیسمان، پژو 508، BMW 320i |

---

## Migration History

| Migration | تاریخ | تغییرات |
|-----------|-------|---------|
| `init` | 2026-04-02 | جداول Car, CarScores, CarSpecs, CarTag, CarReview, PriceHistory, User, UserInteraction, UserTasteProfile, CrawlerConfig |
| `add_car_intelligence_and_user_types` | 2026-04-02 | جدول CarIntelligence + 10 فیلد typeX در UserTasteProfile |
| `add_audit_log` | 2026-04-04 | جدول AuditLog |
| `add_admin_users_notifications` | 2026-04-04 | جداول AdminUser + Notification + فیلد adminId در AuditLog |

---

## دستورات مفید

```bash
# === Prisma ===
npx prisma migrate dev                    # اعمال migration‌ها
npx prisma migrate dev --name نام          # ساخت migration جدید
npx prisma generate                        # بازسازی Prisma Client
npx prisma studio                          # رابط گرافیکی (http://localhost:5555)
npx prisma db push                         # اعمال مستقیم بدون migration
npx prisma migrate reset                   # ریست کامل DB + seed

# === Seed ===
npm run db:seed                            # خودروها
node --import jiti/register prisma/seed-reviews.mjs    # نظرات
npm run db:seed-intel                      # هوش خودرو

# === Docker ===
docker compose up -d                       # اجرا
docker compose down                        # توقف
docker compose down -v                     # حذف کامل داده‌ها
docker exec -it mashinchi-db psql -U mashinchi -d mashinchi2  # Shell

# === توسعه ===
npm run dev                                # اجرای dev server
npm run build                              # بیلد production
npm run lint                               # بررسی lint
```

---

## عیب‌یابی

### خطای اتصال به دیتابیس

```
Error: Can't reach database server at `localhost:5434`
```

**راه‌حل:**
```bash
# بررسی اجرای Docker
docker ps | grep mashinchi-db

# اگر اجرا نیست:
docker compose up -d

# بررسی پورت
lsof -i :5434
```

### خطای Migration

```
Error: P3009 migrate found failed migrations
```

**راه‌حل:**
```bash
# ریست کامل (داده‌ها حذف می‌شود!)
npx prisma migrate reset

# یا حل دستی
docker exec -it mashinchi-db psql -U mashinchi -d mashinchi2
> DELETE FROM _prisma_migrations WHERE finished_at IS NULL;
```

### خطای Prisma Client

```
Error: @prisma/client did not initialize
```

**راه‌حل:**
```bash
npx prisma generate
```

### خطای BigInt در JSON

قیمت‌ها `BigInt` هستند و JSON.stringify مستقیما ساپورت نمیکنه. در API ها به `string` تبدیل شدن:
```typescript
priceMin: car.priceMin.toString()
```

### تغییر پورت Docker

اگر پورت 5434 مشغول است:
1. در `docker-compose.yml` پورت را تغییر دهید (مثلا `5435:5432`)
2. در `.env` آپدیت کنید: `...@localhost:5435/mashinchi2`
3. `docker compose down && docker compose up -d`

### Fresh Start (از صفر)

```bash
docker compose down -v                    # حذف کامل داده‌ها
docker compose up -d                      # اجرای مجدد
npx prisma migrate dev                    # اعمال migration‌ها
npm run db:seed                           # seed خودروها
node --import jiti/register prisma/seed-reviews.mjs
npm run db:seed-intel
```

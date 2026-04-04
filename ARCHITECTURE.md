# ماشینچی - مستندات معماری و الگوریتم

> آخرین بروزرسانی: ۲۰۲۶-۰۴-۰۴

## فهرست
- [معرفی پروژه](#معرفی-پروژه)
- [استک فنی](#استک-فنی)
- [ساختار پروژه](#ساختار-پروژه)
- [معماری سیستم](#معماری-سیستم)
- [فلوی کاربر](#فلوی-کاربر)
- [API Endpoints](#api-endpoints)
- [الگوریتم پیشنهاد](#الگوریتم-پیشنهاد)
- [سیستم تیپ خریدار](#سیستم-تیپ-خریدار)
- [فرمول بروزرسانی سلیقه](#فرمول-بروزرسانی-سلیقه)
- [تولید محتوای AI](#تولید-محتوای-ai)
- [سیستم مقایسه](#سیستم-مقایسه)
- [سیستم فیوریت](#سیستم-فیوریت)
- [پنل ادمین](#پنل-ادمین)
- [احراز هویت](#احراز-هویت)
- [کامپوننت‌ها](#کامپوننتها)
- [صفحات](#صفحات)

---

## معرفی پروژه

**ماشینچی** یک دستیار هوشمند خرید خودرو برای بازار ایران است. PWA موبایل‌محور با ۵۰ خودرو، سیستم سلیقه‌سنجی Tinder-like، و پیشنهادات شخصی‌سازی‌شده با AI.

**هدف:** کاربر بودجه وارد میکنه → ماشین‌ها رو swipe میکنه (لایک/اسکیپ) → سیستم سلیقه‌اش رو یاد میگیره → بهترین پیشنهادها رو با دلیل و ریسک نشون میده.

---

## استک فنی

| لایه | تکنولوژی | نسخه |
|------|----------|------|
| فریمورک | Next.js (App Router) | 16.2.2 |
| UI | React + Tailwind CSS | 19.2.4 / 4 |
| زبان | TypeScript | 6.0.2 |
| ORM | Prisma + PrismaPg adapter | 7.6.0 |
| دیتابیس | PostgreSQL (Docker) | 16-alpine |
| AI | Anthropic Claude (Sonnet 4) | SDK 0.82.0 |
| فونت | Vazirmatn (فارسی) | CDN |
| تم | Light/Dark/System | localStorage |

---

## ساختار پروژه

```
mashinchi2/
├── prisma/
│   ├── schema.prisma              # اسکیمای دیتابیس (14 جدول)
│   ├── seed.mjs                   # Seed: 50 خودرو + scores + specs + tags
│   ├── seed-reviews.mjs           # Seed: ~150 نظر
│   ├── seed-intelligence.mjs      # Seed: intel data
│   └── migrations/                # 4 migration
│
├── src/
│   ├── app/
│   │   ├── page.tsx               # صفحه اصلی (بودجه)
│   │   ├── explore/page.tsx       # سلیقه‌سنجی (swipe)
│   │   ├── results/page.tsx       # نتایج پیشنهادی
│   │   ├── catalog/page.tsx       # کاتالوگ خودرو
│   │   ├── profile/page.tsx       # پروفایل کاربر
│   │   ├── compare/page.tsx       # مقایسه خودرو
│   │   ├── admin/                 # پنل ادمین (12 صفحه)
│   │   └── api/                   # API routes (~30 endpoint)
│   │
│   ├── components/
│   │   ├── BottomSheet.tsx        # باتم شیت (swipe-to-close)
│   │   ├── BottomNav.tsx          # ناوبری پایین (3 تب)
│   │   └── ThemeProvider.tsx      # تم تاریک/روشن
│   │
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── ai.ts                  # تولید خلاصه AI
│   │   ├── utils.ts               # فرمت قیمت، تبدیل اعداد فارسی
│   │   ├── useCompare.ts          # هوک مقایسه (sessionStorage)
│   │   ├── adminAuth.ts           # احراز هویت ادمین
│   │   └── auditLog.ts            # لاگ عملیات
│   │
│   └── generated/prisma/          # Auto-generated Prisma client
│
├── docker-compose.yml             # PostgreSQL 16
├── DATABASE.md                    # مستندات دیتابیس
├── ARCHITECTURE.md                # ← این فایل
└── .env.example                   # الگوی متغیرهای محیطی
```

---

## معماری سیستم

```
┌─────────────────────────────────────────────────┐
│                    کاربر (PWA)                     │
│  صفحه اصلی → اکسپلور → نتایج → کاتالوگ → پروفایل  │
└──────────┬──────────────────────────┬────────────┘
           │                          │
    ┌──────▼──────┐            ┌──────▼──────┐
    │  API Routes  │            │ Admin Panel │
    │  /api/*      │            │ /admin/*    │
    └──────┬──────┘            └──────┬──────┘
           │                          │
    ┌──────▼──────────────────────────▼──────┐
    │            Prisma ORM + PrismaPg        │
    └──────────────────┬─────────────────────┘
                       │
              ┌────────▼────────┐
              │  PostgreSQL 16   │
              │  (Docker:5434)   │
              └─────────────────┘
                       │
              ┌────────▼────────┐
              │   Claude AI API  │
              │  (خلاصه + intel)  │
              └─────────────────┘
```

---

## فلوی کاربر

```
 [بودجه] ──→ [اکسپلور: swipe 6+ ماشین] ──→ [نتایج: 5 پیشنهاد + AI]
    │              │                              │
    │         لایک/اسکیپ                    مقایسه/فیوریت
    │              │                              │
    │     بروزرسانی سلیقه                    باتم شیت جزئیات
    │              │
    └──→ [کاتالوگ: مرور 50 خودرو] ──→ [پروفایل: فیوریت‌ها + تنظیمات]
```

### جزئیات هر مرحله:
1. **بودجه** (`/`) - اسلایدر ۵۰۰M-۷B تومان → `POST /api/budget`
2. **اکسپلور** (`/explore`) - ۶ ماشین در هر راند → `POST /api/interact` (like/skip)
3. **نتایج** (`/results`) - `GET /api/recommend` + `GET /api/summary` (AI)
4. **کاتالوگ** (`/catalog`) - `GET /api/cars` با فیلتر مبدا/دسته/جستجو
5. **پروفایل** (`/profile`) - `GET /api/profile` + `GET /api/favorites`
6. **مقایسه** (`/compare`) - `GET /api/cars/[id]` × ۲

---

## API Endpoints

### کاربر

| Method | Path | هدف | ورودی | خروجی |
|--------|------|-----|-------|-------|
| POST | `/api/budget` | ذخیره بودجه | `{ budget: string }` | `{ userId }` + cookie |
| GET | `/api/cars` | لیست خودروها | `?budgetMin&budgetMax&exclude` | `Car[]` |
| GET | `/api/cars/[id]` | جزئیات خودرو | - | `Car + similarCars + alternatives` |
| POST | `/api/interact` | ثبت تعامل | `{ carId, action, round }` | `{ success }` |
| GET | `/api/recommend` | پیشنهادات | - | `{ recommendations[], userTypes[], alternatives[] }` |
| GET | `/api/summary` | خلاصه AI | - | `{ summary, recommendations[] }` |
| GET | `/api/favorites` | لیست فیوریت‌ها | - | `FavoriteCar[]` |
| POST | `/api/favorites` | تاگل فیوریت | `{ carId }` | `{ favorited: boolean }` |
| GET | `/api/profile` | پروفایل کاربر | - | `{ hasProfile, budget, userTypes[], stats }` |

### ادمین (Bearer token الزامی)

| Method | Path | هدف |
|--------|------|-----|
| GET | `/api/admin/stats` | آمار داشبورد |
| GET/POST | `/api/admin/cars` | لیست/ایجاد خودرو |
| PUT/DELETE | `/api/admin/cars/[id]` | ویرایش/حذف خودرو |
| GET/POST | `/api/admin/reviews` | نظرات |
| PUT/DELETE | `/api/admin/reviews/[id]` | ویرایش/حذف نظر |
| GET | `/api/admin/users` | لیست کاربران |
| GET/POST | `/api/admin/crawlers` | کرالرها |
| PUT/DELETE | `/api/admin/crawlers/[id]` | ویرایش/حذف کرالر |
| GET/POST | `/api/admin/prices` | تاریخچه قیمت |
| POST | `/api/admin/import` | واردات JSON |
| POST | `/api/admin/upload` | آپلود تصویر |
| POST | `/api/admin/ai-generate` | تولید محتوا با AI |
| GET | `/api/admin/analytics` | تحلیل فانل |
| GET | `/api/admin/audit` | لاگ عملیات |
| GET/PUT | `/api/admin/notifications` | اعلان‌ها |
| GET/POST | `/api/admin/admin-users` | مدیریت تیم |
| GET | `/api/admin/export` | خروجی CSV |

---

## الگوریتم پیشنهاد

**فایل:** `src/app/api/recommend/route.ts`

### مرحله ۱: فیلتر بودجه
```
priceMin <= budget × 1.2  AND  priceMax >= budget × 0.8
```

### مرحله ۲: امتیاز تطبیق (Match Score)

برای هر خودرو، ۱۲ بعد سلیقه بررسی می‌شود:

```
matchScore = Σ (userPref[dim] × carScore[dim] / 10)
    for dim in [comfort, performance, economy, safety, prestige,
                reliability, resaleValue, familyFriendly, sportiness,
                offroad, cityDriving, longTrip]
```

### مرحله ۳: بونوس‌ها و جریمه‌ها

```
اگر نظرات دارد:
  matchScore += (avgRating - 3) × 2         # بونوس نظرات مثبت
  matchScore -= totalWarnings × 0.3          # جریمه هشدارها

اگر قبلا لایک شده:
  matchScore += 3                            # بوست لایک

اگر قبلا دیده شده (بدون لایک):
  matchScore -= 5                            # جریمه تکرار
```

### مرحله ۴: تولید دلایل تطبیق (Match Reasons)

بر اساس ۳ تیپ غالب کاربر و نقاط قوت خودرو:

| تیپ کاربر | شرط امتیاز خودرو | دلیل |
|-----------|-------------------|------|
| خانوادگی | familyFriendly >= 7 یا safety >= 7 | "مناسب خانواده با ایمنی بالا" |
| اقتصادی | economy >= 7 یا resaleValue >= 7 | "اقتصادی و نقدشونده" |
| اسپرت | sportiness >= 7 یا performance >= 7 | "اسپرت و پرقدرت" |
| پرستیژ | prestige >= 7 | "کلاس و پرستیژ بالا" |
| کم‌ریسک | reliability >= 7 | "مطمئن و کم‌ریسک" |
| شهری | cityDriving >= 7 | "عالی برای شهر" |
| سفرمحور | longTrip >= 7 | "ایده‌آل برای سفر" |
| سرمایه‌ای | resaleValue >= 8 | "ارزش سرمایه‌گذاری بالا" |

### مرحله ۵: تولید ریسک‌ها

```
اگر maintenanceRisk >= 7  → "ریسک نگهداری بالا"
اگر purchaseRisk >= 7     → "ریسک خرید بالا"
اگر repairCost >= 7       → "هزینه تعمیر بالا"
اگر priceDropRate >= 7    → "افت قیمت سریع"
اگر secondHandMarket <= 3 → "بازار دست‌دوم ضعیف"
+ اولین purchaseWarning از intel
```

### مرحله ۶: خروجی

- **Top 5:** بالاترین matchScore (از خودروهای فیلتر نشده)
- **3 جایگزین:** بالاترین score با مبدا متفاوت از top 5
- **تیپ‌های غالب:** ۳ تیپ با بالاترین score از پروفایل سلیقه

---

## سیستم تیپ خریدار

**فایل:** `src/app/api/interact/route.ts`

### ۱۰ تیپ خریدار و وزن‌های آن‌ها

هر تیپ ترکیب وزنی از ابعاد سلیقه‌ست. اعداد مثبت = ارتباط مستقیم، منفی = معکوس.

```
typeEconomic (اقتصادی):
  economy: +0.4, resaleValue: +0.3, maintenanceRisk: -0.2, cityDriving: +0.1

typeFamily (خانوادگی):
  familyFriendly: +0.4, safety: +0.3, comfort: +0.2, longTrip: +0.1

typeSport (اسپرت):
  sportiness: +0.4, performance: +0.3, prestige: +0.15, comfort: +0.05, economy: -0.1

typePrestige (پرستیژمحور):
  prestige: +0.4, comfort: +0.25, safety: +0.15, reliability: +0.1, economy: -0.1

typeSafe (کم‌ریسک):
  safety: +0.3, reliability: +0.3, maintenanceRisk: -0.2, resaleValue: +0.1, afterSales: +0.1

typeSpecial (خاص‌پسند):
  sportiness: +0.2, prestige: +0.3, performance: +0.2, economy: -0.15, familyFriendly: -0.15

typeOffroad (آفرودی):
  offroad: +0.4, longTrip: +0.2, performance: +0.2, sportiness: +0.1, cityDriving: -0.1

typeCity (شهری):
  cityDriving: +0.4, economy: +0.25, comfort: +0.15, familyFriendly: +0.1, offroad: -0.1

typeTravel (سفرمحور):
  longTrip: +0.35, comfort: +0.25, reliability: +0.15, safety: +0.15, cityDriving: -0.1

typeInvestment (سرمایه‌ای):
  resaleValue: +0.4, reliability: +0.2, maintenanceRisk: -0.2, prestige: +0.1, economy: +0.1
```

---

## فرمول بروزرسانی سلیقه

**فایل:** `src/app/api/interact/route.ts` → `updateTasteProfile()`

### هنگام هر تعامل (like/skip):

```
weight = action === "like" ? +1.0 : action === "skip" ? -0.3 : 0
```

### بروزرسانی ابعاد سلیقه (۱۲ بعد):

```
for each dim in [comfort, performance, ...]:
    profile[dim] = profile[dim] + weight × (carScores[dim] / 10)
```

**مثال:** کاربر ماشینی با comfort=8 را لایک میکند:
```
profile.comfort = 0 + 1.0 × (8/10) = 0.8
```

### بروزرسانی تیپ خریدار (۱۰ تیپ):

```
for each userType in [typeEconomic, typeFamily, ...]:
    typeSignal = Σ (carScore[dim] / 10 × typeWeight[dim])
    profile[userType] = profile[userType] + weight × typeSignal
```

**مثال:** لایک ماشینی با economy=9, resaleValue=7 → typeEconomic:
```
typeSignal = (9/10 × 0.4) + (7/10 × 0.3) = 0.36 + 0.21 = 0.57
typeEconomic = 0 + 1.0 × 0.57 = 0.57
```

---

## تولید محتوای AI

**فایل:** `src/lib/ai.ts`

### خلاصه پیشنهادی (Summary)

```typescript
generateRecommendationSummary(cars[], tasteProfile, budget)
```

- **مدل:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- **حداکثر توکن:** 1500
- **ورودی:** ۵ خودرو پیشنهادی + ۴ ویژگی برتر سلیقه + بودجه
- **خروجی:** متن فارسی، بدون ایموجی، لحن دوستانه

### تولید Intel (ادمین)

**فایل:** `src/app/api/admin/ai-generate/route.ts`

۳ نوع تولید:
1. **intel** → JSON با frequentPros, frequentCons, commonIssues, purchaseWarnings, ownerVerdict, overallSummary, whyBuy, whyNotBuy
2. **review** → JSON با summary, pros, cons, warnings, rating
3. **description** → متن ساده فارسی

---

## سیستم مقایسه

**فایل:** `src/lib/useCompare.ts`

### مکانیزم:
- حداکثر ۲ خودرو
- ذخیره در `sessionStorage` (کلید: `mashinchi-compare`)
- دسترسی از کاتالوگ و پروفایل

### صفحه مقایسه (`/compare`):
- Query params: `?a={carId1}&b={carId2}`
- محاسبه **برنده** هر معیار (۱۰ معیار از CarScores)
- **امتیاز کلی:** میانگین امتیازات (maintenanceRisk معکوس)
- مقایسه: مشخصات فنی، قیمت، قوت/ضعف، چرا بخری/نخری
- **جمع‌بندی:** کدام ماشین در چند معیار برتر است + اختلاف قیمت

---

## سیستم فیوریت

### ذخیره:
- از `UserInteraction` با `action: "favorite"` استفاده می‌شود
- `POST /api/favorites` → toggle (اگر وجود داره حذف، نداره ایجاد)

### نمایش:
- پروفایل: آکاردیون با پیش‌نمایش ۴ تایی + لیست کامل
- کاتالوگ: آیکون قلب روی هر کارت
- حذف: confirm modal + toast notification

---

## پنل ادمین

**مسیر:** `/admin` | **فایل Layout:** `src/app/admin/layout.tsx`

### صفحات:

| صفحه | مسیر | هدف |
|------|------|-----|
| داشبورد | `/admin` | آمار کلی + محبوب‌ترین‌ها + توزیع تیپ‌ها (auto-refresh 60s) |
| خودروها | `/admin/cars` | جدول + جستجو + فیلتر + badge وضعیت داده |
| ویرایش خودرو | `/admin/cars/[id]` | ۴ تب: پایه/امتیازات/مشخصات/intel + آپلود تصویر |
| نظرات | `/admin/reviews` | CRUD + فیلتر منبع/خودرو |
| کرالر | `/admin/crawlers` | CRUD + فعال/غیرفعال + شبیه‌سازی اجرا |
| قیمت‌ها | `/admin/prices` | ثبت + نمودار بار + تشخیص تغییر قیمت |
| کاربران | `/admin/users` | جدول + آمار + تیپ خریدار |
| تولید AI | `/admin/ai` | تولید intel/review/description با Claude |
| پارامترها | `/admin/scoring` | اسلایدر الگوریتم + وزن تیپ‌ها + import/export JSON |
| تحلیل | `/admin/analytics` | فانل + فعالیت روزانه + توزیع بودجه/مبدا/دسته |
| واردات | `/admin/import` | JSON upload + preview + skip/update mode |
| لاگ | `/admin/audit` | لاگ عملیات با فیلتر entity + جزئیات expandable |
| تیم | `/admin/team` | مدیریت کاربران ادمین (super_admin فقط) |

### RBAC:

| نقش | دسترسی |
|-----|--------|
| `super_admin` | همه + مدیریت تیم + حذف |
| `editor` | CRUD خودرو/نظر/قیمت + AI + واردات |
| `viewer` | فقط مشاهده |

---

## احراز هویت

### کاربر عادی:
- Cookie-based session (`mashinchi_session`)
- HttpOnly, Secure (production), SameSite=lax
- مدت: ۱ سال
- ایجاد خودکار هنگام اولین تعامل

### ادمین:
- Bearer token در header: `Authorization: Bearer {token}`
- دو حالت:
  1. **رمز محیطی:** مقدار `ADMIN_PASSWORD` مستقیم
  2. **کاربر DB:** فرمت `username:password` → hash مقایسه با AdminUser

---

## کامپوننت‌ها

### BottomSheet (`src/components/BottomSheet.tsx`)
- Modal drawer از پایین صفحه
- Swipe-to-close با threshold 100px
- Backdrop تیره + انیمیشن slideUp/slideDown
- حداکثر ارتفاع: 85vh

### BottomNav (`src/components/BottomNav.tsx`)
- ۳ تب: خانه / کاتالوگ / پروفایل
- مخفی در: `/explore`, `/results`, `/compare`, `/admin`
- Active state با رنگ primary

### ThemeProvider (`src/components/ThemeProvider.tsx`)
- ۳ حالت: light / dark / system
- ذخیره در `localStorage` (کلید: `mashinchi-theme`)
- کلاس `dark` روی `<html>` برای Tailwind
- Flash prevention با inline script در layout

---

## صفحات

### صفحه اصلی (`/`)
- اسلایدر بودجه: ۵۰۰M - ۷B تومان (step: 100M)
- ۶ نشانه بودجه (کلیکی)
- تنظیمات dropdown: تم + ریست سلیقه
- فرآیند ۳ مرحله‌ای: بودجه → انتخاب → پیشنهاد

### اکسپلور (`/explore`)
- ۶ ماشین در هر راند (shuffle)
- Progress bar بخش‌بندی‌شده
- کارت: گرادیانت مبدا + badge دسته/مبدا + اسپک‌ها + traits
- دکمه‌ها: اسکیپ (چپ) + لایک (راست، بزرگ‌تر)
- باتم شیت: آمار سریع + قوت/ضعف + امتیازات + هشدارها + نظرات

### نتایج (`/results`)
- Top 5 + ۳ جایگزین
- هر کارت: دلایل تطبیق + ریسک‌ها + تیپ‌های کاربر
- خلاصه AI (async، skeleton loading)
- باتم شیت جزئیات کامل

### کاتالوگ (`/catalog`)
- فیلتر تک‌خطی: مبدا + دسته + مرتب‌سازی (pill-style)
- جستجو بر اساس نام/برند
- کارت‌ها: امتیاز رضایت + badge مبدا رنگی + traits + فیوریت
- ۵۰ خودرو با اسکرول

### پروفایل (`/profile`)
- هدر: آواتار + تیپ اصلی + آمار (بررسی/پسند/نشان)
- فیوریت‌ها: آکاردیون با preview افقی + لیست + حذف با confirm
- مقایسه: انتخاب ۲ ماشین از فیوریت‌ها
- تنظیمات: تم + ریست

### مقایسه (`/compare`)
- ۲ کارت: امتیاز کلی + badge "برتر"
- آمار سریع: رضایت + امنیت + ارزان‌تر
- بارهای امتیاز دوطرفه (۱۰ معیار)
- جدول مشخصات با highlight برنده
- بخری/نخری ادغام‌شده + قوت/ضعف فشرده
- جمع‌بندی با آیکون جام

---

## نحوه بروزرسانی این سند

هر بار که قابلیت جدیدی اضافه می‌شود:
1. endpoint جدید را به جدول API اضافه کنید
2. اگر الگوریتم تغییر کرد، فرمول‌ها را بروزرسانی کنید
3. صفحه/کامپوننت جدید را به بخش مربوطه اضافه کنید
4. تاریخ بروزرسانی بالای سند را عوض کنید

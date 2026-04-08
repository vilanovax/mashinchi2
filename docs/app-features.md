# App Features — Mashinchi

> Smart car purchase decision assistant for Iranian market
> Last updated: 2026-04-08

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (Docker local) via Prisma ORM
- **AI:** Claude (Anthropic) + OpenAI
- **Crawling:** Cheerio + Puppeteer-core
- **Font:** Vazirmatn (Persian)
- **Direction:** RTL throughout

---

## User-Facing App

### Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Budget slider (500M-7B Toman), starts the discovery flow |
| Catalog | `/catalog` | All cars with search, origin/category filters, sorting, compare mode |
| Explore | `/explore` | Swipeable cards — like/skip to learn user taste |
| Results | `/results` | AI-generated recommendations based on taste profile |
| Compare | `/compare` | Side-by-side car comparison |
| Car Detail | `/car/[id]` | Full car info: specs, scores, reviews, intelligence, similar cars |
| Market | `/market` | Market prices, trends, listings analysis, AI insights |
| Profile | `/profile` | User taste profile, interaction history |

### Bottom Navigation

4 tabs: **خانه** → **کاتالوگ** → **بازار** → **پروفایل**

Hidden on: `/explore`, `/results`, `/compare`, `/admin`, `/car/`

### Market Page (4 tabs)

1. **جدول قیمت** — All cars with price, weekly/monthly change, origin filter, sort by name/price/change
2. **روند قیمت** — SVG line chart comparing up to 5 cars over week/month/quarter/year
3. **آگهی‌ها** — Listing count rankings with bar chart, AI analysis of listing trends
4. **تحلیل** — Quick stats (cheapest/expensive), AI market insights, top risers/fallers

### Core UX Concept

App discovers user taste from behavior (like/skip), NOT direct questions. Only asks budget explicitly. Spotify-style onboarding.

---

## Admin Panel

### Access

- URL: `/admin`
- Auth: Bearer token (env password or username:password)
- Roles: `super_admin`, `editor`, `viewer`

### Sidebar Groups

#### Main
| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin` | Stats overview, user type breakdown |
| Data Health | `/admin/data-health` | Completeness score per car (0-100%), missing data indicators |

#### Data Management (مدیریت داده)
| Page | Route | Description |
|------|-------|-------------|
| Cars | `/admin/cars` | CRUD, list all cars, edit individual car |
| Prices | `/admin/prices` | Price history entry per car, bar chart |
| Reviews | `/admin/reviews` | Review management |
| Parameters | `/admin/scoring` | Car score/parameter tuning |
| Add Car | `/admin/import` | 3 tabs: Single form, JSON/paste, File upload |

#### Collection & Processing (جمع‌آوری و پردازش)
| Page | Route | Description |
|------|-------|-------------|
| Raw Analysis | `/admin/raw-analysis` | Import AI-extracted JSON, process → scores |
| Sources | `/admin/sources` | Source content with AI processing, diff, smart merge |
| Bama Prices | `/admin/bama-prices` | Fetch/paste bama.ir prices, auto-match cars |
| Crawlers | `/admin/crawlers` | Web crawler config (bama, divar, etc.) |
| Enrichment | `/admin/enrich` | Data enrichment with progress tracking |
| AI Generation | `/admin/ai` | AI content generation interface |

#### Market & Analysis (بازار و تحلیل)
| Page | Route | Description |
|------|-------|-------------|
| Market | `/admin/market` | Listing stats entry, market insight creation |
| Analytics | `/admin/analytics` | Charts and statistics |
| Users | `/admin/users` | User analytics, taste profiles |

#### System (سیستم)
| Page | Route | Description |
|------|-------|-------------|
| Activity Log | `/admin/audit` | All admin actions with entity tracking |
| Team | `/admin/team` | Admin user management (super_admin only) |
| Settings | `/admin/settings` | AI provider config (Claude/OpenAI), API keys |

---

## Key Features Detail

### Add Car (`/admin/import`)

**3 input methods:**
1. **Single** — Form with live duplicate detection (exact/similar/new indicators), price shown in Persian
2. **JSON/Paste** — Supports array, single object, or `{ cars: [...] }`. Preview with match status per item. Inline editing.
3. **File** — JSON file upload, redirects to JSON tab for preview

**Smart enrichment:** When pasting just car names (string array), auto-detects brand, origin, category from 50+ rules.

**Duplicate detection:**
- Green = new (not in DB)
- Red = exact match (same nameEn or nameFa)
- Orange = similar (partial name match)

### Bama Prices (`/admin/bama-prices`)

**2 methods:**
1. **API fetch** — Direct call to `bama.ir/api/v1/car/price` (usually blocked)
2. **Copy-paste** — Multi-line parser for bama's price table format

**Parse format:**
```
برند ,
مدل ,
تریم
سال
تاریخ
نوع قیمت (بازار/نمایندگی)
درصد تغییر
قیمت عددی
تومان
```

**After parse:** Auto-match with DB cars (score 0-100), filters (all/matched/high/low/unmatched), apply to PriceHistory.

### Raw Analysis (`/admin/raw-analysis`)

**Flow:** AI extracts JSON → import → store raw → process → generate CarScores + CarIntelligence

**Processing logic:**
- `feature_statistics` → numeric scores based on positive/negative ratio
- `extracted_statements` → weight by importance + sentiment
- Generates both CarScores (14 fields) and CarIntelligence (15 scores + text fields)

### Data Health (`/admin/data-health`)

**Per-car health score (0-100%)** based on weighted sections:

| Section | Weight | Description |
|---------|--------|-------------|
| Intelligence | 25% | AI analysis data |
| Scores | 15% | 14-dimension scoring |
| Raw Analysis | 10% | AI-extracted data |
| Specs | 10% | Technical specs |
| Reviews | 10% | User/expert reviews |
| Prices | 10% | Price history |
| Tags | 5% | Categorization tags |
| Sources | 5% | Raw content sources |
| Image | 5% | Car image |
| Description | 5% | Persian description |

**Quick filters:** "بدون امتیاز", "بدون تحلیل", "بدون قیمت", etc.

### Market Management (`/admin/market`)

**2 tabs:**
1. **Listing Stats** — Enter daily listing counts per car/source, bulk JSON import
2. **Market Insights** — Create AI analysis reports with highlights, risers/fallers

---

## Data Flow

```
AI Prompt → ChatGPT/Claude → JSON
                                ↓
                    /admin/import (cars) ←→ duplicate check
                    /admin/raw-analysis (analysis) → process → scores
                                ↓
                          Database
                                ↓
              /admin/bama-prices → PriceHistory
              /admin/crawlers → CarSource → AI process
              /admin/enrich → CarIntelligence
                                ↓
                    User App (catalog, explore, market)
```

---

## API Structure

### Public APIs (no auth)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/cars` | List cars (filter by budget, exclude IDs) |
| GET | `/api/cars/[id]` | Car detail with scores, specs, tags, intel, reviews |
| POST | `/api/interact` | Log user interaction |
| POST | `/api/recommend` | Get personalized recommendations |
| POST | `/api/favorites` | Manage favorites |
| GET | `/api/profile` | User taste profile |
| POST | `/api/budget` | Set budget |
| GET | `/api/summary` | Car summary |
| GET | `/api/market` | Market data (prices, trends, listings, insights) |

### Admin APIs (Bearer token auth)

All under `/api/admin/` — see individual page docs for endpoints.

Key patterns:
- `GET` → list/read
- `POST` → create/import/process
- `PUT` → update
- `DELETE` → remove
- Auth via `verifyAdmin()` → returns `AdminSession { id, username, name, role }`

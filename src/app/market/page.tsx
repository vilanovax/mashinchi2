"use client";

import { useState, useEffect, useMemo } from "react";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";

// ── Types ──
interface CarPrice {
  id: string;
  nameFa: string;
  nameEn: string;
  brandFa: string;
  category: string;
  origin: string;
  imageUrl: string | null;
  price: string;
  priceMin: string;
  priceMax: string;
  weekChange: number | null;
  monthChange: number | null;
  lastUpdate: string | null;
}

interface TrendPoint { date: string; price: string }
interface TrendCar {
  carId: string;
  nameFa: string;
  brandFa: string;
  points: TrendPoint[];
}

interface ListingRank {
  carId: string;
  nameFa: string;
  brandFa: string;
  origin: string;
  totalListings: number;
  avgDaily: number;
}

interface Insight {
  id: string;
  date: string;
  period: string;
  title: string;
  summary: string;
  highlights: string[];
  topRisers: string[];
  topFallers: string[];
  hotListings: string[];
  aiAnalysis: string | null;
}

// ── Constants ──
const TABS = [
  { key: "prices", label: "جدول قیمت", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" },
  { key: "trends", label: "روند قیمت", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { key: "listings", label: "آگهی‌ها", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { key: "insights", label: "تحلیل", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
];

const ORIGINS = [
  { key: "all", label: "همه" },
  { key: "iranian", label: "ایرانی" },
  { key: "chinese", label: "چینی" },
  { key: "korean", label: "کره‌ای" },
  { key: "japanese", label: "ژاپنی" },
  { key: "european", label: "اروپایی" },
];

const ORIGIN_COLORS: Record<string, string> = {
  iranian: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  chinese: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  korean: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  japanese: "bg-red-500/10 text-red-600 dark:text-red-400",
  european: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const PERIODS = [
  { key: "week", label: "هفته" },
  { key: "month", label: "ماه" },
  { key: "quarter", label: "فصل" },
  { key: "year", label: "سال" },
];

const TREND_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState("prices");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-surface/95 backdrop-blur-md z-20 border-b border-border">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-2">
          <h1 className="text-lg font-black text-foreground mb-3">بازار خودرو</h1>
          {/* Tab bar */}
          <div className="flex gap-1 bg-background rounded-xl p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-3">
        {activeTab === "prices" && <PriceTable />}
        {activeTab === "trends" && <TrendsView />}
        {activeTab === "listings" && <ListingsView />}
        {activeTab === "insights" && <InsightsView />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 1: Price Table
// ═══════════════════════════════════════════════
function PriceTable() {
  const [cars, setCars] = useState<CarPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("all");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ tab: "prices", sort });
    if (origin !== "all") params.set("origin", origin);
    fetch(`/api/market?${params}`)
      .then((r) => r.json())
      .then((d) => { setCars(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [origin, sort]);

  const sorted = useMemo(() => {
    if (sort === "change") return [...cars].sort((a, b) => (b.weekChange ?? 0) - (a.weekChange ?? 0));
    return cars;
  }, [cars, sort]);

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
        {ORIGINS.map((o) => (
          <button
            key={o.key}
            onClick={() => setOrigin(o.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              origin === o.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-1.5 mb-3">
        {[
          { key: "name", label: "نام" },
          { key: "price", label: "قیمت" },
          { key: "change", label: "تغییرات" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              sort === s.key ? "bg-foreground/10 text-foreground" : "text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-2">
          {sorted.map((car) => (
            <div
              key={car.id}
              className="bg-surface rounded-xl border border-border p-3 flex items-center gap-3"
            >
              {/* Origin indicator */}
              <div className={`w-1 h-12 rounded-full ${
                car.origin === "iranian" ? "bg-blue-500" :
                car.origin === "chinese" ? "bg-rose-500" :
                car.origin === "korean" ? "bg-violet-500" :
                car.origin === "japanese" ? "bg-red-500" : "bg-amber-500"
              }`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground truncate">{car.nameFa}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${ORIGIN_COLORS[car.origin] || ""}`}>
                    {getOriginLabel(car.origin)}
                  </span>
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {car.brandFa} · {getCategoryLabel(car.category)}
                </div>
              </div>

              {/* Price + Change */}
              <div className="text-left flex-shrink-0">
                <div className="text-sm font-black text-foreground">
                  {toPersianDigits(formatPrice(car.priceMin))} ~ {toPersianDigits(formatPrice(car.priceMax))}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {car.weekChange !== null && car.weekChange !== 0 && (
                    <ChangeChip value={car.weekChange} label="هفته" />
                  )}
                  {car.monthChange !== null && car.monthChange !== 0 && (
                    <ChangeChip value={car.monthChange} label="ماه" />
                  )}
                  {(car.weekChange === null || car.weekChange === 0) && (car.monthChange === null || car.monthChange === 0) && car.lastUpdate && (
                    <span className="text-[9px] text-muted">ثابت</span>
                  )}
                  {!car.lastUpdate && (
                    <span className="text-[9px] text-muted/50">تازه ثبت‌شده</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {sorted.length === 0 && (
            <EmptyState text="داده قیمتی ثبت نشده" />
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 2: Trends (Price Chart)
// ═══════════════════════════════════════════════
function TrendsView() {
  const [allCars, setAllCars] = useState<{ id: string; nameFa: string; brandFa: string }[]>([]);
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [period, setPeriod] = useState("month");
  const [trends, setTrends] = useState<TrendCar[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Load car list
  useEffect(() => {
    fetch("/api/market?tab=prices")
      .then((r) => r.json())
      .then((d: CarPrice[]) => setAllCars(d.map((c) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa }))));
  }, []);

  // Load trends when selection changes
  useEffect(() => {
    if (selectedCars.length === 0) { setTrends([]); return; }
    setLoading(true);
    fetch(`/api/market?tab=trends&carIds=${selectedCars.join(",")}&period=${period}`)
      .then((r) => r.json())
      .then((d) => { setTrends(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedCars, period]);

  const toggleCar = (id: string) => {
    setSelectedCars((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  return (
    <div>
      {/* Period selector */}
      <div className="flex gap-1.5 mb-3">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              period === p.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Car selector */}
      <div className="mb-3">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-right flex items-center justify-between"
        >
          <span className={selectedCars.length > 0 ? "text-foreground font-bold" : "text-muted"}>
            {selectedCars.length > 0
              ? `${toPersianDigits(selectedCars.length)} خودرو انتخاب شده`
              : "انتخاب خودرو برای مقایسه"}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={showPicker ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </button>

        {showPicker && (
          <div className="mt-1.5 bg-surface border border-border rounded-xl max-h-48 overflow-y-auto">
            {allCars.map((car) => (
              <button
                key={car.id}
                onClick={() => toggleCar(car.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-right text-sm border-b border-border/50 last:border-0 ${
                  selectedCars.includes(car.id) ? "bg-primary/5" : ""
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  selectedCars.includes(car.id) ? "bg-primary border-primary" : "border-muted"
                }`}>
                  {selectedCars.includes(car.id) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <span className="text-foreground">{car.nameFa}</span>
                <span className="text-[10px] text-muted mr-auto">{car.brandFa}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected chips */}
        {selectedCars.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {selectedCars.map((id, i) => {
              const car = allCars.find((c) => c.id === id);
              return (
                <span
                  key={id}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }}
                >
                  {car?.nameFa}
                  <button onClick={() => toggleCar(id)} className="opacity-70 hover:opacity-100">x</button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <LoadingSpinner />
      ) : trends.length > 0 ? (
        <PriceChart trends={trends} />
      ) : (
        <EmptyState text="خودرو انتخاب کنید تا روند قیمت نمایش داده شود" />
      )}
    </div>
  );
}

// ── Simple SVG Chart ──
function PriceChart({ trends }: { trends: TrendCar[] }) {
  const allPoints = trends.flatMap((t) => t.points.map((p) => Number(p.price)));
  if (allPoints.length === 0) return <EmptyState text="داده‌ای برای این بازه وجود ندارد" />;

  const minP = Math.min(...allPoints);
  const maxP = Math.max(...allPoints);
  const range = maxP - minP || 1;

  const W = 340;
  const H = 200;
  const PAD = 30;

  // All unique dates
  const allDates = [...new Set(trends.flatMap((t) => t.points.map((p) => p.date)))].sort();

  return (
    <div className="bg-surface rounded-xl border border-border p-3">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD + (H - PAD * 2) * (1 - frac);
          const val = minP + range * frac;
          return (
            <g key={frac}>
              <line x1={PAD} y1={y} x2={W - 10} y2={y} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={PAD - 2} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="7" fontFamily="Vazirmatn">
                {formatPrice(val)}
              </text>
            </g>
          );
        })}

        {/* Lines per car */}
        {trends.map((trend, ti) => {
          if (trend.points.length < 2) return null;
          const color = TREND_COLORS[ti % TREND_COLORS.length];
          const points = trend.points.map((p, i) => {
            const x = PAD + ((W - PAD - 10) * i) / (trend.points.length - 1);
            const y = PAD + (H - PAD * 2) * (1 - (Number(p.price) - minP) / range);
            return `${x},${y}`;
          });

          return (
            <g key={trend.carId}>
              <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points.join(" ")} />
              {trend.points.map((p, i) => {
                const x = PAD + ((W - PAD - 10) * i) / (trend.points.length - 1);
                const y = PAD + (H - PAD * 2) * (1 - (Number(p.price) - minP) / range);
                return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
              })}
            </g>
          );
        })}

        {/* Date labels */}
        {allDates.length > 0 && [0, Math.floor(allDates.length / 2), allDates.length - 1].map((idx) => {
          if (!allDates[idx]) return null;
          const x = PAD + ((W - PAD - 10) * idx) / Math.max(allDates.length - 1, 1);
          return (
            <text key={idx} x={x} y={H + 15} textAnchor="middle" fill="var(--muted)" fontSize="7" fontFamily="Vazirmatn">
              {allDates[idx].slice(5)}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-3 mt-2 justify-center flex-wrap">
        {trends.map((t, i) => (
          <div key={t.carId} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }} />
            <span className="text-[10px] font-bold text-foreground">{t.nameFa}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 3: Listings Analysis
// ═══════════════════════════════════════════════
function ListingsView() {
  const [data, setData] = useState<{ rankings: ListingRank[]; dailyTrend: Record<string, { date: string; count: number }[]> } | null>(null);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/market?tab=listings&period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  return (
    <div>
      {/* Period */}
      <div className="flex gap-1.5 mb-3">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              period === p.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data && data.rankings.length > 0 ? (
        <div className="space-y-2">
          {/* Top listings bar chart */}
          <div className="bg-surface rounded-xl border border-border p-3">
            <h3 className="text-xs font-black text-foreground mb-3">بیشترین آگهی‌ها</h3>
            {data.rankings.slice(0, 10).map((car, i) => {
              const maxCount = data.rankings[0]?.totalListings || 1;
              const pct = (car.totalListings / maxCount) * 100;
              return (
                <div key={car.carId} className="mb-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-muted w-4">{toPersianDigits(i + 1)}</span>
                      <span className="text-[11px] font-bold text-foreground">{car.nameFa}</span>
                      <span className={`px-1 py-0.5 rounded-full text-[8px] font-bold ${ORIGIN_COLORS[car.origin] || ""}`}>
                        {getOriginLabel(car.origin)}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-primary">
                      {toPersianDigits(car.totalListings)} آگهی
                    </span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insight card */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-xs font-black text-foreground">تحلیل آگهی‌ها</span>
            </div>
            <p className="text-[11px] text-muted leading-5">
              {data.rankings.length > 0
                ? `بیشترین تعداد آگهی مربوط به ${data.rankings[0].nameFa} (${data.rankings[0].brandFa}) با ${toPersianDigits(data.rankings[0].totalListings)} آگهی است. تعداد بالای آگهی معمولا نشان‌دهنده عرضه زیاد و احتمال کاهش قیمت است.`
                : "داده‌ای برای تحلیل وجود ندارد."}
            </p>
          </div>
        </div>
      ) : (
        <EmptyState text="آمار آگهی ثبت نشده است" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// TAB 4: Insights (AI Analysis)
// ═══════════════════════════════════════════════
function InsightsView() {
  const [data, setData] = useState<{ insights: Insight[]; quickStats: { cheapest: any[]; expensive: any[]; totalCars: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("weekly");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/market?tab=insights&period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  return (
    <div>
      {/* Period */}
      <div className="flex gap-1.5 mb-3">
        {[
          { key: "daily", label: "روزانه" },
          { key: "weekly", label: "هفتگی" },
          { key: "monthly", label: "ماهانه" },
          { key: "quarterly", label: "فصلی" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              period === p.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data ? (
        <div className="space-y-3">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="کل خودروها" value={toPersianDigits(data.quickStats.totalCars)} color="primary" />
            <StatCard
              label="ارزان‌ترین"
              value={data.quickStats.cheapest[0]?.nameFa || "-"}
              sub={data.quickStats.cheapest[0] ? toPersianDigits(formatPrice(data.quickStats.cheapest[0].price)) : ""}
              color="accent"
            />
            <StatCard
              label="گران‌ترین"
              value={data.quickStats.expensive[0]?.nameFa || "-"}
              sub={data.quickStats.expensive[0] ? toPersianDigits(formatPrice(data.quickStats.expensive[0].price)) : ""}
              color="danger"
            />
          </div>

          {/* Insights */}
          {data.insights.length > 0 ? (
            data.insights.map((insight) => (
              <div key={insight.id} className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-foreground">{insight.title}</h3>
                  <span className="text-[9px] text-muted">{insight.date}</span>
                </div>
                <p className="text-[11px] text-muted leading-5 mb-3">{insight.summary}</p>

                {insight.highlights.length > 0 && (
                  <div className="mb-3">
                    {insight.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-[11px] text-foreground">{h}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {insight.topRisers.length > 0 && (
                    <div className="bg-emerald-500/5 rounded-lg p-2">
                      <span className="text-[9px] font-bold text-emerald-600">بیشترین رشد</span>
                      {insight.topRisers.map((r, i) => (
                        <div key={i} className="text-[10px] text-foreground">{r}</div>
                      ))}
                    </div>
                  )}
                  {insight.topFallers.length > 0 && (
                    <div className="bg-red-500/5 rounded-lg p-2">
                      <span className="text-[9px] font-bold text-red-500">بیشترین افت</span>
                      {insight.topFallers.map((f, i) => (
                        <div key={i} className="text-[10px] text-foreground">{f}</div>
                      ))}
                    </div>
                  )}
                </div>

                {insight.aiAnalysis && (
                  <div className="mt-3 bg-primary/5 rounded-lg p-2.5">
                    <span className="text-[9px] font-bold text-primary block mb-1">تحلیل هوشمند</span>
                    <p className="text-[11px] text-foreground leading-5">{insight.aiAnalysis}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyState text="تحلیلی هنوز ثبت نشده. از پنل ادمین تحلیل ایجاد کنید." />
          )}
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════════
function ChangeChip({ value, label }: { value: number; label: string }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${
      isZero ? "bg-muted/10 text-muted" :
      isPositive ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"
    }`}>
      {!isZero && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
          <path d={isPositive ? "M12 4l8 8H4z" : "M12 20l-8-8h16z"} />
        </svg>
      )}
      {toPersianDigits(Math.abs(value))}% {label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-2.5 text-center">
      <div className={`text-[9px] font-bold mb-1 ${
        color === "primary" ? "text-primary" : color === "accent" ? "text-emerald-500" : "text-red-500"
      }`}>
        {label}
      </div>
      <div className="text-[11px] font-black text-foreground truncate">{value}</div>
      {sub && <div className="text-[9px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" className="mx-auto mb-3 opacity-40">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

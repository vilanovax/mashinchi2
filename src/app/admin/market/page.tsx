"use client";

import { useState, useEffect } from "react";
import { formatPrice, toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface CarOption { id: string; nameFa: string; brandFa: string }
interface ListingStat {
  id: string; carId: string; nameFa: string; brandFa: string;
  date: string; count: number; source: string;
  avgPrice: string | null;
}
interface InsightEntry {
  id: string; date: string; period: string; title: string;
  summary: string; highlights: string[]; topRisers: string[];
  topFallers: string[]; hotListings: string[]; aiAnalysis: string | null;
}

export default function AdminMarketPage() {
  const { fetchAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState<"listings" | "insights">("listings");
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  return (
    <div className="p-5">
      <h1 className="text-lg font-black mb-4">مدیریت بازار</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: "listings" as const, label: "آمار آگهی‌ها" },
          { key: "insights" as const, label: "تحلیل‌های بازار" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === t.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "listings" && <ListingsManager fetchAdmin={fetchAdmin} showToast={showToast} />}
      {activeTab === "insights" && <InsightsManager fetchAdmin={fetchAdmin} showToast={showToast} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Listings Manager
// ═══════════════════════════════════════════════
function ListingsManager({ fetchAdmin, showToast }: { fetchAdmin: any; showToast: (m: string) => void }) {
  const [cars, setCars] = useState<CarOption[]>([]);
  const [stats, setStats] = useState<ListingStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedCar, setSelectedCar] = useState("");
  const [count, setCount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState("manual");
  const [avgPrice, setAvgPrice] = useState("");

  // Bulk import
  const [showBulk, setShowBulk] = useState(false);
  const [bulkJson, setBulkJson] = useState("");

  useEffect(() => {
    Promise.all([
      fetchAdmin("/api/admin/cars").then((r: Response) => r.json()),
      fetchAdmin("/api/admin/market?type=listings").then((r: Response) => r.json()),
    ]).then(([carsData, statsData]) => {
      setCars(carsData.map((c: any) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa })));
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    fetchAdmin("/api/admin/market?type=listings").then((r: Response) => r.json()).then(setStats);
  };

  const handleAdd = async () => {
    if (!selectedCar || !count) return;
    await fetchAdmin("/api/admin/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "listing",
        carId: selectedCar,
        count: parseInt(count),
        date,
        source,
        avgPrice: avgPrice || null,
      }),
    });
    setCount("");
    setAvgPrice("");
    reload();
    showToast("آمار ثبت شد");
  };

  const handleBulkImport = async () => {
    try {
      const items = JSON.parse(bulkJson);
      await fetchAdmin("/api/admin/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bulk_listings", items }),
      });
      setBulkJson("");
      setShowBulk(false);
      reload();
      showToast("واردات انجام شد");
    } catch {
      showToast("فرمت JSON نامعتبر");
    }
  };

  const handleDelete = async (id: string) => {
    await fetchAdmin(`/api/admin/market?id=${id}&type=listing`, { method: "DELETE" });
    reload();
    showToast("حذف شد");
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Add form */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-5">
        <h3 className="text-xs font-black mb-3">ثبت آمار آگهی</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[10px] text-muted block mb-1">خودرو</label>
            <select value={selectedCar} onChange={(e) => setSelectedCar(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">انتخاب...</option>
              {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">تعداد آگهی</label>
            <input value={count} onChange={(e) => setCount(e.target.value)} type="number" placeholder="45"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">تاریخ</label>
            <input value={date} onChange={(e) => setDate(e.target.value)} type="date"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">منبع</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
              <option value="manual">دستی</option>
              <option value="bama">باما</option>
              <option value="divar">دیوار</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">میانگین قیمت</label>
            <input value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} type="number" placeholder="اختیاری"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg">ثبت</button>
          <button onClick={() => setShowBulk(!showBulk)} className="px-4 py-2 bg-surface border border-border text-xs font-bold rounded-lg text-muted">
            واردات دسته‌ای
          </button>
        </div>
      </div>

      {/* Bulk import */}
      {showBulk && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-5">
          <h3 className="text-xs font-black mb-2">واردات JSON</h3>
          <p className="text-[10px] text-muted mb-2">
            آرایه‌ای از آبجکت‌ها: {`[{ "carId": "...", "date": "2024-01-01", "count": 45, "source": "bama" }]`}
          </p>
          <textarea value={bulkJson} onChange={(e) => setBulkJson(e.target.value)}
            rows={5} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none resize-none mb-2" />
          <button onClick={handleBulkImport} className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-lg">واردات</button>
        </div>
      )}

      {/* Stats table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-black">آمار ثبت‌شده ({toPersianDigits(stats.length)})</h3>
        </div>
        {stats.length > 0 ? (
          <div className="divide-y divide-border">
            {stats.slice(0, 50).map((s) => (
              <div key={s.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-foreground">{s.nameFa}</span>
                  <span className="text-[10px] text-muted mr-2">{s.brandFa}</span>
                </div>
                <span className="text-xs font-black text-primary">{toPersianDigits(s.count)} آگهی</span>
                {s.avgPrice && (
                  <span className="text-[10px] text-muted">~{formatPrice(s.avgPrice)}</span>
                )}
                <span className="text-[10px] text-muted">{s.date}</span>
                <span className="text-[9px] text-muted px-1.5 py-0.5 bg-background rounded">{s.source}</span>
                <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-500 text-[10px]">حذف</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-8">آماری ثبت نشده</p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Insights Manager
// ═══════════════════════════════════════════════
function InsightsManager({ fetchAdmin, showToast }: { fetchAdmin: any; showToast: (m: string) => void }) {
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [highlights, setHighlights] = useState("");
  const [topRisers, setTopRisers] = useState("");
  const [topFallers, setTopFallers] = useState("");
  const [hotListings, setHotListings] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [period, setPeriod] = useState("weekly");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchAdmin("/api/admin/market?type=insights").then((r: Response) => r.json())
      .then((d: InsightEntry[]) => { setInsights(d); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    fetchAdmin("/api/admin/market?type=insights").then((r: Response) => r.json()).then(setInsights);
  };

  const splitLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

  const handleAdd = async () => {
    if (!title || !summary) return;
    await fetchAdmin("/api/admin/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "insight",
        title, summary, period, date,
        highlights: splitLines(highlights),
        topRisers: splitLines(topRisers),
        topFallers: splitLines(topFallers),
        hotListings: splitLines(hotListings),
        aiAnalysis: aiAnalysis || null,
      }),
    });
    setTitle(""); setSummary(""); setHighlights(""); setTopRisers("");
    setTopFallers(""); setHotListings(""); setAiAnalysis("");
    reload();
    showToast("تحلیل ثبت شد");
  };

  const handleDelete = async (id: string) => {
    await fetchAdmin(`/api/admin/market?id=${id}&type=insight`, { method: "DELETE" });
    reload();
    showToast("حذف شد");
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Add insight form */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-5">
        <h3 className="text-xs font-black mb-3">ثبت تحلیل جدید</h3>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-muted block mb-1">عنوان</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="خلاصه بازار هفتگی"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted block mb-1">دوره</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                <option value="daily">روزانه</option>
                <option value="weekly">هفتگی</option>
                <option value="monthly">ماهانه</option>
                <option value="quarterly">فصلی</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted block mb-1">تاریخ</label>
              <input value={date} onChange={(e) => setDate(e.target.value)} type="date"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="text-[10px] text-muted block mb-1">خلاصه</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="خلاصه وضعیت بازار..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-muted block mb-1">نکات کلیدی (هر خط یکی)</label>
            <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={3} placeholder="نکته ۱&#10;نکته ۲"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none resize-none" />
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">بیشترین رشد (هر خط یکی)</label>
            <textarea value={topRisers} onChange={(e) => setTopRisers(e.target.value)} rows={3} placeholder="تارا +۵%&#10;دنا +۳%"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none resize-none" />
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">بیشترین افت (هر خط یکی)</label>
            <textarea value={topFallers} onChange={(e) => setTopFallers(e.target.value)} rows={3} placeholder="پراید -۲%"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none resize-none" />
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">پرآگهی‌ها (هر خط یکی)</label>
            <textarea value={hotListings} onChange={(e) => setHotListings(e.target.value)} rows={3} placeholder="پراید&#10;تیبا"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none resize-none" />
          </div>
        </div>

        <div className="mb-3">
          <label className="text-[10px] text-muted block mb-1">تحلیل AI (اختیاری)</label>
          <textarea value={aiAnalysis} onChange={(e) => setAiAnalysis(e.target.value)} rows={4} placeholder="تحلیل عمیق‌تر..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none" />
        </div>

        <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg">ثبت تحلیل</button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {insights.map((ins) => (
          <div key={ins.id} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-black text-foreground">{ins.title}</span>
                <span className="text-[10px] text-muted mr-2">
                  {ins.period === "daily" ? "روزانه" : ins.period === "weekly" ? "هفتگی" : ins.period === "monthly" ? "ماهانه" : "فصلی"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted">{ins.date}</span>
                <button onClick={() => handleDelete(ins.id)} className="text-red-400 hover:text-red-500 text-[10px]">حذف</button>
              </div>
            </div>
            <p className="text-xs text-muted leading-5 mb-2">{ins.summary}</p>
            {ins.highlights.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {ins.highlights.map((h, i) => (
                  <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-[10px]">{h}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 text-[10px]">
              {ins.topRisers.length > 0 && <span className="text-emerald-500">رشد: {ins.topRisers.join("، ")}</span>}
              {ins.topFallers.length > 0 && <span className="text-red-400">افت: {ins.topFallers.join("، ")}</span>}
            </div>
          </div>
        ))}

        {insights.length === 0 && (
          <p className="text-sm text-muted text-center py-8">تحلیلی ثبت نشده</p>
        )}
      </div>
    </div>
  );
}

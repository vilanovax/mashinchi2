"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Crawler {
  id: string; name: string; url: string; type: string;
  schedule: string | null; isActive: boolean;
  lastRunAt: string | null; createdAt: string;
}

interface CarIrResult {
  carName: string;
  matchedCarId: string | null;
  matchedCarName: string;
  prices: { label: string; value: number }[];
  specs: { key: string; value: string; category: string }[];
  comments: { text: string; user: string }[];
  article: string;
  fullTextLength: number;
  fullText: string;
  summary: { specsCount: number; commentsCount: number; pricesCount: number; articleLength: number };
}

const PRESETS = [
  { name: "bama_prices", label: "قیمت‌ها - باما", desc: "استخراج قیمت روز خودروها از باما", url: "https://bama.ir/car", type: "price", color: "text-primary", bg: "bg-primary/8" },
  { name: "divar_prices", label: "قیمت‌ها - دیوار", desc: "استخراج قیمت آگهی‌ها از دیوار", url: "https://divar.ir/s/tehran/car", type: "price", color: "text-red-500", bg: "bg-red-500/8" },
  { name: "bama_reviews", label: "نظرات - باما", desc: "استخراج نظرات و امتیازات کاربران", url: "https://bama.ir/review", type: "review", color: "text-accent", bg: "bg-accent/8" },
  { name: "bama_listings", label: "لیست خودروها - باما", desc: "استخراج مشخصات خودروهای جدید", url: "https://bama.ir/car/new", type: "listing", color: "text-violet-600", bg: "bg-violet-500/8" },
];

const TYPE_LABELS: Record<string, string> = { price: "قیمت", review: "نظر", listing: "لیستینگ" };
const TYPE_COLORS: Record<string, string> = { price: "bg-primary/10 text-primary", review: "bg-accent/10 text-accent", listing: "bg-violet-500/10 text-violet-600" };

export default function AdminCrawlersPage() {
  const { fetchAdmin } = useAdmin();
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Car.ir crawl
  const [carIrUrl, setCarIrUrl] = useState("");
  const [carIrLoading, setCarIrLoading] = useState(false);
  const [carIrResult, setCarIrResult] = useState<CarIrResult | null>(null);
  const [carIrError, setCarIrError] = useState<string | null>(null);
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [savingComments, setSavingComments] = useState(false);

  useEffect(() => {
    fetchAdmin("/api/admin/crawlers").then((r) => r.json()).then((d) => { setCrawlers(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const addFromPreset = async (preset: typeof PRESETS[0]) => {
    const exists = crawlers.find((c) => c.name === preset.name);
    if (exists) { showToast("قبلا اضافه شده"); return; }
    const res = await fetchAdmin("/api/admin/crawlers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: preset.name, url: preset.url, type: preset.type }),
    });
    if (res.ok) {
      const crawler = await res.json();
      setCrawlers([crawler, ...crawlers]);
      showToast(`${preset.label} اضافه شد`);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetchAdmin(`/api/admin/crawlers/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCrawlers((prev) => prev.map((c) => c.id === id ? updated : c));
    }
  };

  const simulateRun = async (id: string) => {
    setRunningId(id);
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetchAdmin(`/api/admin/crawlers/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulateRun: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCrawlers((prev) => prev.map((c) => c.id === id ? updated : c));
      showToast("اجرا انجام شد");
    }
    setRunningId(null);
  };

  const deleteCrawler = async (id: string) => {
    await fetchAdmin(`/api/admin/crawlers/${id}`, { method: "DELETE" });
    setCrawlers((prev) => prev.filter((c) => c.id !== id));
    showToast("حذف شد");
  };

  // ── Car.ir Crawl ──
  const handleCarIrCrawl = async () => {
    if (!carIrUrl.trim()) return;
    setCarIrLoading(true);
    setCarIrResult(null);
    setCarIrError(null);
    try {
      const res = await fetchAdmin("/api/admin/crawlers/car-ir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: carIrUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setCarIrResult(data);
        showToast(`${data.carName}: ${toPersianDigits(data.summary.specsCount)} مشخصه، ${toPersianDigits(data.summary.commentsCount)} کامنت`);
      } else {
        setCarIrError(data.error);
      }
    } catch {
      setCarIrError("خطا در اتصال");
    }
    setCarIrLoading(false);
  };

  // Save comments as sources
  const handleSaveComments = async () => {
    if (!carIrResult?.matchedCarId || carIrResult.comments.length === 0) {
      showToast("خودرو تشخیص داده نشد یا کامنتی نیست");
      return;
    }
    setSavingComments(true);
    let saved = 0;
    for (const c of carIrResult.comments) {
      const res = await fetchAdmin("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: carIrResult.matchedCarId,
          type: "comment",
          sourceSite: "car.ir",
          url: carIrUrl,
          title: `نظر ${c.user} از car.ir`,
          rawText: c.text,
        }),
      });
      if (res.ok) saved++;
    }
    showToast(`${toPersianDigits(saved)} کامنت به عنوان منبع ذخیره شد`);
    setSavingComments(false);
  };

  // Save full text as source
  const handleSaveFullText = async () => {
    if (!carIrResult?.matchedCarId) {
      showToast("خودرو تشخیص داده نشد");
      return;
    }
    setSavingSpecs(true);
    const res = await fetchAdmin("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId: carIrResult.matchedCarId,
        type: "article",
        sourceSite: "car.ir",
        url: carIrUrl,
        title: `مشخصات ${carIrResult.carName} از car.ir`,
        rawText: carIrResult.fullText,
      }),
    });
    if (res.ok) {
      showToast("متن کامل به عنوان منبع ذخیره شد");
    }
    setSavingSpecs(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const activeCount = crawlers.filter((c) => c.isActive).length;

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-black">مدیریت کرالر</h1>
        <span className="text-[10px] text-muted">{toPersianDigits(activeCount)} فعال از {toPersianDigits(crawlers.length)}</span>
      </div>

      {/* ─── Car.ir Crawler (main feature) ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-black">کرال از car.ir</h2>
            <p className="text-[10px] text-muted">لینک صفحه یک خودرو در car.ir رو بذار تا مشخصات، قیمت و کامنت‌ها استخراج بشه</p>
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          <input
            value={carIrUrl}
            onChange={(e) => { setCarIrUrl(e.target.value); setCarIrError(null); }}
            placeholder="https://car.ir/766-mvm-x55-excellent-sport"
            dir="ltr"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none font-mono focus:border-emerald-500/50"
          />
          <button
            onClick={handleCarIrCrawl}
            disabled={carIrLoading || !carIrUrl.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            {carIrLoading ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> در حال کرال...</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" /></svg> کرال</>
            )}
          </button>
        </div>

        {carIrError && (
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2 text-[10px] text-red-500 font-bold">{carIrError}</div>
        )}

        {/* Car.ir Results */}
        {carIrResult && (
          <div className="mt-3 space-y-3">
            {/* Header: car name + match */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">{carIrResult.carName}</span>
                {carIrResult.matchedCarId ? (
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                    تشخیص: {carIrResult.matchedCarName}
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full font-bold">خودرو تشخیص داده نشد</span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "مقاله/توضیحات", value: carIrResult.summary.articleLength > 0 ? `${Math.round(carIrResult.summary.articleLength / 100)}00` : "—", color: carIrResult.summary.articleLength > 0 ? "text-violet-600" : "text-muted" },
                { label: "مشخصات فنی", value: carIrResult.summary.specsCount, color: "text-primary" },
                { label: "قیمت", value: carIrResult.summary.pricesCount, color: "text-emerald-600" },
                { label: "کامنت", value: carIrResult.summary.commentsCount, color: "text-amber-600" },
                { label: "حجم کل", value: `${Math.round(carIrResult.fullTextLength / 1000)}K`, color: "text-muted" },
              ].map((s) => (
                <div key={s.label} className="bg-background rounded-lg px-2 py-2 text-center">
                  <div className={`text-sm font-black ${s.color}`}>{typeof s.value === "number" ? toPersianDigits(s.value) : toPersianDigits(s.value)}</div>
                  <div className="text-[8px] text-muted">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Prices */}
            {carIrResult.prices.length > 0 && (
              <div>
                <h4 className="text-[10px] font-black text-muted mb-1">قیمت‌ها</h4>
                <div className="flex gap-2">
                  {carIrResult.prices.map((p, i) => (
                    <div key={i} className="bg-background rounded-lg px-3 py-1.5 text-center">
                      <div className="text-[9px] text-muted">{p.label}</div>
                      <div className="text-xs font-black text-emerald-600">
                        {p.value >= 1_000_000_000
                          ? toPersianDigits((p.value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")) + " میلیارد"
                          : toPersianDigits((p.value / 1_000_000).toFixed(0)) + " م"
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Article/Description preview */}
            {carIrResult.article && carIrResult.article.length > 0 && (
              <details open>
                <summary className="text-[10px] font-black text-muted cursor-pointer hover:text-foreground">
                  توضیحات و بررسی ({toPersianDigits(carIrResult.article.length)} کاراکتر) ▾
                </summary>
                <div className="mt-1.5 bg-background rounded-lg p-3 text-[10px] leading-6 max-h-[200px] overflow-y-auto whitespace-pre-line text-foreground">
                  {carIrResult.article}
                </div>
              </details>
            )}

            {/* Specs preview */}
            {carIrResult.specs.length > 0 && (
              <details>
                <summary className="text-[10px] font-black text-muted cursor-pointer hover:text-foreground">
                  مشخصات فنی ({toPersianDigits(carIrResult.specs.length)} آیتم) ▾
                </summary>
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 max-h-[200px] overflow-y-auto">
                  {carIrResult.specs.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 py-0.5 text-[9px]">
                      <span className="text-muted truncate flex-1">{s.key}:</span>
                      <span className="font-bold text-foreground truncate max-w-[150px]">{s.value}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Comments preview */}
            {carIrResult.comments.length > 0 && (
              <details>
                <summary className="text-[10px] font-black text-muted cursor-pointer hover:text-foreground">
                  کامنت‌ها ({toPersianDigits(carIrResult.comments.length)}) ▾
                </summary>
                <div className="mt-1.5 space-y-1 max-h-[200px] overflow-y-auto">
                  {carIrResult.comments.map((c, i) => (
                    <div key={i} className="bg-background rounded-lg px-2.5 py-1.5">
                      <div className="text-[9px] text-muted mb-0.5">{c.user}</div>
                      <div className="text-[10px] leading-5 line-clamp-3">{c.text}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Save actions */}
            {carIrResult.matchedCarId && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={handleSaveFullText}
                  disabled={savingSpecs}
                  className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1"
                >
                  {savingSpecs ? "..." : (
                    <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" /></svg> ذخیره متن کامل</>
                  )}
                </button>
                {carIrResult.comments.length > 0 && (
                  <button
                    onClick={handleSaveComments}
                    disabled={savingComments}
                    className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1"
                  >
                    {savingComments ? "..." : (
                      <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> ذخیره {toPersianDigits(carIrResult.comments.length)} کامنت</>
                    )}
                  </button>
                )}
                <span className="text-[9px] text-muted mr-auto">در منابع «{carIrResult.matchedCarName}» ذخیره می‌شود</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Preset Sources (compact) ─── */}
      <div className="mb-4">
        <h2 className="text-[11px] font-black text-muted mb-2">منابع آماده</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset) => {
            const exists = crawlers.find((c) => c.name === preset.name);
            return (
              <button
                key={preset.name}
                onClick={() => !exists && addFromPreset(preset)}
                disabled={!!exists}
                className={`text-right px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                  exists
                    ? "bg-background/50 border-border/50 opacity-50 cursor-default"
                    : `${preset.bg} border-transparent hover:border-primary/20`
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold">{preset.label}</span>
                    {exists && <span className="text-[8px] bg-accent/10 text-accent px-1 py-0.5 rounded-full">فعال</span>}
                  </div>
                  <p className="text-[9px] text-muted truncate">{preset.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Active Crawlers (compact) ─── */}
      {crawlers.length > 0 && (
        <div>
          <h2 className="text-[11px] font-black text-muted mb-2">کرالرهای فعال</h2>
          <div className="space-y-1.5">
            {crawlers.map((c) => {
              const isRunning = runningId === c.id;
              const preset = PRESETS.find((p) => p.name === c.name);

              return (
                <div key={c.id} className={`bg-surface rounded-xl border px-3 py-2.5 flex items-center gap-2.5 ${c.isActive ? "border-border" : "border-border/40 opacity-50"}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isRunning ? "bg-amber-500 animate-pulse" : c.isActive ? "bg-accent" : "bg-muted/40"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold">{preset?.label || c.name}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[c.type] || "bg-background text-muted"}`}>
                        {TYPE_LABELS[c.type] || c.type}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted" dir="ltr">{c.url}</span>
                  </div>
                  <div className="text-[8px] text-muted/60 shrink-0">
                    {c.lastRunAt ? new Date(c.lastRunAt).toLocaleDateString("fa-IR") : "—"}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => simulateRun(c.id)}
                      disabled={isRunning || !c.isActive}
                      className="px-2 py-1 bg-primary/10 text-primary text-[9px] font-bold rounded-lg disabled:opacity-40"
                    >
                      {isRunning ? "..." : "اجرا"}
                    </button>
                    <button onClick={() => toggleActive(c.id, c.isActive)} className="px-2 py-1 text-[9px] font-bold text-muted hover:text-foreground rounded-lg">
                      {c.isActive ? "غیرفعال" : "فعال"}
                    </button>
                    <button onClick={() => deleteCrawler(c.id)} className="p-1 text-muted hover:text-red-500 rounded-lg">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

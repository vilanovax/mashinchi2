"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Crawler {
  id: string; name: string; url: string; type: string;
  schedule: string | null; isActive: boolean;
  lastRunAt: string | null; createdAt: string;
}

const PRESETS = [
  {
    name: "bama_prices",
    label: "قیمت‌ها - باما",
    desc: "استخراج قیمت روز خودروها از سایت باما",
    url: "https://bama.ir/car",
    type: "price",
    icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z",
    color: "text-primary",
    bg: "bg-primary/8",
  },
  {
    name: "divar_prices",
    label: "قیمت‌ها - دیوار",
    desc: "استخراج قیمت آگهی‌های خودرو از دیوار",
    url: "https://divar.ir/s/tehran/car",
    type: "price",
    icon: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z",
    color: "text-danger",
    bg: "bg-danger/8",
  },
  {
    name: "bama_reviews",
    label: "نظرات - باما",
    desc: "استخراج نظرات و امتیازات کاربران از باما",
    url: "https://bama.ir/review",
    type: "review",
    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
    color: "text-accent",
    bg: "bg-accent/8",
  },
  {
    name: "bama_listings",
    label: "لیست خودروها - باما",
    desc: "استخراج مشخصات و اطلاعات خودروهای جدید",
    url: "https://bama.ir/car/new",
    type: "listing",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/8",
  },
];

const TYPE_LABELS: Record<string, string> = { price: "قیمت", review: "نظر", listing: "لیستینگ" };
const TYPE_COLORS: Record<string, string> = { price: "bg-primary/10 text-primary", review: "bg-accent/10 text-accent", listing: "bg-violet-500/10 text-violet-600" };

export default function AdminCrawlersPage() {
  const { fetchAdmin } = useAdmin();
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("price");
  const [newSchedule, setNewSchedule] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/crawlers").then((r) => r.json()).then((d) => { setCrawlers(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const addFromPreset = async (preset: typeof PRESETS[0]) => {
    const exists = crawlers.find((c) => c.name === preset.name);
    if (exists) { showToast("این کرالر قبلا اضافه شده"); return; }

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

  const handleAddCustom = async () => {
    if (!newName || !newUrl) return;
    const res = await fetchAdmin("/api/admin/crawlers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, url: newUrl, type: newType, schedule: newSchedule || null }),
    });
    if (res.ok) {
      const crawler = await res.json();
      setCrawlers([crawler, ...crawlers]);
      setShowCustom(false); setNewName(""); setNewUrl(""); setNewSchedule("");
      showToast("کرالر اضافه شد");
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
    // Simulate a delay for UX
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetchAdmin(`/api/admin/crawlers/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simulateRun: true }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCrawlers((prev) => prev.map((c) => c.id === id ? updated : c));
      showToast("اجرا انجام شد - داده‌ها در فاز بعدی واقعی می‌شوند");
    }
    setRunningId(null);
  };

  const deleteCrawler = async (id: string) => {
    await fetchAdmin(`/api/admin/crawlers/${id}`, { method: "DELETE" });
    setCrawlers((prev) => prev.filter((c) => c.id !== id));
    showToast("کرالر حذف شد");
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const activeCount = crawlers.filter((c) => c.isActive).length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-black">مدیریت کرالر</h1>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{toPersianDigits(activeCount)} فعال از {toPersianDigits(crawlers.length)}</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <p className="text-xs font-bold mb-1">کرالر چیست؟</p>
            <p className="text-[11px] text-muted leading-5">
              کرالرها به صورت خودکار داده‌های قیمت و نظرات را از سایت‌های خودرو (باما، دیوار) استخراج می‌کنند.
              فعلا اجرای شبیه‌سازی‌شده است - در فاز بعدی با اسکرپر واقعی جایگزین می‌شود.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Add from Presets */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black">منابع آماده</h2>
          <button onClick={() => setShowCustom(!showCustom)} className="text-[10px] text-primary font-bold">
            {showCustom ? "بستن" : "+ سفارشی"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const exists = crawlers.find((c) => c.name === preset.name);
            return (
              <button
                key={preset.name}
                onClick={() => !exists && addFromPreset(preset)}
                disabled={!!exists}
                className={`text-right p-3.5 rounded-xl border transition-all ${
                  exists
                    ? "bg-background border-border opacity-60 cursor-default"
                    : `${preset.bg} border-transparent hover:border-primary/20 cursor-pointer`
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg ${exists ? "bg-muted/10" : preset.bg} flex items-center justify-center shrink-0`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={exists ? "text-muted" : preset.color}>
                      <path d={preset.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">{preset.label}</span>
                      {exists && <span className="text-[8px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">فعال</span>}
                    </div>
                    <p className="text-[10px] text-muted mt-0.5 truncate">{preset.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Add Form */}
      {showCustom && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-5">
          <h3 className="text-xs font-black mb-3">کرالر سفارشی</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="نام شناسه (مثلا custom_prices)" className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="آدرس URL" dir="ltr" className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[10px] text-muted block mb-1">نوع داده</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                <option value="price">قیمت</option><option value="review">نظر</option><option value="listing">لیستینگ</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted block mb-1">زمان‌بندی (اختیاری)</label>
              <input value={newSchedule} onChange={(e) => setNewSchedule(e.target.value)} placeholder="مثلا 0 9 * * * (هر روز ۹ صبح)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" dir="ltr" />
            </div>
            <button onClick={handleAddCustom} disabled={!newName || !newUrl} className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40 shrink-0">
              افزودن
            </button>
          </div>
        </div>
      )}

      {/* Active Crawlers */}
      {crawlers.length > 0 && (
        <div>
          <h2 className="text-sm font-black mb-3">کرالرهای ثبت‌شده</h2>
          <div className="space-y-2">
            {crawlers.map((c) => {
              const isRunning = runningId === c.id;
              const preset = PRESETS.find((p) => p.name === c.name);

              return (
                <div key={c.id} className={`bg-surface rounded-xl border overflow-hidden transition-colors ${c.isActive ? "border-border" : "border-border/50 opacity-60"}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRunning ? "bg-amber-500 animate-pulse" : c.isActive ? "bg-accent" : "bg-muted/40"}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{preset?.label || c.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[c.type] || "bg-background text-muted"}`}>
                          {TYPE_LABELS[c.type] || c.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted truncate max-w-[250px]" dir="ltr">{c.url}</span>
                        {c.schedule && <span className="text-[9px] bg-background px-1.5 py-0.5 rounded text-muted" dir="ltr">{c.schedule}</span>}
                      </div>
                    </div>

                    {/* Last run */}
                    <div className="text-left shrink-0 ml-2">
                      <div className="text-[9px] text-muted">آخرین اجرا</div>
                      <div className="text-[11px] font-bold">
                        {c.lastRunAt ? new Date(c.lastRunAt).toLocaleDateString("fa-IR") + " " + new Date(c.lastRunAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : "هرگز"}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => simulateRun(c.id)}
                        disabled={isRunning || !c.isActive}
                        className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 ${
                          isRunning ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary hover:bg-primary/20"
                        } disabled:opacity-40`}
                      >
                        {isRunning ? (
                          <>
                            <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            در حال اجرا...
                          </>
                        ) : (
                          <>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            اجرا
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => toggleActive(c.id, c.isActive)}
                        className={`px-2 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                          c.isActive ? "text-muted hover:text-danger hover:bg-danger/5" : "text-accent hover:bg-accent/10"
                        }`}
                      >
                        {c.isActive ? "غیرفعال" : "فعال"}
                      </button>
                      <button
                        onClick={() => deleteCrawler(c.id)}
                        className="p-1.5 text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {crawlers.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-3 bg-muted/8 rounded-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/40">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
          </div>
          <p className="text-sm text-muted mb-1">هنوز کرالری ثبت نشده</p>
          <p className="text-[11px] text-muted">از منابع آماده بالا یکی رو اضافه کنید</p>
        </div>
      )}

      {/* Roadmap Note */}
      <div className="mt-6 bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
        <div className="flex items-start gap-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <div>
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-0.5">نسخه بعدی</p>
            <p className="text-[10px] text-muted leading-5">
              اسکرپر واقعی باما/دیوار با cheerio، زمان‌بندی خودکار cron، استخراج و ذخیره قیمت‌ها در PriceHistory، و لاگ کامل اجرا
            </p>
          </div>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

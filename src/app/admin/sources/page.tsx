"use client";

import { useState, useEffect, useMemo } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Source {
  id: string; carId: string; carName: string; carBrand: string;
  type: string; sourceSite: string; url: string | null; title: string | null;
  rawText: string; rawTextFull: string;
  processedSummary: string | null;
  extractedPros: string[]; extractedCons: string[]; extractedIssues: string[]; extractedWarnings: string[];
  extractedScores: string | null;
  status: string; appliedAt: string | null; lastCrawledAt: string | null;
  createdAt: string; updatedAt: string;
}

interface CarOption { id: string; nameFa: string; brandFa: string }

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "در انتظار", color: "text-amber-600", bg: "bg-amber-500/10" },
  processed: { label: "پردازش‌شده", color: "text-primary", bg: "bg-primary/10" },
  approved: { label: "تایید‌شده", color: "text-accent", bg: "bg-accent/10" },
  rejected: { label: "رد‌شده", color: "text-danger", bg: "bg-danger/10" },
};

const SITE_CONFIG: Record<string, { label: string; color: string }> = {
  bama: { label: "باما", color: "text-blue-600 bg-blue-500/10" },
  divar: { label: "دیوار", color: "text-red-600 bg-red-500/10" },
  zoomit: { label: "زومیت", color: "text-purple-600 bg-purple-500/10" },
  charkhan: { label: "چرخان", color: "text-emerald-600 bg-emerald-500/10" },
  blog: { label: "بلاگ", color: "text-amber-600 bg-amber-500/10" },
  manual: { label: "دستی", color: "text-muted bg-background" },
};

type AddMode = "url" | "text";

export default function AdminSourcesPage() {
  const { fetchAdmin } = useAdmin();
  const [sources, setSources] = useState<Source[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCar, setFilterCar] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("url");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlMode, setCrawlMode] = useState<"auto" | "browser">("auto");
  const [crawlError, setCrawlError] = useState<{ error: string; suggestion?: string } | null>(null);
  const [crawlResult, setCrawlResult] = useState<{
    title: string; text: string; textLength: number;
    sourceSite: string; type: string; method: string;
    detectedCarId: string | null; detectedCarName: string;
  } | null>(null);

  // Manual text form
  const [newCarId, setNewCarId] = useState("");
  const [newType, setNewType] = useState("comment");
  const [newSite, setNewSite] = useState("manual");
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");

  useEffect(() => {
    Promise.all([
      fetchAdmin("/api/admin/sources").then((r) => r.json()),
      fetchAdmin("/api/admin/cars").then((r) => r.json()),
    ]).then(([srcData, carData]) => {
      setSources(srcData);
      setCars(carData.map((c: CarOption & Record<string, unknown>) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa })));
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    return sources.filter((s) => {
      return (filterCar === "all" || s.carId === filterCar) && (filterStatus === "all" || s.status === filterStatus);
    });
  }, [sources, filterCar, filterStatus]);

  const stats = useMemo(() => ({
    total: sources.length,
    pending: sources.filter((s) => s.status === "pending").length,
    processed: sources.filter((s) => s.status === "processed").length,
    approved: sources.filter((s) => s.status === "approved").length,
  }), [sources]);

  // Crawl URL
  const handleCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setCrawling(true);
    setCrawlResult(null);
    setCrawlError(null);
    try {
      const res = await fetchAdmin("/api/admin/sources/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: crawlUrl, mode: crawlMode }),
      });
      const data = await res.json();
      if (data.success) {
        setCrawlResult(data);
        if (data.detectedCarId) setNewCarId(data.detectedCarId);
        showToast(`استخراج شد: ${toPersianDigits(data.textLength)} کاراکتر (${data.method})`);
      } else {
        setCrawlError({ error: data.error, suggestion: data.suggestion });
      }
    } catch { setCrawlError({ error: "خطا در اتصال" }); }
    setCrawling(false);
  };

  // Save source (from crawl result or manual text)
  const handleSave = async () => {
    const carId = newCarId || crawlResult?.detectedCarId;
    const text = addMode === "url" ? crawlResult?.text : newText;

    if (!carId || !text?.trim()) {
      showToast("خودرو و متن الزامی است");
      return;
    }

    const res = await fetchAdmin("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId,
        type: addMode === "url" ? (crawlResult?.type || "article") : newType,
        sourceSite: addMode === "url" ? (crawlResult?.sourceSite || "blog") : newSite,
        url: addMode === "url" ? crawlUrl : (newUrl || null),
        title: addMode === "url" ? (crawlResult?.title || null) : (newTitle || null),
        rawText: text,
      }),
    });
    if (res.ok) {
      const data = await fetchAdmin("/api/admin/sources").then((r) => r.json());
      setSources(data);
      resetAddForm();
      showToast("منبع ذخیره شد");
    }
  };

  const resetAddForm = () => {
    setShowAdd(false);
    setCrawlUrl(""); setCrawlResult(null);
    setNewCarId(""); setNewText(""); setNewUrl(""); setNewTitle("");
  };

  const handleProcess = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetchAdmin(`/api/admin/sources/${id}/process`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const updated = await fetchAdmin("/api/admin/sources").then((r) => r.json());
        setSources(updated);
        setExpandedId(id);
        showToast("پردازش موفق");
      } else { showToast(data.error || "خطا"); }
    } catch { showToast("خطا"); }
    setProcessingId(null);
  };

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      const res = await fetchAdmin(`/api/admin/sources/${id}/apply`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const updated = await fetchAdmin("/api/admin/sources").then((r) => r.json());
        setSources(updated);
        showToast(`اعمال شد: ${data.applied.join(", ")}`);
      } else { showToast(data.error || "خطا"); }
    } catch { showToast("خطا"); }
    setApplyingId(null);
  };

  const handleDelete = async (id: string) => {
    await fetchAdmin(`/api/admin/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    showToast("حذف شد");
  };

  const handleReject = async (id: string) => {
    await fetchAdmin(`/api/admin/sources/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: "rejected" } : s));
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-black">منابع دانش خودرو</h1>
          <p className="text-[11px] text-muted mt-0.5">جمع‌آوری، پردازش و اعمال نظرات و مقالات</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          افزودن منبع
        </button>
      </div>

      {/* Flow indicator */}
      <div className="flex items-center gap-2 text-[10px] text-muted bg-surface rounded-lg border border-border px-4 py-2.5 mb-4">
        <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold">۱. ثبت</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">۲. پردازش AI</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        <span className="text-muted">بازبینی</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">۳. تایید و اعمال</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          {Object.entries({ all: { label: "همه", count: stats.total }, pending: { label: "انتظار", count: stats.pending }, processed: { label: "پردازش‌شده", count: stats.processed }, approved: { label: "تایید", count: stats.approved } }).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all ${
                filterStatus === key ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"
              }`}
            >
              {val.label} {toPersianDigits(val.count)}
            </button>
          ))}
        </div>
        <select value={filterCar} onChange={(e) => setFilterCar(e.target.value)} className="bg-surface border border-border rounded-lg px-2 py-1 text-[11px] outline-none max-w-[200px]">
          <option value="all">همه خودروها</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa}</option>)}
        </select>
      </div>

      {/* Sources List */}
      <div className="space-y-2">
        {filtered.map((src) => {
          const isExpanded = expandedId === src.id;
          const stCfg = STATUS_CONFIG[src.status] || STATUS_CONFIG.pending;
          const siteCfg = SITE_CONFIG[src.sourceSite] || SITE_CONFIG.manual;
          const scores = src.extractedScores ? JSON.parse(src.extractedScores) : null;

          return (
            <div key={src.id} className={`bg-surface rounded-xl border overflow-hidden transition-colors ${src.status === "approved" ? "border-accent/20" : "border-border"}`}>
              {/* Row */}
              <div onClick={() => setExpandedId(isExpanded ? null : src.id)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-background/30 transition-colors">
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full shrink-0 ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{src.carName}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${siteCfg.color}`}>{siteCfg.label}</span>
                    {src.title && <span className="text-[10px] text-muted truncate max-w-[250px]">{src.title}</span>}
                  </div>
                  <p className="text-[10px] text-muted truncate mt-0.5">{src.rawText}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] text-muted">{new Date(src.createdAt).toLocaleDateString("fa-IR")}</span>

                  {/* Quick actions */}
                  {src.status === "pending" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleProcess(src.id); }}
                      disabled={processingId === src.id}
                      className="px-2 py-1 bg-primary/10 text-primary text-[9px] font-bold rounded-lg disabled:opacity-50"
                    >
                      {processingId === src.id ? "..." : "پردازش"}
                    </button>
                  )}
                  {src.status === "processed" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApply(src.id); }}
                      disabled={applyingId === src.id}
                      className="px-2 py-1 bg-accent/10 text-accent text-[9px] font-bold rounded-lg disabled:opacity-50"
                    >
                      {applyingId === src.id ? "..." : "اعمال"}
                    </button>
                  )}

                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-background/20">
                  {/* Raw text */}
                  <div className="bg-background rounded-lg p-3 text-[11px] leading-6 max-h-[150px] overflow-y-auto">{src.rawTextFull}</div>
                  {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline" dir="ltr">{src.url}</a>}

                  {/* AI results */}
                  {src.processedSummary && (
                    <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                      <h4 className="text-[10px] font-black text-primary mb-1">خلاصه AI</h4>
                      <p className="text-[11px] leading-6">{src.processedSummary}</p>
                    </div>
                  )}

                  {(src.extractedPros.length > 0 || src.extractedCons.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        {src.extractedPros.map((p, i) => (<div key={i} className="flex items-start gap-1 text-[10px] mb-0.5"><span className="text-accent font-bold">+</span><span>{p}</span></div>))}
                      </div>
                      <div>
                        {src.extractedCons.map((c, i) => (<div key={i} className="flex items-start gap-1 text-[10px] mb-0.5"><span className="text-danger font-bold">-</span><span>{c}</span></div>))}
                      </div>
                    </div>
                  )}

                  {scores && (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(scores).filter(([, v]) => typeof v === "number").map(([k, v]) => (
                        <span key={k} className="text-[8px] bg-background px-1.5 py-0.5 rounded font-mono">{k}: {toPersianDigits(v as number)}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {src.status === "pending" && (
                      <button onClick={() => handleProcess(src.id)} disabled={!!processingId} className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-50 flex items-center gap-1">
                        {processingId === src.id ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> پردازش...</> : "پردازش با AI"}
                      </button>
                    )}
                    {src.status === "processed" && (
                      <>
                        <button onClick={() => handleApply(src.id)} disabled={!!applyingId} className="px-3 py-1.5 bg-accent text-white text-[10px] font-bold rounded-lg disabled:opacity-50">{applyingId === src.id ? "..." : "تایید و اعمال"}</button>
                        <button onClick={() => handleReject(src.id)} className="px-3 py-1.5 text-[10px] text-danger font-bold bg-danger/5 rounded-lg">رد</button>
                        <button onClick={() => handleProcess(src.id)} disabled={!!processingId} className="px-3 py-1.5 text-[10px] text-muted font-bold bg-background rounded-lg disabled:opacity-50">پردازش مجدد</button>
                      </>
                    )}
                    {src.status === "approved" && (
                      <span className="text-[10px] text-accent font-bold flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                        اعمال شده {src.appliedAt && `- ${new Date(src.appliedAt).toLocaleDateString("fa-IR")}`}
                      </span>
                    )}
                    <button onClick={() => handleDelete(src.id)} className="px-2 py-1.5 text-muted hover:text-danger text-[10px] mr-auto">حذف</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-surface rounded-xl border border-dashed border-border">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/30 mx-auto mb-2">
              <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
            </svg>
            <p className="text-sm text-muted mb-1">منبعی ثبت نشده</p>
            <button onClick={() => setShowAdd(true)} className="text-[11px] text-primary font-bold mt-1">+ افزودن منبع</button>
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={resetAddForm} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-[600px] max-h-[85vh] overflow-y-auto">
            <h3 className="text-sm font-black mb-4">افزودن منبع جدید</h3>

            {/* Mode tabs */}
            <div className="flex gap-1 bg-background rounded-xl p-1 mb-4">
              <button
                onClick={() => { setAddMode("url"); setCrawlResult(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  addMode === "url" ? "bg-surface text-foreground shadow-sm" : "text-muted"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                کرال از لینک
              </button>
              <button
                onClick={() => setAddMode("text")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  addMode === "text" ? "bg-surface text-foreground shadow-sm" : "text-muted"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /></svg>
                متن دستی
              </button>
            </div>

            {/* URL mode */}
            {addMode === "url" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">لینک صفحه</label>
                  <div className="flex gap-2">
                    <input
                      value={crawlUrl}
                      onChange={(e) => { setCrawlUrl(e.target.value); setCrawlError(null); }}
                      placeholder="https://bama.ir/car-reviews/..."
                      dir="ltr"
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary font-mono"
                    />
                    <button
                      onClick={handleCrawl}
                      disabled={crawling || !crawlUrl.trim()}
                      className="px-4 py-2.5 bg-primary text-white text-[11px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                    >
                      {crawling ? (
                        <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> کرال...</>
                      ) : (
                        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" /></svg> کرال</>
                      )}
                    </button>
                  </div>

                  {/* Crawl mode */}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted">روش:</span>
                    {([
                      { key: "auto" as const, label: "خودکار", desc: "HTML اول، بعد Browser" },
                      { key: "browser" as const, label: "مرورگر", desc: "برای lazy-load (کندتر)" },
                    ]).map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setCrawlMode(m.key)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          crawlMode === m.key ? "bg-primary/10 text-primary border-primary/30 font-bold" : "border-border text-muted"
                        }`}
                        title={m.desc}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Crawl error */}
                {crawlError && (
                  <div className="bg-danger/5 border border-danger/15 rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                      <div>
                        <p className="text-[11px] text-danger font-bold">{crawlError.error}</p>
                        {crawlError.suggestion && (
                          <p className="text-[10px] text-muted mt-1">{crawlError.suggestion}</p>
                        )}
                        <button
                          onClick={() => { setAddMode("text"); setCrawlError(null); }}
                          className="text-[10px] text-primary font-bold mt-1.5 hover:underline"
                        >
                          رفتن به حالت متن دستی
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Crawl result */}
                {crawlResult && (
                  <div className="bg-accent/5 border border-accent/15 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent"><path d="M20 6L9 17l-5-5" /></svg>
                        <span className="text-xs font-bold text-accent">استخراج موفق</span>
                      </div>
                      <span className="text-[9px] bg-background px-1.5 py-0.5 rounded">{crawlResult.method === "browser" ? "مرورگر" : "HTML"}</span>
                      <span className="text-[9px] text-muted">{toPersianDigits(crawlResult.textLength)} کاراکتر</span>
                    </div>

                    {crawlResult.title && (
                      <div className="text-xs font-bold">{crawlResult.title}</div>
                    )}

                    {/* Detected car */}
                    {crawlResult.detectedCarId ? (
                      <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent"><path d="M9.663 17h4.673M12 3v1" /></svg>
                        <span className="text-[11px] font-bold text-accent">خودرو تشخیص داده شد: {crawlResult.detectedCarName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                        <span className="text-[11px] text-amber-600">خودرو تشخیص داده نشد - لطفا انتخاب کنید</span>
                      </div>
                    )}

                    {/* Preview text */}
                    <div className="bg-background rounded-lg p-3 text-[10px] leading-5 max-h-[120px] overflow-y-auto text-muted">
                      {crawlResult.text.slice(0, 500)}...
                    </div>

                    {/* Car selector (override or set) */}
                    <div>
                      <label className="text-[11px] text-muted block mb-1">{crawlResult.detectedCarId ? "تغییر خودرو (اختیاری)" : "انتخاب خودرو"}</label>
                      <select value={newCarId} onChange={(e) => setNewCarId(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                        <option value="">{crawlResult.detectedCarId ? `تشخیص خودکار: ${crawlResult.detectedCarName}` : "انتخاب..."}</option>
                        {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text mode */}
            {addMode === "text" && (
              <div className="space-y-3">
                <select value={newCarId} onChange={(e) => setNewCarId(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">انتخاب خودرو...</option>
                  {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="comment">نظر کاربر</option><option value="article">مقاله</option><option value="review">ریویو</option><option value="manual">دستی</option>
                  </select>
                  <select value={newSite} onChange={(e) => setNewSite(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="manual">دستی</option><option value="bama">باما</option><option value="divar">دیوار</option><option value="zoomit">زومیت</option><option value="charkhan">چرخان</option><option value="blog">بلاگ</option>
                  </select>
                </div>
                <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="لینک منبع (اختیاری)" dir="ltr" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
                <textarea value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="متن را paste کنید..." rows={8} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none leading-6" />
                {newText && <p className="text-[9px] text-muted">{toPersianDigits(newText.length)} کاراکتر</p>}
              </div>
            )}

            {/* Save */}
            <div className="flex gap-2 mt-4">
              <button onClick={resetAddForm} className="flex-1 py-2.5 bg-background text-sm font-bold rounded-xl">انصراف</button>
              <button
                onClick={handleSave}
                disabled={addMode === "url" ? !crawlResult : !newCarId || !newText.trim()}
                className="flex-1 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40"
              >
                ذخیره منبع
              </button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

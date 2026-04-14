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
  merged: { label: "ادغام‌شده", color: "text-violet-600", bg: "bg-violet-500/10" },
  rejected: { label: "رد‌شده", color: "text-danger", bg: "bg-danger/10" },
  archived: { label: "آرشیو", color: "text-muted", bg: "bg-muted/10" },
};

const SITE_CONFIG: Record<string, { label: string; color: string }> = {
  bama: { label: "باما", color: "text-blue-600 bg-blue-500/10" },
  divar: { label: "دیوار", color: "text-red-600 bg-red-500/10" },
  zoomit: { label: "زومیت", color: "text-purple-600 bg-purple-500/10" },
  charkhan: { label: "چرخان", color: "text-emerald-600 bg-emerald-500/10" },
  youtube: { label: "یوتیوب", color: "text-red-600 bg-red-500/10" },
  aparat: { label: "آپارات", color: "text-rose-600 bg-rose-500/10" },
  blog: { label: "بلاگ", color: "text-amber-600 bg-amber-500/10" },
  manual: { label: "دستی", color: "text-muted bg-background" },
};

const TYPE_CONFIG: Record<string, { label: string }> = {
  comment: { label: "تجربه کاربری" },
  article: { label: "مقاله" },
  review: { label: "ریویو تخصصی" },
  video: { label: "ویدیو" },
  comparison: { label: "مقایسه" },
  forum: { label: "فروم" },
  expert: { label: "نظر کارشناس" },
  manual: { label: "دستی" },
};

type AddMode = "url" | "text";

// ─── Diff helpers for merge preview ───
function diffArrays(oldArr: string[], newArr: string[]): {
  added: string[];
  removed: string[];
  same: string[];
} {
  const normalize = (s: string) => s.trim().toLowerCase();
  const oldNorm = new Map(oldArr.map((s) => [normalize(s), s]));
  const newNorm = new Map(newArr.map((s) => [normalize(s), s]));

  const added: string[] = [];
  const same: string[] = [];
  for (const [k, v] of newNorm) {
    if (oldNorm.has(k)) same.push(v);
    else added.push(v);
  }
  const removed: string[] = [];
  for (const [k, v] of oldNorm) {
    if (!newNorm.has(k)) removed.push(v);
  }
  return { added, removed, same };
}

function diffSentences(oldText: string, newText: string): {
  added: string[];
  removed: string[];
  same: string[];
} {
  // Split by sentence-ending punctuation (Persian . ! ؟ + newline)
  const split = (t: string) => t
    .split(/[.!?؟\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const oldSentences = split(oldText || "");
  const newSentences = split(newText || "");
  return diffArrays(oldSentences, newSentences);
}

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

  // Merge state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeApplying, setMergeApplying] = useState(false);
  type MergePreview = {
    success: boolean;
    carId: string;
    carName: string;
    sourcesUsed: { id: string; type: string; sourceSite: string; title: string | null; textLength: number }[];
    mergeReasoning: string;
    diff: {
      overallSummary: { old: string; new: string };
      whyBuy: { old: string; new: string };
      whyNotBuy: { old: string; new: string };
      ownerVerdict: { old: string; new: string };
      frequentPros: { old: string[]; new: string[] };
      frequentCons: { old: string[]; new: string[] };
      commonIssues: { old: string[]; new: string[] };
      purchaseWarnings: { old: string[]; new: string[] };
      ownerSatisfaction: { old: number; new: number };
      purchaseRisk: { old: number; new: number };
      scores: Record<string, { old: number; new: number; changed: boolean }>;
      scoresChanged: number;
    };
  };
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);

  // Crawl bar state
  const [crawlBarUrl, setCrawlBarUrl] = useState("");
  const [crawlBarLoading, setCrawlBarLoading] = useState(false);
  const [crawlBarError, setCrawlBarError] = useState<string | null>(null);
  interface CrawlBarResult {
    carName: string;
    matchedCarId: string | null;
    matchedCarName: string;
    article: string;
    specs: { key: string; value: string; category: string }[];
    comments: { text: string; user: string }[];
    prices: { label: string; value: number }[];
    fullText: string;
    fullTextLength: number;
    summary: { specsCount: number; commentsCount: number; pricesCount: number; articleLength: number };
    sourceSite: string;
    isCarIr: boolean;
  }
  const [crawlBarResult, setCrawlBarResult] = useState<CrawlBarResult | null>(null);
  const [crawlBarSaving, setCrawlBarSaving] = useState(false);

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

  // Toggle source selection for merge
  const toggleSelect = (src: Source) => {
    // Only processed/approved can be merged (raw pending sources have no AI extraction)
    if (src.status !== "processed" && src.status !== "approved") {
      showToast("فقط منابع پردازش‌شده یا تایید‌شده قابل ترکیب هستند");
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(src.id)) {
        next.delete(src.id);
      } else {
        // Enforce single-car rule
        const first = sources.find((s) => next.has(s.id));
        if (first && first.carId !== src.carId) {
          showToast("فقط منابع یک خودرو قابل ترکیب هستند");
          return prev;
        }
        next.add(src.id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Request merge preview from AI
  const handleMergePreview = async () => {
    if (selectedIds.size < 2) {
      showToast("حداقل ۲ منبع انتخاب کنید");
      return;
    }
    setMergeLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/sources/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: Array.from(selectedIds), apply: false }),
      });
      const data = await res.json();
      if (data.success) {
        setMergePreview(data);
      } else {
        showToast(data.error || "خطا در ترکیب");
      }
    } catch {
      showToast("خطا در اتصال");
    }
    setMergeLoading(false);
  };

  // Apply the previewed merge
  const handleMergeApply = async () => {
    if (!mergePreview) return;
    setMergeApplying(true);
    try {
      const res = await fetchAdmin("/api/admin/sources/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: Array.from(selectedIds), apply: true }),
      });
      const data = await res.json();
      if (data.success && data.applied) {
        showToast(`تحلیل جدید اعمال شد - ${toPersianDigits(data.sourcesApproved)} منبع تایید شد`);
        // Refresh sources
        const updated = await fetchAdmin("/api/admin/sources").then((r) => r.json());
        setSources(updated);
        setMergePreview(null);
        clearSelection();
      } else {
        showToast(data.error || "خطا در اعمال");
      }
    } catch {
      showToast("خطا در اتصال");
    }
    setMergeApplying(false);
  };

  // ── Crawl Bar Handlers ──
  const handleCrawlBar = async () => {
    const url = crawlBarUrl.trim();
    if (!url) return;
    setCrawlBarLoading(true);
    setCrawlBarResult(null);
    setCrawlBarError(null);

    const isCarIr = url.includes("car.ir");

    try {
      if (isCarIr) {
        // Use dedicated car.ir endpoint
        const res = await fetchAdmin("/api/admin/crawlers/car-ir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (data.success) {
          setCrawlBarResult({ ...data, sourceSite: "car.ir", isCarIr: true });
        } else {
          setCrawlBarError(data.error);
        }
      } else {
        // Use generic crawl endpoint (bama, zoomit, etc.)
        const res = await fetchAdmin("/api/admin/sources/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (data.success) {
          setCrawlBarResult({
            carName: data.title || "",
            matchedCarId: data.detectedCarId,
            matchedCarName: data.detectedCarName || "",
            article: data.text || "",
            specs: [],
            comments: [],
            prices: [],
            fullText: data.text || "",
            fullTextLength: data.textLength || 0,
            summary: { specsCount: 0, commentsCount: 0, pricesCount: 0, articleLength: data.textLength || 0 },
            sourceSite: data.sourceSite || "blog",
            isCarIr: false,
          });
        } else {
          setCrawlBarError(data.error);
        }
      }
    } catch {
      setCrawlBarError("خطا در اتصال");
    }
    setCrawlBarLoading(false);
  };

  const saveCrawlAsSource = async (type: "full" | "comments") => {
    if (!crawlBarResult) return;
    setCrawlBarSaving(true);

    const carId = crawlBarResult.matchedCarId || newCarId;
    if (!carId) {
      showToast("ابتدا خودرو را انتخاب کنید");
      setCrawlBarSaving(false);
      return;
    }

    try {
      if (type === "comments" && crawlBarResult.comments.length > 0) {
        let saved = 0;
        for (const c of crawlBarResult.comments) {
          const res = await fetchAdmin("/api/admin/sources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              carId,
              type: "comment",
              sourceSite: crawlBarResult.sourceSite,
              url: crawlBarUrl,
              title: `نظر ${c.user}`,
              rawText: c.text,
            }),
          });
          if (res.ok) saved++;
        }
        showToast(`${toPersianDigits(saved)} کامنت ذخیره شد`);
      } else {
        // Save full text
        const res = await fetchAdmin("/api/admin/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carId,
            type: crawlBarResult.isCarIr ? "article" : "article",
            sourceSite: crawlBarResult.sourceSite,
            url: crawlBarUrl,
            title: crawlBarResult.carName || null,
            rawText: crawlBarResult.fullText,
          }),
        });
        if (res.ok) showToast("متن کامل ذخیره شد");
      }

      // Refresh sources
      const updated = await fetchAdmin("/api/admin/sources").then((r) => r.json());
      setSources(updated);
      setCrawlBarResult(null);
      setCrawlBarUrl("");
    } catch {
      showToast("خطا در ذخیره");
    }
    setCrawlBarSaving(false);
  };

  const filtered = useMemo(() => {
    return sources.filter((s) => {
      if (filterCar !== "all" && s.carId !== filterCar) return false;
      if (filterStatus === "all") return s.status !== "archived"; // exclude archived from "all"
      return s.status === filterStatus;
    });
  }, [sources, filterCar, filterStatus]);

  const stats = useMemo(() => ({
    total: sources.filter((s) => s.status !== "archived").length,
    pending: sources.filter((s) => s.status === "pending").length,
    processed: sources.filter((s) => s.status === "processed").length,
    approved: sources.filter((s) => s.status === "approved").length,
    merged: sources.filter((s) => s.status === "merged").length,
    archived: sources.filter((s) => s.status === "archived").length,
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

  const handleArchive = async (id: string) => {
    await fetchAdmin(`/api/admin/sources/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: "archived" } : s));
    // Remove from selection if it was selected
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showToast("به آرشیو منتقل شد");
  };

  const handleUnarchive = async (id: string) => {
    // Restore to 'processed' if it had AI data, else 'pending'
    const src = sources.find((s) => s.id === id);
    const target = src?.processedSummary ? "processed" : "pending";
    await fetchAdmin(`/api/admin/sources/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: target } : s));
    showToast("بازگردانی شد");
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm("حذف کامل و برگشت‌ناپذیر این منبع؟")) return;
    await fetchAdmin(`/api/admin/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    showToast("منبع برای همیشه حذف شد");
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

      {/* ─── Crawl Bar ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
          </svg>
          <h2 className="text-xs font-black">کرال از وب</h2>
          <span className="text-[9px] text-muted">car.ir · bama.ir · zoomit.ir · هر URL</span>
        </div>

        <div className="flex gap-2">
          <input
            value={crawlBarUrl}
            onChange={(e) => { setCrawlBarUrl(e.target.value); setCrawlBarError(null); }}
            placeholder="https://car.ir/766-mvm-x55-excellent-sport"
            dir="ltr"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none font-mono focus:border-emerald-500/50"
            onKeyDown={(e) => e.key === "Enter" && handleCrawlBar()}
          />
          <button
            onClick={handleCrawlBar}
            disabled={crawlBarLoading || !crawlBarUrl.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            {crawlBarLoading ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> کرال...</>
            ) : (
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" /></svg> کرال</>
            )}
          </button>
        </div>

        {crawlBarError && (
          <div className="mt-2 bg-red-500/5 border border-red-500/15 rounded-lg px-3 py-2 text-[10px] text-red-500 font-bold flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
            {crawlBarError}
          </div>
        )}

        {/* Crawl Results */}
        {crawlBarResult && (
          <div className="mt-3 space-y-2.5">
            {/* Header + match */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">{crawlBarResult.carName || "بدون عنوان"}</span>
                <span className="text-[8px] bg-foreground/5 text-muted px-1.5 py-0.5 rounded-full">{crawlBarResult.sourceSite}</span>
                {crawlBarResult.matchedCarId ? (
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                    {crawlBarResult.matchedCarName}
                  </span>
                ) : (
                  <select
                    value={newCarId}
                    onChange={(e) => setNewCarId(e.target.value)}
                    className="bg-background border border-amber-500/30 rounded-lg px-2 py-1 text-[10px] outline-none max-w-[180px]"
                  >
                    <option value="">انتخاب خودرو...</option>
                    {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa}</option>)}
                  </select>
                )}
              </div>
              <button
                onClick={() => { setCrawlBarResult(null); setCrawlBarUrl(""); }}
                className="text-[9px] text-muted hover:text-foreground"
              >
                بستن
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-2">
              {[
                ...(crawlBarResult.isCarIr ? [
                  { label: "توضیحات", value: crawlBarResult.summary.articleLength > 0 ? `${Math.round(crawlBarResult.summary.articleLength / 100)}00` : "—", color: crawlBarResult.summary.articleLength > 0 ? "text-violet-600" : "text-muted" },
                  { label: "مشخصات", value: String(crawlBarResult.summary.specsCount), color: "text-primary" },
                  { label: "کامنت", value: String(crawlBarResult.summary.commentsCount), color: "text-amber-600" },
                ] : []),
                { label: "حجم متن", value: `${Math.round(crawlBarResult.fullTextLength / 1000)}K`, color: "text-muted" },
              ].map((s) => (
                <div key={s.label} className="bg-background rounded-lg px-2.5 py-1.5 text-center min-w-[55px]">
                  <div className={`text-sm font-black ${s.color}`}>{toPersianDigits(s.value)}</div>
                  <div className="text-[8px] text-muted">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Article preview (car.ir) */}
            {crawlBarResult.article && crawlBarResult.article.length > 0 && (
              <details open>
                <summary className="text-[10px] font-black text-muted cursor-pointer">
                  توضیحات و بررسی ({toPersianDigits(crawlBarResult.article.length)} ک) ▾
                </summary>
                <div className="mt-1 bg-background rounded-lg p-2.5 text-[10px] leading-6 max-h-[150px] overflow-y-auto whitespace-pre-line">
                  {crawlBarResult.article.slice(0, 2000)}
                </div>
              </details>
            )}

            {/* Specs preview (car.ir) */}
            {crawlBarResult.specs.length > 0 && (
              <details>
                <summary className="text-[10px] font-black text-muted cursor-pointer">
                  مشخصات فنی ({toPersianDigits(crawlBarResult.specs.length)}) ▾
                </summary>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 max-h-[150px] overflow-y-auto">
                  {crawlBarResult.specs.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 py-0.5 text-[9px]">
                      <span className="text-muted truncate flex-1">{s.key}:</span>
                      <span className="font-bold text-foreground truncate max-w-[140px]">{s.value}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Comments preview (car.ir) */}
            {crawlBarResult.comments.length > 0 && (
              <details>
                <summary className="text-[10px] font-black text-muted cursor-pointer">
                  کامنت‌ها ({toPersianDigits(crawlBarResult.comments.length)}) ▾
                </summary>
                <div className="mt-1 space-y-1 max-h-[150px] overflow-y-auto">
                  {crawlBarResult.comments.map((c, i) => (
                    <div key={i} className="bg-background rounded-lg px-2 py-1.5">
                      <span className="text-[9px] text-muted">{c.user}: </span>
                      <span className="text-[10px] leading-5">{c.text.slice(0, 200)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Generic crawl preview (non-car.ir) */}
            {!crawlBarResult.isCarIr && crawlBarResult.fullText && (
              <details open>
                <summary className="text-[10px] font-black text-muted cursor-pointer">
                  متن استخراج‌شده ({toPersianDigits(crawlBarResult.fullTextLength)} ک) ▾
                </summary>
                <div className="mt-1 bg-background rounded-lg p-2.5 text-[10px] leading-6 max-h-[150px] overflow-y-auto">
                  {crawlBarResult.fullText.slice(0, 2000)}
                </div>
              </details>
            )}

            {/* Save actions */}
            {(crawlBarResult.matchedCarId || newCarId) && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => saveCrawlAsSource("full")}
                  disabled={crawlBarSaving}
                  className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" /></svg>
                  ذخیره متن کامل
                </button>
                {crawlBarResult.comments.length > 0 && (
                  <button
                    onClick={() => saveCrawlAsSource("comments")}
                    disabled={crawlBarSaving}
                    className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg disabled:opacity-40 flex items-center gap-1"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                    ذخیره {toPersianDigits(crawlBarResult.comments.length)} کامنت
                  </button>
                )}
                <span className="text-[9px] text-muted mr-auto">
                  در منابع «{crawlBarResult.matchedCarName || cars.find((c) => c.id === newCarId)?.nameFa || ""}» ذخیره می‌شود
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          {Object.entries({ all: { label: "همه", count: stats.total }, pending: { label: "انتظار", count: stats.pending }, processed: { label: "پردازش‌شده", count: stats.processed }, approved: { label: "تایید", count: stats.approved }, merged: { label: "ادغام‌شده", count: stats.merged }, archived: { label: "آرشیو", count: stats.archived } }).map(([key, val]) => (
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
          const typeCfg = TYPE_CONFIG[src.type] || TYPE_CONFIG.manual;
          const scores = src.extractedScores ? JSON.parse(src.extractedScores) : null;

          const isSelected = selectedIds.has(src.id);
          const canSelect = src.status === "processed" || src.status === "approved";

          // Determine if this source is "locked" — a different car is already in selection
          const firstSelected = selectedIds.size > 0 ? sources.find((s) => selectedIds.has(s.id)) : null;
          const isLockedByOtherCar = firstSelected != null && firstSelected.carId !== src.carId && !isSelected;

          return (
            <div key={src.id} className={`bg-surface rounded-xl border overflow-hidden transition-all ${
              isSelected ? "border-primary ring-1 ring-primary/30" :
              isLockedByOtherCar ? "border-border/40 opacity-40" :
              src.status === "merged" ? "border-violet-500/20" :
              src.status === "approved" ? "border-accent/20" : "border-border"
            }`}>
              {/* Row */}
              <div onClick={() => setExpandedId(isExpanded ? null : src.id)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-background/30 transition-colors">
                {/* Selection checkbox (only for processed/approved) */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(src); }}
                  disabled={!canSelect || isLockedByOtherCar}
                  title={
                    isLockedByOtherCar ? `فقط منابع ${firstSelected.carName} قابل ترکیب هستند` :
                    canSelect ? "انتخاب برای ترکیب" : "ابتدا منبع را پردازش کنید"
                  }
                  className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected ? "bg-primary border-primary" :
                    isLockedByOtherCar ? "border-border/20 cursor-not-allowed" :
                    canSelect ? "border-border hover:border-primary" : "border-border/30 opacity-30 cursor-not-allowed"
                  }`}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full shrink-0 ${stCfg.bg} ${stCfg.color}`}>{stCfg.label}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{src.carName}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-foreground/5 text-muted">{typeCfg.label}</span>
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
                  {src.status === "archived" ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnarchive(src.id); }}
                        className="px-2 py-1 bg-primary/10 text-primary text-[9px] font-bold rounded-lg flex items-center gap-1"
                        title="بازگردانی از آرشیو"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9M3 12l3-3M3 12l3 3" /></svg>
                        بازگردانی
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleHardDelete(src.id); }}
                        className="px-2 py-1 bg-red-500/10 text-red-500 text-[9px] font-bold rounded-lg flex items-center gap-1"
                        title="حذف برگشت‌ناپذیر"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                        حذف
                      </button>
                    </>
                  ) : (
                    (src.status === "processed" || src.status === "approved" || src.status === "rejected") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(src.id); }}
                        className="px-2 py-1 text-muted hover:text-foreground text-[9px] font-bold rounded-lg flex items-center gap-1"
                        title="انتقال به آرشیو"
                      >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v13H3V8 M1 3h22v5H1z M10 12h4" /></svg>
                        آرشیو
                      </button>
                    )
                  )}

                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-border bg-background/20">

                  {/* Action bar - sticky top */}
                  {src.status !== "approved" && (
                    <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm flex items-center gap-2 px-4 py-2 border-b border-border/50">
                      {src.status === "pending" && (
                        <button onClick={() => handleProcess(src.id)} disabled={!!processingId} className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-50 flex items-center gap-1">
                          {processingId === src.id ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> تحلیل...</> : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> تحلیل عمیق</>}
                        </button>
                      )}
                      {src.status === "processed" && (
                        <>
                          <button onClick={() => handleApply(src.id)} disabled={!!applyingId} className="px-3 py-1.5 bg-accent text-white text-[10px] font-bold rounded-lg disabled:opacity-50 flex items-center gap-1">
                            {applyingId === src.id ? "..." : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg> تایید و اعمال</>}
                          </button>
                          <button onClick={() => handleReject(src.id)} className="px-2 py-1.5 text-[10px] text-danger font-bold">رد</button>
                          <button onClick={() => handleProcess(src.id)} disabled={!!processingId} className="px-2 py-1.5 text-[10px] text-muted font-bold disabled:opacity-50">تحلیل مجدد</button>
                        </>
                      )}
                      <button onClick={() => handleDelete(src.id)} className="px-2 py-1.5 text-muted hover:text-danger text-[10px] mr-auto">حذف</button>
                    </div>
                  )}

                  <div className="px-4 py-3 space-y-3">

                    {/* AI Recommendation - TOP priority */}
                    {scores?.recommendation && (
                      <div className="bg-gradient-to-l from-amber-500/8 to-amber-500/3 border border-amber-500/15 rounded-xl p-3 flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                        <div>
                          <span className="text-[9px] font-black text-amber-700 dark:text-amber-400">توصیه AI: </span>
                          <span className="text-[10px] leading-5">{scores.recommendation}</span>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {src.processedSummary && (
                      <p className="text-[11px] leading-7 text-muted">{src.processedSummary}</p>
                    )}

                    {/* Insights row */}
                    {scores?.newInsights && (scores.newInsights?.length > 0 || scores.confirmedFacts?.length > 0 || scores.contradictions?.length > 0) && (
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                        {scores.newInsights?.map((n: string, i: number) => (
                          <div key={`n${i}`} className="shrink-0 bg-accent/8 border border-accent/15 rounded-lg px-2.5 py-1.5 text-[9px] leading-4 max-w-[200px]">
                            <span className="text-accent font-bold">جدید: </span>{n}
                          </div>
                        ))}
                        {scores.confirmedFacts?.map((f: string, i: number) => (
                          <div key={`f${i}`} className="shrink-0 bg-primary/6 border border-primary/15 rounded-lg px-2.5 py-1.5 text-[9px] leading-4 max-w-[200px]">
                            <span className="text-primary font-bold">تایید: </span>{f}
                          </div>
                        ))}
                        {scores.contradictions?.map((c: string, i: number) => (
                          <div key={`c${i}`} className="shrink-0 bg-danger/6 border border-danger/15 rounded-lg px-2.5 py-1.5 text-[9px] leading-4 max-w-[200px]">
                            <span className="text-danger font-bold">تناقض: </span>{c}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pros & Cons - compact inline */}
                    {(src.extractedPros.length > 0 || src.extractedCons.length > 0) && (
                      <div className="bg-surface rounded-xl border border-border p-3">
                        <div className="grid grid-cols-2 gap-3">
                          {src.extractedPros.length > 0 && (
                            <div>
                              <h5 className="text-[9px] font-black text-accent mb-1">قوت ({toPersianDigits(src.extractedPros.length)})</h5>
                              {src.extractedPros.map((p, i) => (<div key={i} className="flex items-start gap-1 text-[10px] mb-0.5 leading-4"><span className="text-accent font-bold shrink-0">+</span><span className="line-clamp-2">{p}</span></div>))}
                            </div>
                          )}
                          {src.extractedCons.length > 0 && (
                            <div>
                              <h5 className="text-[9px] font-black text-danger mb-1">ضعف ({toPersianDigits(src.extractedCons.length)})</h5>
                              {src.extractedCons.map((c, i) => (<div key={i} className="flex items-start gap-1 text-[10px] mb-0.5 leading-4"><span className="text-danger font-bold shrink-0">-</span><span className="line-clamp-2">{c}</span></div>))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Scores - only show changed ones */}
                    {scores?.scores && (() => {
                      const entries = Object.entries(scores.scores as Record<string, { old: number; new: number; reason: string; changed: boolean }>);
                      const changed = entries.filter(([, v]) => v.changed);
                      const unchanged = entries.filter(([, v]) => !v.changed);
                      return (
                        <div className="bg-surface rounded-xl border border-border p-3">
                          <h5 className="text-[9px] font-black mb-2">امتیازات ({toPersianDigits(changed.length)} تغییر از {toPersianDigits(entries.length)})</h5>
                          {changed.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {changed.map(([key, val]) => (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold w-20 shrink-0">{key}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-muted">{toPersianDigits(val.old)}</span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    <span className={`text-[11px] font-black ${val.new > val.old ? "text-accent" : "text-danger"}`}>{toPersianDigits(val.new)}</span>
                                    <span className={`text-[8px] ${val.new > val.old ? "text-accent" : "text-danger"}`}>({val.new > val.old ? "+" : ""}{toPersianDigits(val.new - val.old)})</span>
                                  </div>
                                  {val.reason && <span className="text-[8px] text-muted flex-1 truncate" title={val.reason}>{val.reason}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {unchanged.length > 0 && (
                            <details>
                              <summary className="text-[9px] text-muted cursor-pointer">{toPersianDigits(unchanged.length)} بدون تغییر</summary>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {unchanged.map(([key, val]) => (
                                  <span key={key} className="text-[8px] bg-background px-1.5 py-0.5 rounded text-muted">{key}: {toPersianDigits(val.old)}</span>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })()}

                    {/* Raw text - collapsed */}
                    <details>
                      <summary className="text-[9px] text-muted cursor-pointer">متن خام ({toPersianDigits(src.rawTextFull.length)} کاراکتر)</summary>
                      <div className="bg-background rounded-lg p-3 text-[10px] leading-5 max-h-[150px] overflow-y-auto mt-1">{src.rawTextFull}</div>
                      {src.url && <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline mt-1 inline-block" dir="ltr">{src.url}</a>}
                    </details>

                    {/* Approved status */}
                    {src.status === "approved" && (
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-[10px] text-accent font-bold flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                          اعمال شده {src.appliedAt && `- ${new Date(src.appliedAt).toLocaleDateString("fa-IR")}`}
                        </span>
                        <button onClick={() => handleDelete(src.id)} className="text-[9px] text-muted hover:text-danger">حذف</button>
                      </div>
                    )}
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
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select value={newSite} onChange={(e) => setNewSite(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                    {Object.entries(SITE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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

      {/* ─── Merge Floating Bar ─── */}
      {selectedIds.size > 0 && !mergePreview && (() => {
        const selectedCarName = sources.find((s) => selectedIds.has(s.id))?.carName || "";
        return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background rounded-2xl shadow-2xl z-40 flex items-center gap-3 pr-4 pl-2 py-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xs font-black text-white">{toPersianDigits(selectedIds.size)}</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold">منبع برای ترکیب</span>
              {selectedCarName && <span className="text-[9px] text-background/60">{selectedCarName}</span>}
            </div>
          </div>
          <div className="h-6 w-px bg-background/20" />
          <button
            onClick={handleMergePreview}
            disabled={mergeLoading || selectedIds.size < 2}
            className="px-3 py-1.5 bg-primary text-white text-[11px] font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5"
          >
            {mergeLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                در حال ترکیب با AI...
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                پیش‌نمایش ترکیب
              </>
            )}
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 text-background/60 hover:text-background"
            title="لغو انتخاب"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        );
      })()}

      {/* ─── Merge Preview Modal ─── */}
      {mergePreview && (() => {
        // Compute aggregated diff stats for the header summary
        const textFields = [
          { key: "overallSummary", label: "جمع‌بندی کلی" },
          { key: "whyBuy",         label: "چرا بخری" },
          { key: "whyNotBuy",      label: "چرا نخری" },
          { key: "ownerVerdict",   label: "نظر مالکان" },
        ] as const;

        const arrayFields = [
          { key: "frequentPros",     label: "نقاط قوت پرتکرار",   tone: "emerald" },
          { key: "frequentCons",     label: "نقاط ضعف پرتکرار",   tone: "red" },
          { key: "commonIssues",     label: "خرابی‌های رایج",     tone: "amber" },
          { key: "purchaseWarnings", label: "هشدارهای خرید",      tone: "rose" },
        ] as const;

        let textChanged = 0;
        let totalAdded = 0;
        let totalRemoved = 0;

        for (const tf of textFields) {
          const d = mergePreview.diff[tf.key];
          if ((d.old || "").trim() !== (d.new || "").trim()) textChanged++;
        }
        for (const af of arrayFields) {
          const d = mergePreview.diff[af.key];
          const arr = diffArrays(d.old, d.new);
          totalAdded += arr.added.length;
          totalRemoved += arr.removed.length;
        }
        const scoresChanged = mergePreview.diff.scoresChanged;

        return (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => !mergeApplying && setMergePreview(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl z-50 shadow-2xl w-[900px] max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black">پیش‌نمایش تحلیل ترکیبی</h3>
                  <p className="text-[10px] text-muted">
                    {mergePreview.carName} · {toPersianDigits(mergePreview.sourcesUsed.length)} منبع ترکیب شد
                  </p>
                </div>
              </div>
              <button onClick={() => setMergePreview(null)} disabled={mergeApplying} className="w-7 h-7 rounded-lg hover:bg-background text-muted hover:text-foreground flex items-center justify-center disabled:opacity-30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">

              {/* ─── Stats Summary ─── */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5">
                  <div className="text-[9px] text-muted mb-0.5">متن‌های تغییر کرده</div>
                  <div className="text-lg font-black text-amber-600">{toPersianDigits(textChanged)}<span className="text-[10px] text-muted font-normal"> از {toPersianDigits(textFields.length)}</span></div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5">
                  <div className="text-[9px] text-muted mb-0.5">آیتم‌های اضافه‌شده</div>
                  <div className="text-lg font-black text-emerald-600">+{toPersianDigits(totalAdded)}</div>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-2.5">
                  <div className="text-[9px] text-muted mb-0.5">آیتم‌های حذف‌شده</div>
                  <div className="text-lg font-black text-red-500">-{toPersianDigits(totalRemoved)}</div>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5">
                  <div className="text-[9px] text-muted mb-0.5">امتیازات تغییر کرده</div>
                  <div className="text-lg font-black text-primary">{toPersianDigits(scoresChanged)}<span className="text-[10px] text-muted font-normal"> از ۱۴</span></div>
                </div>
              </div>

              {/* Merge reasoning */}
              {mergePreview.mergeReasoning && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-primary mb-1 flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    منطق ترکیب AI
                  </div>
                  <p className="text-[11px] leading-6 text-foreground">{mergePreview.mergeReasoning}</p>
                </div>
              )}

              {/* Sources used */}
              <div>
                <h4 className="text-[10px] font-black text-muted mb-1.5">منابع مشارکت‌کننده</h4>
                <div className="flex flex-wrap gap-1.5">
                  {mergePreview.sourcesUsed.map((s) => (
                    <span key={s.id} className="text-[9px] bg-background border border-border rounded-full px-2 py-0.5 flex items-center gap-1">
                      <span className="font-bold">{TYPE_CONFIG[s.type]?.label || s.type}</span>
                      <span className="text-muted/60">·</span>
                      <span className="text-muted">{s.sourceSite}</span>
                      <span className="text-muted/60">·</span>
                      <span className="text-muted">{toPersianDigits(s.textLength)} ک</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* ─── Text Fields Section ─── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" />
                  </svg>
                  <h3 className="text-[11px] font-black">متن‌های جمع‌بندی</h3>
                  <span className="text-[9px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                    {toPersianDigits(textChanged)} تغییر
                  </span>
                </div>
                <div className="space-y-2.5">
                  {textFields.map(({ key, label }) => {
                    const diff = mergePreview.diff[key];
                    const hasOld = diff.old && diff.old.trim().length > 0;
                    const isSame = (diff.old || "").trim() === (diff.new || "").trim();

                    // Case 1: empty before → full-width new card
                    if (!hasOld) {
                      return (
                        <div key={key} className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-bold text-foreground">{label}</span>
                            <span className="text-[8px] bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">جدید</span>
                          </div>
                          <p className="text-[11px] leading-6 text-foreground">{diff.new || "—"}</p>
                        </div>
                      );
                    }

                    // Case 2: unchanged
                    if (isSame) {
                      return (
                        <div key={key} className="bg-background/30 border border-border/50 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold text-muted/80">{label}</span>
                            <span className="text-[8px] bg-muted/10 text-muted px-1.5 py-0.5 rounded-full">بدون تغییر</span>
                          </div>
                          <p className="text-[10px] leading-5 text-muted/70 line-clamp-2">{diff.old}</p>
                        </div>
                      );
                    }

                    // Case 3: changed → sentence-level diff
                    const sent = diffSentences(diff.old, diff.new);
                    return (
                      <div key={key} className="bg-surface border border-amber-500/30 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-foreground">{label}</span>
                          <span className="text-[8px] bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">تغییر</span>
                          <span className="text-[8px] text-muted/80">
                            +{toPersianDigits(sent.added.length)} / -{toPersianDigits(sent.removed.length)} / ={toPersianDigits(sent.same.length)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {sent.added.map((s, i) => (
                            <div key={`a${i}`} className="flex items-start gap-1.5 text-[10px] leading-5">
                              <span className="text-emerald-600 font-black shrink-0">+</span>
                              <span className="text-emerald-700 dark:text-emerald-400 flex-1">{s}</span>
                            </div>
                          ))}
                          {sent.removed.map((s, i) => (
                            <div key={`r${i}`} className="flex items-start gap-1.5 text-[10px] leading-5">
                              <span className="text-red-500 font-black shrink-0">−</span>
                              <span className="text-red-500/80 line-through flex-1">{s}</span>
                            </div>
                          ))}
                          {sent.same.length > 0 && (
                            <details className="mt-1">
                              <summary className="text-[9px] text-muted cursor-pointer hover:text-foreground">
                                {toPersianDigits(sent.same.length)} جمله بدون تغییر
                              </summary>
                              <div className="space-y-0.5 mt-1 pr-3">
                                {sent.same.map((s, i) => (
                                  <div key={`s${i}`} className="flex items-start gap-1.5 text-[10px] leading-5">
                                    <span className="text-muted/60 shrink-0">=</span>
                                    <span className="text-muted/70 flex-1">{s}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── Array Fields Section ─── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                    <path d="M8 6h13M8 12h13M8 18h13 M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                  <h3 className="text-[11px] font-black">لیست‌ها</h3>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">+{toPersianDigits(totalAdded)}</span>
                  <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">-{toPersianDigits(totalRemoved)}</span>
                </div>
                <div className="space-y-2">
                  {arrayFields.map(({ key, label, tone }) => {
                    const diff = mergePreview.diff[key];
                    const arr = diffArrays(diff.old, diff.new);
                    const toneText = tone === "emerald" ? "text-emerald-600" :
                                     tone === "red" ? "text-red-500" :
                                     tone === "amber" ? "text-amber-600" : "text-rose-500";

                    const isEmpty = arr.added.length === 0 && arr.removed.length === 0 && arr.same.length === 0;
                    if (isEmpty) return null;

                    return (
                      <div key={key} className="bg-background/30 border border-border/60 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-black ${toneText}`}>{label}</span>
                          <div className="flex gap-1">
                            {arr.added.length > 0 && (
                              <span className="text-[8px] bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">
                                +{toPersianDigits(arr.added.length)} اضافه
                              </span>
                            )}
                            {arr.removed.length > 0 && (
                              <span className="text-[8px] bg-red-500/15 text-red-500 px-1.5 py-0.5 rounded-full font-bold">
                                -{toPersianDigits(arr.removed.length)} حذف
                              </span>
                            )}
                            {arr.same.length > 0 && (
                              <span className="text-[8px] bg-muted/10 text-muted px-1.5 py-0.5 rounded-full">
                                {toPersianDigits(arr.same.length)} ثابت
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          {arr.added.map((item, i) => (
                            <div key={`a${i}`} className="flex items-start gap-1.5 text-[10px] leading-5 bg-emerald-500/5 rounded px-2 py-1">
                              <span className="text-emerald-600 font-black shrink-0">+</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex-1">{item}</span>
                            </div>
                          ))}
                          {arr.removed.map((item, i) => (
                            <div key={`r${i}`} className="flex items-start gap-1.5 text-[10px] leading-5 bg-red-500/5 rounded px-2 py-1">
                              <span className="text-red-500 font-black shrink-0">−</span>
                              <span className="text-red-500/80 line-through flex-1">{item}</span>
                            </div>
                          ))}
                          {arr.same.length > 0 && (
                            <details>
                              <summary className="text-[9px] text-muted cursor-pointer hover:text-foreground px-2 py-0.5">
                                نمایش {toPersianDigits(arr.same.length)} آیتم بدون تغییر
                              </summary>
                              <div className="space-y-0.5 mt-0.5">
                                {arr.same.map((item, i) => (
                                  <div key={`s${i}`} className="flex items-start gap-1.5 text-[10px] leading-5 px-2 py-0.5">
                                    <span className="text-muted/60 shrink-0">=</span>
                                    <span className="text-muted/70 flex-1">{item}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ─── Scores Section ─── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <h3 className="text-[11px] font-black">امتیازات</h3>
                  {scoresChanged > 0 && (
                    <span className="text-[9px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                      {toPersianDigits(scoresChanged)} تغییر
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(mergePreview.diff.scores).map(([key, s]) => {
                    const delta = s.new - s.old;
                    const deltaColor = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted";
                    return (
                      <div key={key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${s.changed ? "bg-amber-500/5 border border-amber-500/20" : "bg-background/30 border border-border/40"}`}>
                        <span className="text-[9px] text-muted w-20 shrink-0">{key}</span>
                        {/* Dual bar */}
                        <div className="flex-1 flex items-center gap-1">
                          <div className="flex-1 h-1.5 bg-background rounded-full relative overflow-hidden">
                            <div className="absolute inset-y-0 right-0 bg-muted/40 rounded-full" style={{ width: `${s.old * 10}%` }} />
                            {s.changed && (
                              <div
                                className={`absolute inset-y-0 right-0 ${delta > 0 ? "bg-emerald-500" : "bg-red-500"} rounded-full`}
                                style={{ width: `${s.new * 10}%`, opacity: 0.8 }}
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <span className="text-[9px] text-muted">{toPersianDigits(s.old)}</span>
                          {s.changed && (
                            <>
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/50">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                              <span className={`text-[10px] font-black ${deltaColor}`}>{toPersianDigits(s.new)}</span>
                              <span className={`text-[8px] font-bold ${deltaColor}`}>
                                ({delta > 0 ? "+" : ""}{toPersianDigits(delta)})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Owner satisfaction + Purchase risk */}
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {([
                    { key: "ownerSatisfaction", label: "رضایت مالکان", positive: true },
                    { key: "purchaseRisk", label: "ریسک خرید", positive: false },
                  ] as const).map(({ key, label, positive }) => {
                    const d = mergePreview.diff[key];
                    const changed = d.old !== d.new;
                    const delta = d.new - d.old;
                    const goodChange = positive ? delta > 0 : delta < 0;
                    const deltaColor = !changed ? "text-muted" : goodChange ? "text-emerald-600" : "text-red-500";
                    return (
                      <div key={key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${changed ? "bg-amber-500/5 border border-amber-500/20" : "bg-background/30 border border-border/40"}`}>
                        <span className="text-[9px] text-muted flex-1">{label}</span>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[9px] text-muted">{toPersianDigits(d.old)}</span>
                          {changed && (
                            <>
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/50">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                              <span className={`text-[10px] font-black ${deltaColor}`}>{toPersianDigits(d.new)}</span>
                              <span className={`text-[8px] font-bold ${deltaColor}`}>
                                ({delta > 0 ? "+" : ""}{toPersianDigits(delta)})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-background/30">
              <button
                onClick={() => setMergePreview(null)}
                disabled={mergeApplying}
                className="px-4 py-2 text-[11px] font-bold text-muted hover:text-foreground disabled:opacity-30"
              >
                انصراف
              </button>
              <div className="mr-auto flex items-center gap-2">
                <span className="text-[10px] text-muted">
                  این تحلیل جایگزین intel فعلی می‌شود و منابع تایید می‌شوند
                </span>
                <button
                  onClick={handleMergeApply}
                  disabled={mergeApplying}
                  className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5 shadow-sm shadow-primary/20"
                >
                  {mergeApplying ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      در حال اعمال...
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      تایید و جایگزینی
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
        );
      })()}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

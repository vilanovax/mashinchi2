"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../../../layout";

interface TypeBreakdown {
  type: string;
  total: number;
  pending: number;
  processed: number;
  approved: number;
  rejected: number;
  totalChars: number;
  needed: number;
  gap: number;
}

interface SourceItem {
  id: string;
  type: string;
  sourceSite: string;
  url: string | null;
  title: string | null;
  rawTextPreview: string;
  rawTextLength: number;
  status: string;
  processedSummary: string | null;
  extractedPros: string[];
  extractedCons: string[];
  extractedIssues: string[];
  createdAt: string;
  appliedAt: string | null;
}

interface RawAnalysisItem {
  id: string;
  status: string;
  version: number;
  sourceLabel: string | null;
  prosCount: number;
  consCount: number;
  problemsCount: number;
  processedAt: string | null;
  createdAt: string;
}

interface InventoryData {
  car: {
    id: string;
    nameFa: string;
    nameEn: string;
    brandFa: string;
    origin: string;
    category: string;
    imageUrl: string | null;
  };
  summary: {
    totalSources: number;
    approvedSources: number;
    totalChars: number;
    rawAnalysesCount: number;
    processedAnalysesCount: number;
    coverageHealth: number;
    typesMet: number;
    typesTotal: number;
    missingTypes: string[];
  };
  byType: TypeBreakdown[];
  sources: SourceItem[];
  rawAnalyses: RawAnalysisItem[];
}

const TYPE_META: Record<string, { label: string; short: string; icon: string }> = {
  comment:    { label: "تجربه کاربری", short: "تجربه",    icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  article:    { label: "مقاله",        short: "مقاله",    icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" },
  review:     { label: "ریویو تخصصی",  short: "ریویو",    icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  video:      { label: "ویدیو",        short: "ویدیو",    icon: "M23 7l-7 5 7 5V7z M14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z" },
  comparison: { label: "مقایسه",       short: "مقایسه",   icon: "M16 3h5v5 M4 20L21 3 M21 16v5h-5 M15 15l6 6 M4 4l5 5" },
  forum:      { label: "فروم",         short: "فروم",     icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  expert:     { label: "نظر کارشناس",  short: "کارشناس",  icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z" },
  manual:     { label: "دستی",         short: "دستی",     icon: "M12 20h9 M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" },
};

// Types displayed in the strip (manual is hidden — used only as fallback)
const VISIBLE_TYPES = ["comment", "article", "review", "video", "comparison", "forum", "expert"];

const SITE_OPTIONS = [
  { value: "manual",   label: "دستی" },
  { value: "bama",     label: "باما" },
  { value: "divar",    label: "دیوار" },
  { value: "zoomit",   label: "زومیت" },
  { value: "charkhan", label: "چرخان" },
  { value: "youtube",  label: "یوتیوب" },
  { value: "aparat",   label: "آپارات" },
  { value: "blog",     label: "بلاگ" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: "در انتظار",  color: "bg-amber-500/10 text-amber-600" },
  processed: { label: "پردازش‌شده", color: "bg-primary/10 text-primary" },
  approved:  { label: "تایید‌شده",  color: "bg-emerald-500/10 text-emerald-600" },
  rejected:  { label: "رد‌شده",     color: "bg-red-500/10 text-red-500" },
};

// Compute card visual state
function typeState(tb: TypeBreakdown): "empty" | "partial" | "complete" {
  if (tb.total === 0) return "empty";
  if (tb.needed > 0 && tb.total < tb.needed) return "partial";
  return "complete";
}

// Smart default site based on source type
function defaultSiteForType(type: string): string {
  switch (type) {
    case "video":      return "youtube";
    case "review":     return "zoomit";
    case "expert":     return "zoomit";
    case "article":    return "blog";
    case "comparison": return "zoomit";
    case "forum":      return "blog";
    case "comment":    return "manual";
    default:           return "manual";
  }
}

// Auto-detect site and type from URL domain
function detectFromUrl(url: string): { site: string; type?: string } | null {
  if (!url || !url.trim()) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host.includes("youtube.com") || host === "youtu.be") return { site: "youtube", type: "video" };
    if (host.includes("aparat.com"))                          return { site: "aparat", type: "video" };
    if (host.includes("zoomit.ir"))                           return { site: "zoomit", type: "review" };
    if (host.includes("bama.ir"))                             return { site: "bama", type: "comment" };
    if (host.includes("divar.ir"))                            return { site: "divar", type: "comment" };
    if (host.includes("charkhan"))                            return { site: "charkhan", type: "review" };
    if (host.includes("digikala.com"))                        return { site: "blog", type: "article" };
    return { site: "blog" };
  } catch {
    return null;
  }
}

// Count words (Persian + English)
function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const STATE_STYLES = {
  empty:    { card: "bg-surface border-dashed border-border/60",     icon: "text-muted/40",   num: "text-muted/40",   ring: "" },
  partial:  { card: "bg-amber-500/5 border-amber-500/20",            icon: "text-amber-500",  num: "text-amber-600",  ring: "" },
  complete: { card: "bg-emerald-500/5 border-emerald-500/20",        icon: "text-emerald-500",num: "text-emerald-600",ring: "" },
};

export default function CarDataInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { fetchAdmin } = useAdmin();
  const router = useRouter();

  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Quick paste form
  const [showPaste, setShowPaste] = useState(false);
  const [pasteType, setPasteType] = useState<string>("comment");
  const [pasteSite, setPasteSite] = useState<string>("manual");
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteSaving, setPasteSaving] = useState<"idle" | "save" | "saveProcess">("idle");
  const [pasteSiteManuallySet, setPasteSiteManuallySet] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const loadData = useCallback(() => {
    fetchAdmin(`/api/admin/cars/${id}/data-inventory`)
      .then((r) => r.json())
      .then((d: InventoryData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [fetchAdmin, id]);

  useEffect(() => { loadData(); }, [loadData]);

  const openPaste = (type?: string) => {
    if (type) {
      setPasteType(type);
      if (!pasteSiteManuallySet) setPasteSite(defaultSiteForType(type));
    }
    setShowPaste(true);
  };

  const handleTypeChange = (type: string) => {
    setPasteType(type);
    if (!pasteSiteManuallySet) setPasteSite(defaultSiteForType(type));
  };

  const handleUrlChange = (url: string) => {
    setPasteUrl(url);
    const detected = detectFromUrl(url);
    if (detected) {
      if (!pasteSiteManuallySet) setPasteSite(detected.site);
      if (detected.type) setPasteType(detected.type);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        showToast("کلیپ‌بورد خالی است");
        return;
      }
      // If the clipboard starts with a URL, pull it out into the URL field
      const urlMatch = text.match(/^\s*(https?:\/\/\S+)/);
      if (urlMatch && !pasteUrl) {
        handleUrlChange(urlMatch[1]);
        setPasteText(text.replace(urlMatch[0], "").trim());
      } else {
        setPasteText(text);
      }
      showToast(`${toPersianDigits(text.length)} کاراکتر چسبانده شد`);
    } catch {
      showToast("دسترسی به کلیپ‌بورد رد شد");
    }
  };

  const resetPasteForm = () => {
    setPasteText("");
    setPasteUrl("");
    setShowPaste(false);
    setPasteSiteManuallySet(false);
  };

  const handleSavePaste = async (alsoProcess: boolean) => {
    if (!pasteText.trim()) {
      showToast("متن خالی است");
      return;
    }
    setPasteSaving(alsoProcess ? "saveProcess" : "save");
    try {
      const res = await fetchAdmin("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: id,
          type: pasteType,
          sourceSite: pasteSite,
          url: pasteUrl || null,
          title: null,
          rawText: pasteText,
        }),
      });
      if (!res.ok) {
        showToast("خطا در ذخیره");
        setPasteSaving("idle");
        return;
      }
      const saved = await res.json();

      if (alsoProcess && saved?.id) {
        showToast("ذخیره شد، در حال پردازش با AI...");
        try {
          const pres = await fetchAdmin(`/api/admin/sources/${saved.id}/process`, { method: "POST" });
          const pd = await pres.json();
          if (pd.success) {
            showToast("منبع ذخیره و پردازش شد");
          } else {
            showToast(`ذخیره شد ولی پردازش خطا: ${pd.error || ""}`);
          }
        } catch {
          showToast("ذخیره شد ولی پردازش ناموفق");
        }
      } else {
        showToast(`منبع ${TYPE_META[pasteType]?.label} ذخیره شد`);
      }

      resetPasteForm();
      loadData();
    } catch {
      showToast("خطا در اتصال");
    }
    setPasteSaving("idle");
  };

  const handleProcess = async (sourceId: string) => {
    showToast("در حال پردازش...");
    try {
      const res = await fetchAdmin(`/api/admin/sources/${sourceId}/process`, { method: "POST" });
      const d = await res.json();
      if (d.success) {
        showToast("پردازش موفق");
        loadData();
      } else {
        showToast(d.error || "خطا");
      }
    } catch { showToast("خطا"); }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm("حذف این منبع؟")) return;
    await fetchAdmin(`/api/admin/sources/${sourceId}`, { method: "DELETE" });
    showToast("حذف شد");
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-muted">دیتایی پیدا نشد</div>;

  const { car, summary, byType, sources, rawAnalyses } = data;
  const filteredSources = filterType === "all" ? sources : sources.filter((s) => s.type === filterType);

  // Visible types breakdown (excluding manual)
  const visibleByType = VISIBLE_TYPES
    .map((t) => byType.find((b) => b.type === t))
    .filter((b): b is TypeBreakdown => Boolean(b));

  // Empty types for Quick Add chips (those with needed > 0 and total = 0)
  const quickAddTypes = visibleByType.filter((tb) => tb.total === 0 && tb.needed > 0).slice(0, 4);

  const healthRingColor =
    summary.coverageHealth >= 70 ? "#10b981" :
    summary.coverageHealth >= 40 ? "#f59e0b" : "#ef4444";

  const healthTextColor =
    summary.coverageHealth >= 70 ? "text-emerald-500" :
    summary.coverageHealth >= 40 ? "text-amber-500" : "text-red-500";

  return (
    <div className="p-5 max-w-6xl">
      {/* ─── Header bar ─── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.push(`/admin/cars/${id}`)}
            className="p-1 text-muted hover:text-foreground"
            title="بازگشت"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          {car.imageUrl && (
            <img src={car.imageUrl} alt={car.nameFa} className="w-10 h-7 object-cover rounded-md border border-border" />
          )}
          <div>
            <h1 className="text-base font-black flex items-center gap-1.5">
              {car.nameFa}
              <span className="text-[9px] text-muted font-normal bg-foreground/5 px-1.5 py-0.5 rounded">انبار دیتای خام</span>
            </h1>
            <p className="text-[10px] text-muted">{car.brandFa} · {car.nameEn}</p>
          </div>
        </div>
        <button
          onClick={() => openPaste()}
          className="px-3.5 py-2 bg-primary text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 shadow-sm shadow-primary/20"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 4v16m8-8H4" />
          </svg>
          افزودن متن خام
        </button>
      </div>

      {/* ─── Hero: Health Ring + Inline Stats ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center gap-5">
          {/* Health ring */}
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border-color, currentColor)" strokeWidth="2.5" className="text-border opacity-30" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                stroke={healthRingColor} strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={`${summary.coverageHealth * 0.975} 100`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black leading-none ${healthTextColor}`}>
                {toPersianDigits(summary.coverageHealth)}
              </span>
              <span className="text-[8px] text-muted leading-none mt-0.5">٪ پوشش</span>
            </div>
          </div>

          {/* Stats inline */}
          <div className="flex-1 grid grid-cols-4 gap-3">
            <Stat label="کل منابع"   value={toPersianDigits(summary.totalSources)} sub={`${toPersianDigits(summary.approvedSources)} تایید`} />
            <Stat label="حجم متن"    value={summary.totalChars > 1000 ? toPersianDigits(Math.round(summary.totalChars / 1000)) + "K" : toPersianDigits(summary.totalChars)} sub="کاراکتر" />
            <Stat label="JSON خام"   value={toPersianDigits(summary.rawAnalysesCount)} sub={`${toPersianDigits(summary.processedAnalysesCount)} پردازش‌شده`} />
            <Stat label="نوع پوشش"   value={`${toPersianDigits(summary.typesMet)}/${toPersianDigits(summary.typesTotal)}`} sub={summary.missingTypes.length > 0 ? `${toPersianDigits(summary.missingTypes.length)} گم‌شده` : "کامل"} subColor={summary.missingTypes.length > 0 ? "text-red-500" : "text-emerald-500"} />
          </div>
        </div>

        {/* Quick add chips for empty types */}
        {quickAddTypes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-[10px] text-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                <path d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 004.99 19z" />
              </svg>
              <span className="font-bold">برای شروع نیاز:</span>
            </div>
            {quickAddTypes.map((tb) => (
              <button
                key={tb.type}
                onClick={() => openPaste(tb.type)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/20 hover:bg-primary/15 transition-colors flex items-center gap-1"
              >
                <span className="text-[11px] leading-none">+</span>
                {TYPE_META[tb.type]?.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Type Strip (compact) ─── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-black text-muted">منابع به تفکیک نوع</h3>
          {filterType !== "all" && (
            <button
              onClick={() => setFilterType("all")}
              className="text-[10px] text-primary font-bold"
            >
              نمایش همه ↻
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {visibleByType.map((tb) => {
            const meta = TYPE_META[tb.type];
            const state = typeState(tb);
            const styles = STATE_STYLES[state];
            const isActive = filterType === tb.type;

            return (
              <button
                key={tb.type}
                onClick={() => {
                  if (tb.total === 0) {
                    openPaste(tb.type);
                  } else {
                    setFilterType(isActive ? "all" : tb.type);
                  }
                }}
                title={`${meta?.label} - ${toPersianDigits(tb.total)} منبع`}
                className={`relative text-center px-2 py-2.5 rounded-xl border transition-all ${styles.card} ${
                  isActive ? "ring-2 ring-primary/40 scale-[1.02]" : "hover:scale-[1.03]"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`mx-auto mb-1 ${styles.icon}`}>
                  <path d={meta?.icon} />
                </svg>
                <div className={`text-base font-black leading-none ${styles.num}`}>
                  {toPersianDigits(tb.total)}
                </div>
                <div className={`text-[9px] mt-1 ${state === "empty" ? "text-muted/60" : "text-muted"}`}>
                  {meta?.short}
                </div>
                {/* approved indicator */}
                {tb.approved > 0 && (
                  <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                {/* pending indicator */}
                {tb.pending > 0 && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Sources List ─── */}
      <div className="mb-4">
        {filterType !== "all" && (
          <div className="text-[10px] text-muted mb-2 flex items-center gap-1.5">
            <span>فیلتر:</span>
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold">
              {TYPE_META[filterType]?.label} ({toPersianDigits(filteredSources.length)})
            </span>
          </div>
        )}

        {filteredSources.length === 0 ? (
          <div className="bg-surface rounded-xl border border-dashed border-border/60 py-10 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-primary/8 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" />
              </svg>
            </div>
            <p className="text-xs text-foreground font-bold mb-1">
              {filterType === "all" ? "هیچ منبعی برای این خودرو ثبت نشده" : `هیچ ${TYPE_META[filterType]?.label} ثبت نشده`}
            </p>
            <p className="text-[10px] text-muted mb-3">برای شروع، یک متن خام (نظر، مقاله، ریویو…) را پیست کن</p>
            <button
              onClick={() => openPaste(filterType !== "all" ? filterType : undefined)}
              className="px-3.5 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg"
            >
              + افزودن متن خام
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredSources.map((src) => {
              const meta = TYPE_META[src.type] || TYPE_META.manual;
              const isExpanded = expandedSource === src.id;
              const stCfg = STATUS_LABELS[src.status] || STATUS_LABELS.pending;

              return (
                <div key={src.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                  <div
                    onClick={() => setExpandedSource(isExpanded ? null : src.id)}
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-background/30"
                  >
                    <div className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                        <path d={meta.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-foreground">{meta.label}</span>
                        <span className="text-muted/40">·</span>
                        <span className="text-[9px] text-muted">{src.sourceSite}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${stCfg.color}`}>{stCfg.label}</span>
                        {src.title && <span className="text-[10px] text-muted truncate">{src.title}</span>}
                      </div>
                      <p className="text-[10px] text-muted truncate mt-0.5">{src.rawTextPreview}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-[9px] text-muted">{toPersianDigits(src.rawTextLength)} ک</div>
                      <div className="text-[8px] text-muted/60">{new Date(src.createdAt).toLocaleDateString("fa-IR")}</div>
                    </div>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-background/20 px-3 py-2.5 space-y-2">
                      {src.processedSummary && (
                        <p className="text-[11px] leading-6 text-foreground">{src.processedSummary}</p>
                      )}
                      {(src.extractedPros.length > 0 || src.extractedCons.length > 0) && (
                        <div className="grid grid-cols-2 gap-2">
                          {src.extractedPros.length > 0 && (
                            <div>
                              <div className="text-[9px] font-bold text-emerald-600 mb-1">قوت ({toPersianDigits(src.extractedPros.length)})</div>
                              {src.extractedPros.slice(0, 5).map((p, i) => (
                                <div key={i} className="text-[10px] text-foreground line-clamp-1">+ {p}</div>
                              ))}
                            </div>
                          )}
                          {src.extractedCons.length > 0 && (
                            <div>
                              <div className="text-[9px] font-bold text-red-500 mb-1">ضعف ({toPersianDigits(src.extractedCons.length)})</div>
                              {src.extractedCons.slice(0, 5).map((c, i) => (
                                <div key={i} className="text-[10px] text-foreground line-clamp-1">- {c}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        {src.status === "pending" && (
                          <button
                            onClick={() => handleProcess(src.id)}
                            className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded-lg"
                          >
                            پردازش با AI
                          </button>
                        )}
                        {src.url && (
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary font-bold" dir="ltr">
                            لینک منبع ↗
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(src.id)}
                          className="text-[10px] text-muted hover:text-red-500 mr-auto"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Raw Analyses Section ─── */}
      {rawAnalyses.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[11px] font-black text-muted mb-2">تحلیل‌های خام JSON</h3>
          <div className="space-y-1.5">
            {rawAnalyses.map((ra) => {
              const stCfg = STATUS_LABELS[ra.status] || STATUS_LABELS.pending;
              return (
                <div key={ra.id} className="bg-surface rounded-xl border border-border px-3 py-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold">v{toPersianDigits(ra.version)}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${stCfg.color}`}>{stCfg.label}</span>
                      {ra.sourceLabel && <span className="text-[10px] text-muted">{ra.sourceLabel}</span>}
                    </div>
                    <div className="text-[9px] text-muted mt-0.5">
                      {toPersianDigits(ra.prosCount)} مزیت · {toPersianDigits(ra.consCount)} عیب · {toPersianDigits(ra.problemsCount)} مشکل
                    </div>
                  </div>
                  <div className="text-[8px] text-muted/60">{new Date(ra.createdAt).toLocaleDateString("fa-IR")}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Quick Paste Modal ─── */}
      {showPaste && (() => {
        const isBusy = pasteSaving !== "idle";
        const charCount = pasteText.length;
        const wordCount = countWords(pasteText);
        const detectedSite = SITE_OPTIONS.find((s) => s.value === pasteSite);

        return (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => !isBusy && resetPasteForm()} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl z-50 shadow-2xl w-[720px] max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black leading-tight">افزودن متن خام</h3>
                    <p className="text-[10px] text-muted">برای {car.nameFa}</p>
                  </div>
                </div>
                <button onClick={resetPasteForm} disabled={isBusy} className="w-7 h-7 rounded-lg hover:bg-background text-muted hover:text-foreground flex items-center justify-center disabled:opacity-30">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-3 overflow-y-auto flex-1">
                {/* Type chips — single row */}
                <div className="mb-3">
                  <div className="text-[10px] text-muted mb-1.5">نوع منبع</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(TYPE_META).map(([key, meta]) => {
                      const active = pasteType === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleTypeChange(key)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-bold transition-all ${
                            active
                              ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                              : "bg-background border-border text-muted hover:border-primary/30 hover:text-foreground"
                          }`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d={meta.icon} />
                          </svg>
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* URL + inline site */}
                <div className="mb-3">
                  <div className="text-[10px] text-muted mb-1.5 flex items-center justify-between">
                    <span>لینک منبع <span className="text-muted/60">(اختیاری — از روی URL سایت تشخیص داده می‌شود)</span></span>
                    {pasteUrl && detectedSite && !pasteSiteManuallySet && (
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                        شناسایی‌شده: {detectedSite.label}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={pasteUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... یا هر لینک دیگر"
                      dir="ltr"
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none font-mono focus:border-primary/50"
                    />
                    <select
                      value={pasteSite}
                      onChange={(e) => { setPasteSite(e.target.value); setPasteSiteManuallySet(true); }}
                      className="bg-background border border-border rounded-lg px-2 py-2 text-[11px] outline-none w-28"
                      title="سایت"
                    >
                      {SITE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <div className="text-[10px] text-muted mb-1.5 flex items-center justify-between">
                    <span>متن خام</span>
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      پیست از کلیپ‌بورد
                    </button>
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="متن نظر کاربر، مقاله، ریویو تخصصی، یا توضیحات ویدیو رو اینجا paste کن..."
                    rows={14}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs leading-7 outline-none resize-y focus:border-primary/50 min-h-[220px]"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="text-[9px] text-muted">
                      {charCount > 0 ? (
                        <>
                          <span className="font-bold text-foreground">{toPersianDigits(charCount)}</span> کاراکتر
                          <span className="mx-1.5 text-muted/50">·</span>
                          <span className="font-bold text-foreground">{toPersianDigits(wordCount)}</span> کلمه
                        </>
                      ) : (
                        <span className="text-muted/60">هنوز متنی وارد نشده</span>
                      )}
                    </div>
                    {charCount > 0 && charCount < 100 && (
                      <div className="text-[9px] text-amber-600">متن خیلی کوتاه است برای پردازش</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-background/30">
                <button
                  onClick={resetPasteForm}
                  disabled={isBusy}
                  className="px-4 py-2 text-[11px] font-bold text-muted hover:text-foreground disabled:opacity-30"
                >
                  انصراف
                </button>
                <div className="mr-auto flex gap-1.5">
                  <button
                    onClick={() => handleSavePaste(false)}
                    disabled={isBusy || !pasteText.trim()}
                    className="px-3.5 py-2 bg-background border border-border text-[11px] font-bold rounded-xl disabled:opacity-40 hover:border-primary/30"
                  >
                    {pasteSaving === "save" ? "در حال ذخیره..." : "فقط ذخیره"}
                  </button>
                  <button
                    onClick={() => handleSavePaste(true)}
                    disabled={isBusy || !pasteText.trim()}
                    className="px-3.5 py-2 bg-primary text-white text-[11px] font-bold rounded-xl disabled:opacity-40 shadow-sm shadow-primary/20 flex items-center gap-1.5"
                  >
                    {pasteSaving === "saveProcess" ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        پردازش...
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        ذخیره + پردازش AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div className="text-right">
      <div className="text-[9px] text-muted mb-0.5">{label}</div>
      <div className="text-lg font-black text-foreground leading-none">{value}</div>
      {sub && <div className={`text-[9px] mt-1 ${subColor || "text-muted/70"}`}>{sub}</div>}
    </div>
  );
}

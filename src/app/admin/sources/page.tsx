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

const SITE_LABELS: Record<string, string> = {
  bama: "باما", divar: "دیوار", zoomit: "زومیت", charkhan: "چرخان", blog: "بلاگ", manual: "دستی",
};

export default function AdminSourcesPage() {
  const { fetchAdmin } = useAdmin();
  const [sources, setSources] = useState<Source[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCar, setFilterCar] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Add form
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

  const handleAdd = async () => {
    if (!newCarId || !newText.trim()) return;
    const res = await fetchAdmin("/api/admin/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carId: newCarId, type: newType, sourceSite: newSite,
        url: newUrl || null, title: newTitle || null, rawText: newText,
      }),
    });
    if (res.ok) {
      const data = await fetchAdmin("/api/admin/sources").then((r) => r.json());
      setSources(data);
      setShowAdd(false);
      setNewText(""); setNewUrl(""); setNewTitle("");
      showToast("منبع اضافه شد");
    }
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
        showToast("پردازش AI موفق");
      } else {
        showToast(data.error || "خطا در پردازش");
      }
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
      } else {
        showToast(data.error || "خطا");
      }
    } catch { showToast("خطا"); }
    setApplyingId(null);
  };

  const handleDelete = async (id: string) => {
    await fetchAdmin(`/api/admin/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
    showToast("منبع حذف شد");
  };

  const handleReject = async (id: string) => {
    await fetchAdmin(`/api/admin/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, status: "rejected" } : s));
    showToast("رد شد");
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black">منابع دانش خودرو</h1>
          <p className="text-[11px] text-muted mt-0.5">جمع‌آوری، پردازش و اعمال نظرات و مقالات</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-primary text-white text-[11px] font-bold rounded-lg flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
          افزودن منبع
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: "همه", count: stats.total, color: "" },
          { key: "pending", label: "در انتظار", count: stats.pending, color: "text-amber-600" },
          { key: "processed", label: "پردازش‌شده", count: stats.processed, color: "text-primary" },
          { key: "approved", label: "تایید‌شده", count: stats.approved, color: "text-accent" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
              filterStatus === s.key ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"
            }`}
          >
            <span className={filterStatus !== s.key ? s.color : ""}>{s.label}</span>
            <span className="mr-1 opacity-70">{toPersianDigits(s.count)}</span>
          </button>
        ))}
      </div>

      {/* Car filter */}
      <div className="flex gap-2 mb-4">
        <select value={filterCar} onChange={(e) => setFilterCar(e.target.value)} className="bg-surface border border-border rounded-lg px-3 py-1.5 text-[11px] outline-none max-w-[250px]">
          <option value="all">همه خودروها</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
        </select>
      </div>

      {/* Sources List */}
      <div className="space-y-2">
        {filtered.map((src) => {
          const isExpanded = expandedId === src.id;
          const stCfg = STATUS_CONFIG[src.status] || STATUS_CONFIG.pending;
          const scores = src.extractedScores ? JSON.parse(src.extractedScores) : null;

          return (
            <div key={src.id} className="bg-surface rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : src.id)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-background/30 transition-colors"
              >
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${stCfg.bg} ${stCfg.color}`}>
                  {stCfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{src.carName}</span>
                    <span className="text-[10px] text-muted">{src.carBrand}</span>
                    <span className="text-[9px] bg-background px-1.5 py-0.5 rounded">{SITE_LABELS[src.sourceSite] || src.sourceSite}</span>
                    {src.title && <span className="text-[10px] text-muted truncate max-w-[200px]">- {src.title}</span>}
                  </div>
                  <p className="text-[10px] text-muted truncate mt-0.5">{src.rawText}</p>
                </div>
                <span className="text-[9px] text-muted shrink-0">{new Date(src.createdAt).toLocaleDateString("fa-IR")}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {/* Raw text */}
                  <div>
                    <h4 className="text-[10px] font-black mb-1">متن خام</h4>
                    <div className="bg-background rounded-lg p-3 text-[11px] leading-6 max-h-[200px] overflow-y-auto">
                      {src.rawTextFull}
                    </div>
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary mt-1 inline-block hover:underline" dir="ltr">
                        {src.url}
                      </a>
                    )}
                  </div>

                  {/* Processed results */}
                  {src.processedSummary && (
                    <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                      <h4 className="text-[10px] font-black text-primary mb-1">خلاصه AI</h4>
                      <p className="text-[11px] leading-6">{src.processedSummary}</p>
                    </div>
                  )}

                  {(src.extractedPros.length > 0 || src.extractedCons.length > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      {src.extractedPros.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-black text-accent mb-1">نقاط قوت</h5>
                          {src.extractedPros.map((p, i) => (
                            <div key={i} className="flex items-start gap-1 text-[10px] mb-0.5"><span className="text-accent font-bold">+</span><span>{p}</span></div>
                          ))}
                        </div>
                      )}
                      {src.extractedCons.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-black text-danger mb-1">نقاط ضعف</h5>
                          {src.extractedCons.map((c, i) => (
                            <div key={i} className="flex items-start gap-1 text-[10px] mb-0.5"><span className="text-danger font-bold">-</span><span>{c}</span></div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {scores && (
                    <div>
                      <h5 className="text-[10px] font-black mb-1">امتیازات استخراج‌شده</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(scores).filter(([, v]) => typeof v === "number").map(([k, v]) => (
                          <span key={k} className="text-[9px] bg-background px-2 py-0.5 rounded">
                            {k}: <span className="font-bold">{toPersianDigits(v as number)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {src.status === "pending" && (
                      <button
                        onClick={() => handleProcess(src.id)}
                        disabled={processingId === src.id}
                        className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg disabled:opacity-50 flex items-center gap-1"
                      >
                        {processingId === src.id ? (
                          <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> پردازش...</>
                        ) : (
                          <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> پردازش با AI</>
                        )}
                      </button>
                    )}
                    {src.status === "processed" && (
                      <>
                        <button
                          onClick={() => handleApply(src.id)}
                          disabled={applyingId === src.id}
                          className="px-3 py-1.5 bg-accent text-white text-[10px] font-bold rounded-lg disabled:opacity-50 flex items-center gap-1"
                        >
                          {applyingId === src.id ? "اعمال..." : "تایید و اعمال"}
                        </button>
                        <button onClick={() => handleReject(src.id)} className="px-3 py-1.5 text-[10px] text-danger font-bold bg-danger/5 rounded-lg">
                          رد
                        </button>
                        <button onClick={() => handleProcess(src.id)} disabled={!!processingId} className="px-3 py-1.5 text-[10px] text-muted font-bold bg-background rounded-lg disabled:opacity-50">
                          پردازش مجدد
                        </button>
                      </>
                    )}
                    {src.status === "approved" && (
                      <span className="text-[10px] text-accent font-bold flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                        اعمال شده {src.appliedAt && `- ${new Date(src.appliedAt).toLocaleDateString("fa-IR")}`}
                      </span>
                    )}
                    <button onClick={() => handleDelete(src.id)} className="px-2 py-1.5 text-muted hover:text-danger text-[10px] mr-auto rounded-lg">
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-3 bg-muted/8 rounded-full flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/40">
                <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
              </svg>
            </div>
            <p className="text-sm text-muted mb-1">منبعی ثبت نشده</p>
            <p className="text-[11px] text-muted">نظرات، مقالات و تجربیات کاربران رو اضافه کنید</p>
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowAdd(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-[550px] max-h-[85vh] overflow-y-auto">
            <h3 className="text-sm font-black mb-4">افزودن منبع جدید</h3>
            <div className="space-y-3">
              {/* Car */}
              <div>
                <label className="text-[11px] text-muted block mb-1">خودرو</label>
                <select value={newCarId} onChange={(e) => setNewCarId(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">انتخاب...</option>
                  {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
                </select>
              </div>

              {/* Type + Site */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">نوع محتوا</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="comment">نظر کاربر</option>
                    <option value="article">مقاله بررسی</option>
                    <option value="review">ریویو تخصصی</option>
                    <option value="manual">دستی</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">سایت منبع</label>
                  <select value={newSite} onChange={(e) => setNewSite(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="manual">دستی</option>
                    <option value="bama">باما</option>
                    <option value="divar">دیوار</option>
                    <option value="zoomit">زومیت</option>
                    <option value="charkhan">چرخان</option>
                    <option value="blog">بلاگ</option>
                  </select>
                </div>
              </div>

              {/* URL + Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">لینک منبع (اختیاری)</label>
                  <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." dir="ltr" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">عنوان (اختیاری)</label>
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان مقاله..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>

              {/* Text */}
              <div>
                <label className="text-[11px] text-muted block mb-1">متن محتوا</label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="متن نظر، مقاله یا تجربه کاربر را اینجا paste کنید..."
                  rows={8}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none leading-6"
                />
                <p className="text-[9px] text-muted mt-1">{toPersianDigits(newText.length)} کاراکتر</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-background text-sm font-bold rounded-xl">انصراف</button>
              <button onClick={handleAdd} disabled={!newCarId || !newText.trim()} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40">
                ذخیره منبع
              </button>
            </div>
          </div>
        </>
      )}

      {/* Info */}
      <div className="mt-5 bg-primary/5 border border-primary/15 rounded-xl p-4">
        <h4 className="text-xs font-black mb-1">فلوی کار</h4>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold">۱. ثبت</span>
          <span>→</span>
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">۲. پردازش AI</span>
          <span>→</span>
          <span>بازبینی ادمین</span>
          <span>→</span>
          <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold">۳. تایید و اعمال</span>
        </div>
        <p className="text-[10px] text-muted mt-2 leading-5">
          نظرات و مقالات رو اضافه کنید، AI خلاصه و امتیازات رو استخراج میکنه، بعد تایید شما داده‌ها در Review + Intel + Scores ادغام میشن.
        </p>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

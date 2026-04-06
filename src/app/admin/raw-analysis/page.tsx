"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface RawAnalysis {
  id: string;
  carId: string;
  nameFa: string;
  brandFa: string;
  nameEn: string;
  pros: string[];
  cons: string[];
  commonProblems: string[];
  buyReasons: string[];
  avoidReasons: string[];
  statementsCount: number;
  featureStatsCount: number;
  status: string;
  sourceLabel: string | null;
  processedAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "در انتظار", color: "bg-amber-500/10 text-amber-600" },
  processing: { label: "در حال پردازش", color: "bg-blue-500/10 text-blue-600" },
  processed: { label: "پردازش شده", color: "bg-emerald-500/10 text-emerald-600" },
  failed: { label: "خطا", color: "bg-red-500/10 text-red-500" },
};

export default function AdminRawAnalysisPage() {
  const { fetchAdmin } = useAdmin();
  const [analyses, setAnalyses] = useState<RawAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importLabel, setImportLabel] = useState("ChatGPT extraction");
  const [importing, setImporting] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadData = () => {
    const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
    fetchAdmin(`/api/admin/raw-analysis${params}`).then((r: Response) => r.json())
      .then((d: RawAnalysis[]) => { setAnalyses(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = async () => {
    try {
      setImporting(true);
      const parsed = JSON.parse(importJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      const res = await fetchAdmin("/api/admin/raw-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", items, sourceLabel: importLabel }),
      }).then((r: Response) => r.json());

      showToast(`${toPersianDigits(res.imported)} ایمپورت شد${res.skipped > 0 ? ` / ${toPersianDigits(res.skipped)} رد شد` : ""}`);
      if (res.errors?.length > 0) {
        console.warn("Import errors:", res.errors);
      }
      setImportJson("");
      setShowImport(false);
      loadData();
    } catch {
      showToast("فرمت JSON نامعتبر");
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    let totalImported = 0;
    let totalSkipped = 0;

    for (const file of Array.from(files)) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        const res = await fetchAdmin("/api/admin/raw-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "import", items, sourceLabel: importLabel }),
        }).then((r: Response) => r.json());

        totalImported += res.imported;
        totalSkipped += res.skipped;
      } catch {
        totalSkipped++;
      }
    }

    showToast(`${toPersianDigits(totalImported)} ایمپورت شد از ${toPersianDigits(files.length)} فایل`);
    setImporting(false);
    loadData();
    e.target.value = "";
  };

  const handleProcess = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetchAdmin("/api/admin/raw-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process", analysisId: id }),
      }).then((r: Response) => r.json());

      if (res.ok) {
        showToast("پردازش انجام شد — امتیازها تولید شدند");
      } else {
        showToast(`خطا: ${res.error}`);
      }
      loadData();
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    await fetchAdmin(`/api/admin/raw-analysis?id=${id}`, { method: "DELETE" });
    showToast("حذف شد");
    loadData();
  };

  const handleProcessAll = async () => {
    const pending = analyses.filter((a) => a.status === "pending");
    if (pending.length === 0) { showToast("تحلیل در انتظاری وجود ندارد"); return; }

    for (const a of pending) {
      await handleProcess(a.id);
    }
    showToast(`${toPersianDigits(pending.length)} تحلیل پردازش شد`);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">تحلیل خام خودروها</h1>
        <div className="flex gap-2">
          <button
            onClick={handleProcessAll}
            className="px-3 py-2 bg-accent text-white text-xs font-bold rounded-lg"
          >
            پردازش همه ({toPersianDigits(analyses.filter((a) => a.status === "pending").length)})
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg"
          >
            ایمپورت
          </button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-5">
          <h3 className="text-xs font-black mb-3">ایمپورت تحلیل خام</h3>

          <div className="mb-3">
            <label className="text-[10px] text-muted block mb-1">برچسب منبع</label>
            <input value={importLabel} onChange={(e) => setImportLabel(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none max-w-sm" />
          </div>

          {/* File upload */}
          <div className="mb-3">
            <label className="text-[10px] text-muted block mb-1">آپلود فایل JSON (تکی یا چندتایی)</label>
            <input type="file" accept=".json" multiple onChange={handleFileImport}
              className="text-sm text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary" />
          </div>

          <div className="relative mb-3">
            <label className="text-[10px] text-muted block mb-1">یا JSON مستقیم بچسبان</label>
            <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)}
              rows={8} placeholder='{"car": "آریزو ۵", "pros": [...], ...}'
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono outline-none resize-none" dir="ltr" />
          </div>

          <button onClick={handleImport} disabled={importing || !importJson.trim()}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50">
            {importing ? "در حال ایمپورت..." : "ایمپورت"}
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5 mb-4">
        {[
          { key: "all", label: "همه" },
          { key: "pending", label: "در انتظار" },
          { key: "processed", label: "پردازش شده" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              filterStatus === f.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
            }`}>
            {f.label}
          </button>
        ))}
        <span className="mr-auto text-[11px] text-muted self-center">
          {toPersianDigits(analyses.length)} تحلیل
        </span>
      </div>

      {/* List */}
      <div className="space-y-3">
        {analyses.map((a) => {
          const isExpanded = expandedId === a.id;
          const statusInfo = STATUS_LABELS[a.status] || STATUS_LABELS.pending;

          return (
            <div key={a.id} className="bg-surface rounded-xl border border-border overflow-hidden">
              {/* Header */}
              <div
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
              >
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full ${
                  a.status === "pending" ? "bg-amber-500" :
                  a.status === "processed" ? "bg-emerald-500" :
                  a.status === "failed" ? "bg-red-500" : "bg-blue-500"
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{a.nameFa}</span>
                    <span className="text-[10px] text-muted">{a.brandFa}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {toPersianDigits(a.pros.length)} مزیت · {toPersianDigits(a.cons.length)} عیب · {toPersianDigits(a.statementsCount)} نظر
                    {a.sourceLabel && <span className="mr-2">· {a.sourceLabel}</span>}
                  </div>
                </div>

                <div className="flex gap-1.5">
                  {a.status === "pending" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleProcess(a.id); }}
                      disabled={processing === a.id}
                      className="px-2.5 py-1 bg-accent text-white text-[10px] font-bold rounded-lg disabled:opacity-50"
                    >
                      {processing === a.id ? "..." : "پردازش"}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}
                    className="px-2 py-1 text-red-400 hover:text-red-500 text-[10px]"
                  >
                    حذف
                  </button>
                </div>

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-3">
                  {/* Pros */}
                  {a.pros.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-600 mb-1">نقاط قوت</h4>
                      <div className="flex flex-wrap gap-1">
                        {a.pros.map((p, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px]">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cons */}
                  {a.cons.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-red-500 mb-1">نقاط ضعف</h4>
                      <div className="flex flex-wrap gap-1">
                        {a.cons.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-500/5 text-red-600 dark:text-red-400 rounded-full text-[10px]">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Common problems */}
                  {a.commonProblems.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-600 mb-1">مشکلات رایج</h4>
                      {a.commonProblems.map((p, i) => (
                        <div key={i} className="text-[11px] text-foreground flex items-start gap-1 mb-0.5">
                          <span className="text-amber-500">•</span> {p}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buy / Avoid */}
                  <div className="grid grid-cols-2 gap-3">
                    {a.buyReasons.length > 0 && (
                      <div className="bg-emerald-500/5 rounded-lg p-2.5">
                        <h4 className="text-[9px] font-bold text-emerald-600 mb-1">چرا بخریم</h4>
                        {a.buyReasons.map((r, i) => (
                          <div key={i} className="text-[10px] text-foreground mb-0.5">{r}</div>
                        ))}
                      </div>
                    )}
                    {a.avoidReasons.length > 0 && (
                      <div className="bg-red-500/5 rounded-lg p-2.5">
                        <h4 className="text-[9px] font-bold text-red-500 mb-1">چرا نخریم</h4>
                        {a.avoidReasons.map((r, i) => (
                          <div key={i} className="text-[10px] text-foreground mb-0.5">{r}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="text-[9px] text-muted flex gap-3">
                    <span>نظرات: {toPersianDigits(a.statementsCount)}</span>
                    <span>ویژگی‌ها: {toPersianDigits(a.featureStatsCount)}</span>
                    {a.processedAt && <span>پردازش: {new Date(a.processedAt).toLocaleDateString("fa-IR")}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {analyses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted mb-2">تحلیل خامی ثبت نشده</p>
            <p className="text-[11px] text-muted/60">از دکمه ایمپورت برای وارد کردن فایل JSON استفاده کنید</p>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

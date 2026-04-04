"use client";

import { useState } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface ImportResult {
  total: number; created: number; updated: number; skipped: number; errors: string[];
}

export default function AdminImportPage() {
  const { fetchAdmin } = useAdmin();
  const [jsonInput, setJsonInput] = useState("");
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonInput(text);
      try {
        const data = JSON.parse(text);
        const cars = Array.isArray(data) ? data : data.cars;
        if (Array.isArray(cars)) setPreview(cars);
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    try {
      const data = JSON.parse(jsonInput);
      const cars = Array.isArray(data) ? data : data.cars;
      if (Array.isArray(cars)) {
        setPreview(cars);
      } else {
        showToast("فرمت نامعتبر: باید آرایه از خودروها باشد");
      }
    } catch {
      showToast("خطا در JSON");
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await fetchAdmin("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cars: preview, mode }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      showToast("خطا در واردات");
    }
    setImporting(false);
  };

  const sampleJson = JSON.stringify([{
    nameEn: "Example Car",
    nameFa: "ماشین نمونه",
    brandFa: "برند",
    category: "sedan",
    origin: "iranian",
    priceMin: "1500000000",
    priceMax: "2000000000",
    tags: ["شهری", "اقتصادی"],
    scores: { comfort: 7, performance: 5, economy: 8, safety: 6 },
  }], null, 2);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-black mb-5">واردات خودرو</h1>

      {/* Instructions */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-5">
        <h3 className="text-xs font-black mb-2">فرمت فایل</h3>
        <p className="text-[11px] text-muted leading-5 mb-2">
          فایل JSON شامل آرایه‌ای از خودروها. فیلدهای الزامی:
          <span className="font-bold"> nameEn, nameFa, brandFa, category, origin, priceMin, priceMax</span>
        </p>
        <details className="text-[10px]">
          <summary className="cursor-pointer text-primary font-bold">نمونه JSON</summary>
          <pre className="mt-2 bg-background rounded-lg p-3 overflow-x-auto whitespace-pre text-[10px] leading-5" dir="ltr">{sampleJson}</pre>
        </details>
      </div>

      {/* Upload or paste */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-5">
        <div className="flex gap-3 mb-3">
          <label className="px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold cursor-pointer hover:bg-border/50 transition-colors">
            آپلود فایل JSON
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
          <div className="flex gap-2 items-center mr-auto">
            <span className="text-xs text-muted">در صورت تکرار:</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as "skip" | "update")} className="bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none">
              <option value="skip">رد شو</option>
              <option value="update">بروزرسانی کن</option>
            </select>
          </div>
        </div>
        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder="JSON را اینجا paste کنید..."
          rows={8}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-primary resize-none"
          dir="ltr"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={handlePreview} className="px-4 py-2 bg-background border border-border text-xs font-bold rounded-xl">
            پیش‌نمایش
          </button>
          <button
            onClick={handleImport}
            disabled={!preview || importing}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-50"
          >
            {importing ? "در حال واردات..." : `واردات ${preview ? toPersianDigits(preview.length) + " خودرو" : ""}`}
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && !result && (
        <div className="bg-surface rounded-2xl border border-border p-5 mb-5">
          <h3 className="text-sm font-black mb-3">پیش‌نمایش ({toPersianDigits(preview.length)} خودرو)</h3>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 px-2">نام فارسی</th>
                  <th className="text-right py-2 px-2">نام انگلیسی</th>
                  <th className="text-right py-2 px-2">برند</th>
                  <th className="text-right py-2 px-2">مبدا</th>
                  <th className="text-right py-2 px-2">دسته</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((car, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 px-2 font-bold">{String(car.nameFa || "-")}</td>
                    <td className="py-1.5 px-2">{String(car.nameEn || "-")}</td>
                    <td className="py-1.5 px-2">{String(car.brandFa || "-")}</td>
                    <td className="py-1.5 px-2">{String(car.origin || "-")}</td>
                    <td className="py-1.5 px-2">{String(car.category || "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 20 && <p className="text-[10px] text-muted mt-2 text-center">و {toPersianDigits(preview.length - 20)} مورد دیگر...</p>}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-surface rounded-2xl border border-border p-5">
          <h3 className="text-sm font-black mb-3">نتیجه واردات</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-background rounded-xl p-3 text-center">
              <div className="text-lg font-black">{toPersianDigits(result.total)}</div>
              <div className="text-[10px] text-muted">کل</div>
            </div>
            <div className="bg-accent/10 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-accent">{toPersianDigits(result.created)}</div>
              <div className="text-[10px] text-muted">ایجاد شده</div>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-primary">{toPersianDigits(result.updated)}</div>
              <div className="text-[10px] text-muted">بروزرسانی</div>
            </div>
            <div className="bg-muted/10 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-muted">{toPersianDigits(result.skipped)}</div>
              <div className="text-[10px] text-muted">رد شده</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-danger/5 border border-danger/15 rounded-xl p-3">
              <h4 className="text-xs font-bold text-danger mb-2">خطاها ({toPersianDigits(result.errors.length)})</h4>
              {result.errors.map((err, i) => (
                <div key={i} className="text-[10px] text-danger mb-1">- {err}</div>
              ))}
            </div>
          )}
          <button onClick={() => { setResult(null); setPreview(null); setJsonInput(""); }} className="mt-3 px-4 py-2 bg-background text-xs font-bold rounded-xl">
            واردات جدید
          </button>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

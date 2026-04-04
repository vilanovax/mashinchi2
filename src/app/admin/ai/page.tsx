"use client";

import { useState, useEffect } from "react";
import { useAdmin } from "../layout";

interface CarOption { id: string; nameFa: string; brandFa: string }

export default function AdminAIPage() {
  const { fetchAdmin } = useAdmin();
  const [cars, setCars] = useState<CarOption[]>([]);
  const [selectedCar, setSelectedCar] = useState("");
  const [genType, setGenType] = useState<"intel" | "review" | "description">("intel");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | string | null>(null);
  const [resultType, setResultType] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/cars").then((r) => r.json()).then((d: (CarOption & Record<string, unknown>)[]) => {
      setCars(d.map((c) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa })));
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleGenerate = async () => {
    if (!selectedCar) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetchAdmin("/api/admin/ai-generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId: selectedCar, type: genType }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error);
      } else {
        setResult(data.result);
        setResultType(data.type);
      }
    } catch {
      showToast("خطا در تولید");
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!result || !selectedCar) return;
    setSaving(true);
    try {
      if (resultType === "intel") {
        await fetchAdmin(`/api/admin/cars/${selectedCar}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intel: result }),
        });
        showToast("اطلاعات هوشمند ذخیره شد");
      } else if (resultType === "review") {
        await fetchAdmin("/api/admin/reviews", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carId: selectedCar, source: "expert", ...(result as Record<string, unknown>) }),
        });
        showToast("نظر کارشناسی ذخیره شد");
      } else if (resultType === "description") {
        await fetchAdmin(`/api/admin/cars/${selectedCar}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ car: { description: result as string } }),
        });
        showToast("توضیحات ذخیره شد");
      }
    } catch {
      showToast("خطا در ذخیره");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const selectedCarName = cars.find((c) => c.id === selectedCar)?.nameFa || "";

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-black mb-5">تولید محتوا با AI</h1>

      {/* Config */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-5">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted block mb-1">خودرو</label>
            <select value={selectedCar} onChange={(e) => { setSelectedCar(e.target.value); setResult(null); }} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">انتخاب کنید...</option>
              {cars.map((c) => <option key={c.id} value={c.id}>{c.nameFa} - {c.brandFa}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-2">نوع تولید</label>
            <div className="flex gap-2">
              {[
                { key: "intel" as const, label: "اطلاعات هوشمند", desc: "قوت/ضعف/هشدار/جمع‌بندی" },
                { key: "review" as const, label: "نظر کارشناسی", desc: "خلاصه + مزایا/معایب + امتیاز" },
                { key: "description" as const, label: "توضیحات", desc: "متن کوتاه معرفی" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setGenType(opt.key); setResult(null); }}
                  className={`flex-1 p-3 rounded-xl border text-right transition-colors ${
                    genType === opt.key ? "border-primary bg-primary/5" : "border-border hover:bg-background"
                  }`}
                >
                  <div className={`text-xs font-bold ${genType === opt.key ? "text-primary" : ""}`}>{opt.label}</div>
                  <div className="text-[10px] text-muted mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedCar || generating}
            className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                در حال تولید...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                تولید با Claude AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black">نتیجه تولید - {selectedCarName}</h3>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-lg disabled:opacity-50"
            >
              {saving ? "..." : "ذخیره در دیتابیس"}
            </button>
          </div>

          {resultType === "description" ? (
            <div className="bg-background rounded-xl p-4">
              <p className="text-sm leading-7">{result as string}</p>
            </div>
          ) : (
            <pre className="bg-background rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap leading-6 max-h-[500px] overflow-y-auto" dir="ltr">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

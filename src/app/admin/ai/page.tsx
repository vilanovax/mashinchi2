"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface CarOption { id: string; nameFa: string; brandFa: string }

interface AISettings {
  provider: string;
  model: string;
  hasKey: boolean;
  claudeKey: string | null;
  openaiKey: string | null;
  claudeModel: string;
  openaiModel: string;
  availableClaudeModels: { id: string; name: string; desc: string }[];
  availableOpenaiModels: { id: string; name: string; desc: string }[];
}

export default function AdminAIPage() {
  const { fetchAdmin } = useAdmin();
  const [cars, setCars] = useState<CarOption[]>([]);
  const [selectedCar, setSelectedCar] = useState("");
  const [genType, setGenType] = useState<"intel" | "review" | "description">("intel");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | string | null>(null);
  const [resultType, setResultType] = useState("");
  const [resultProvider, setResultProvider] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // AI Settings
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [activeProvider, setActiveProvider] = useState<"claude" | "openai">("claude");
  const [activeModel, setActiveModel] = useState("");
  const [customClaudeKey, setCustomClaudeKey] = useState("");
  const [customOpenaiKey, setCustomOpenaiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAdmin("/api/admin/cars").then((r) => r.json()),
      fetchAdmin("/api/admin/ai-settings").then((r) => r.json()),
    ]).then(([carData, aiData]) => {
      setCars(carData.map((c: CarOption & Record<string, unknown>) => ({ id: c.id, nameFa: c.nameFa, brandFa: c.brandFa })));
      setSettings(aiData);
      setActiveProvider(aiData.provider);
      setActiveModel(aiData.model);
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      // Pass runtime provider override via headers
      headers["x-ai-provider"] = activeProvider;
      const key = activeProvider === "openai" ? customOpenaiKey : customClaudeKey;
      if (key) headers["x-ai-key"] = key;

      const res = await fetchAdmin("/api/admin/ai-generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ carId: selectedCar, type: genType }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error);
      } else {
        setResult(data.result);
        setResultType(data.type);
        setResultProvider(data.provider || activeProvider);
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
  const availableModels = activeProvider === "openai" ? (settings?.availableOpenaiModels || []) : (settings?.availableClaudeModels || []);
  const currentKey = activeProvider === "openai" ? settings?.openaiKey : settings?.claudeKey;
  const hasCustomKey = activeProvider === "openai" ? !!customOpenaiKey : !!customClaudeKey;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">تولید محتوا با AI</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
            showSettings ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-foreground"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9" />
          </svg>
          تنظیمات AI
        </button>
      </div>

      {/* AI Settings Panel */}
      {showSettings && (
        <div className="bg-surface rounded-2xl border border-border p-5 mb-5">
          <h3 className="text-sm font-black mb-4">تنظیمات هوش مصنوعی</h3>

          {/* Provider Switch */}
          <div className="mb-4">
            <label className="text-[11px] text-muted block mb-2">انتخاب سرویس</label>
            <div className="flex gap-2">
              {([
                { key: "claude" as const, label: "Claude (Anthropic)", icon: "A", desc: "Sonnet / Haiku / Opus", color: "bg-amber-500" },
                { key: "openai" as const, label: "ChatGPT (OpenAI)", icon: "G", desc: "GPT-4o / GPT-4 / GPT-3.5", color: "bg-emerald-500" },
              ]).map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setActiveProvider(p.key);
                    setActiveModel(p.key === "openai" ? (settings?.openaiModel || "gpt-4o") : (settings?.claudeModel || "claude-sonnet-4-20250514"));
                  }}
                  className={`flex-1 p-3 rounded-xl border-2 transition-all text-right ${
                    activeProvider === p.key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${p.color} text-white flex items-center justify-center text-xs font-black`}>
                      {p.icon}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${activeProvider === p.key ? "text-primary" : ""}`}>{p.label}</div>
                      <div className="text-[9px] text-muted">{p.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Model Select */}
          <div className="mb-4">
            <label className="text-[11px] text-muted block mb-1">مدل</label>
            <select
              value={activeModel}
              onChange={(e) => setActiveModel(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>{m.name} - {m.desc}</option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div className="mb-3">
            <label className="text-[11px] text-muted block mb-1">
              کلید API {activeProvider === "openai" ? "OpenAI" : "Anthropic"}
              {currentKey && <span className="text-accent mr-1">(env: {currentKey})</span>}
            </label>
            <input
              type="password"
              placeholder={currentKey ? `پیش‌فرض از env: ${currentKey}` : "کلید API را وارد کنید..."}
              value={activeProvider === "openai" ? customOpenaiKey : customClaudeKey}
              onChange={(e) => {
                if (activeProvider === "openai") setCustomOpenaiKey(e.target.value);
                else setCustomClaudeKey(e.target.value);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
              dir="ltr"
            />
            <p className="text-[9px] text-muted mt-1">
              {activeProvider === "openai"
                ? "از https://platform.openai.com/api-keys بگیرید"
                : "از https://console.anthropic.com/settings/keys بگیرید"}
              . اگر خالی باشد از ADMIN_PASSWORD/.env استفاده می‌شود.
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${(currentKey || hasCustomKey) ? "bg-accent" : "bg-danger"}`} />
            <span className="text-[11px]">
              {(currentKey || hasCustomKey) ? (
                <span className="text-accent font-bold">آماده - {activeProvider === "openai" ? "OpenAI" : "Claude"} ({activeModel})</span>
              ) : (
                <span className="text-danger font-bold">کلید API تنظیم نشده</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Active Provider Badge */}
      {!showSettings && (
        <div className="flex items-center gap-2 mb-4 bg-surface rounded-lg border border-border px-3 py-2">
          <div className={`w-2 h-2 rounded-full ${(currentKey || hasCustomKey) ? "bg-accent" : "bg-danger"}`} />
          <span className="text-[11px] text-muted">سرویس فعال:</span>
          <span className="text-[11px] font-bold">{activeProvider === "openai" ? "OpenAI" : "Claude"}</span>
          <span className="text-[10px] text-muted">({activeModel})</span>
        </div>
      )}

      {/* Generation Config */}
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
                { key: "intel" as const, label: "اطلاعات هوشمند", desc: "قوت/ضعف/هشدار/جمع‌بندی", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
                { key: "review" as const, label: "نظر کارشناسی", desc: "خلاصه + مزایا/معایب + امتیاز", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
                { key: "description" as const, label: "توضیحات", desc: "متن کوتاه معرفی", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setGenType(opt.key); setResult(null); }}
                  className={`flex-1 p-3 rounded-xl border transition-colors text-right ${
                    genType === opt.key ? "border-primary bg-primary/5" : "border-border hover:bg-background"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={genType === opt.key ? "text-primary" : "text-muted"}>
                      <path d={opt.icon} />
                    </svg>
                    <div>
                      <div className={`text-[11px] font-bold ${genType === opt.key ? "text-primary" : ""}`}>{opt.label}</div>
                      <div className="text-[9px] text-muted">{opt.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedCar || generating || (!currentKey && !hasCustomKey)}
            className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> در حال تولید با {activeProvider === "openai" ? "ChatGPT" : "Claude"}...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg> تولید</>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black">نتیجه - {selectedCarName}</h3>
              <span className="text-[9px] bg-background px-2 py-0.5 rounded-full text-muted">
                {resultProvider === "openai" ? "ChatGPT" : "Claude"}
              </span>
            </div>
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

"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { useAdmin } from "../layout";

interface ModelOption { id: string; name: string; desc: string }

interface AISettings {
  provider: string;
  claudeModel: string;
  openaiModel: string;
  claudeKeyDB: string | null;
  claudeKeyEnv: string | null;
  openaiKeyDB: string | null;
  openaiKeyEnv: string | null;
  hasClaudeKey: boolean;
  hasOpenaiKey: boolean;
  availableClaudeModels: ModelOption[];
  availableOpenaiModels: ModelOption[];
}

export default function AdminSettingsPage() {
  const { fetchAdmin } = useAdmin();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // AI config state
  const [activeProvider, setActiveProvider] = useState<"claude" | "openai">("claude");
  const [claudeModel, setClaudeModel] = useState("claude-sonnet-4-20250514");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [claudeKey, setClaudeKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");

  // Test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; response?: string; elapsed?: number; error?: string } | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/ai-settings").then((r) => r.json()).then((d: AISettings) => {
      setSettings(d);
      setActiveProvider(d.provider as "claude" | "openai");
      setClaudeModel(d.claudeModel);
      setOpenaiModel(d.openaiModel);
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const markDirty = () => { if (!dirty) setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {
        provider: activeProvider,
        claudeModel,
        openaiModel,
      };
      if (claudeKey) body.claudeKey = claudeKey;
      if (openaiKey) body.openaiKey = openaiKey;

      const res = await fetchAdmin("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDirty(false);
        showToast("تنظیمات ذخیره شد");
        // Refresh settings
        const fresh = await fetchAdmin("/api/admin/ai-settings").then((r) => r.json());
        setSettings(fresh);
        setClaudeKey("");
        setOpenaiKey("");
      } else {
        showToast("خطا در ذخیره");
      }
    } catch {
      showToast("خطا در ذخیره");
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    // Use saved DB key or env key or custom input
    const key = activeProvider === "openai" ? openaiKey : claudeKey;
    const model = activeProvider === "openai" ? openaiModel : claudeModel;

    try {
      const res = await fetchAdmin("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider,
          apiKey: key || undefined, // if empty, API will use DB/env key
          model,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) showToast("اتصال موفق");
    } catch {
      setTestResult({ success: false, error: "خطا در اتصال" });
    }
    setTesting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const currentModels = activeProvider === "openai" ? settings?.availableOpenaiModels : settings?.availableClaudeModels;
  const selectedModel = activeProvider === "openai" ? openaiModel : claudeModel;
  const envKey = activeProvider === "openai" ? settings?.openaiKeyEnv : settings?.claudeKeyEnv;
  const dbKey = activeProvider === "openai" ? settings?.openaiKeyDB : settings?.claudeKeyDB;
  const hasKey = activeProvider === "openai" ? !!(openaiKey || settings?.hasOpenaiKey) : !!(claudeKey || settings?.hasClaudeKey);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">تنظیمات</h1>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-primary/20"
          >
            {saving ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> ذخیره...</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg> ذخیره تنظیمات</>
            )}
          </button>
        )}
      </div>

      {/* Theme */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-4">
        <h2 className="text-sm font-black mb-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          حالت نمایش
        </h2>
        <div className="flex gap-1 bg-background rounded-xl p-1">
          {([
            { key: "light" as const, label: "روشن", icon: <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></> },
            { key: "dark" as const, label: "تاریک", icon: <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /> },
            { key: "system" as const, label: "سیستم", icon: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></> },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                theme === opt.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{opt.icon}</svg>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Provider */}
      <div className="bg-surface rounded-2xl border border-border p-5 mb-4">
        <h2 className="text-sm font-black mb-4 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          سرویس هوش مصنوعی
        </h2>

        {/* Provider Cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {([
            { key: "claude" as const, label: "Claude", company: "Anthropic", logo: "A", color: "bg-amber-500", border: "border-amber-500/40" },
            { key: "openai" as const, label: "ChatGPT", company: "OpenAI", logo: "G", color: "bg-emerald-500", border: "border-emerald-500/40" },
          ]).map((p) => (
            <button
              key={p.key}
              onClick={() => { setActiveProvider(p.key); markDirty(); setTestResult(null); }}
              className={`p-4 rounded-xl border-2 transition-all text-right ${
                activeProvider === p.key ? `${p.border} bg-primary/3` : "border-border hover:border-primary/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${p.color} text-white flex items-center justify-center text-sm font-black shrink-0`}>
                  {p.logo}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{p.label}</div>
                  <div className="text-[10px] text-muted">{p.company}</div>
                </div>
                {activeProvider === p.key && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary shrink-0">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Model Select */}
        <div className="mb-5">
          <label className="text-[11px] font-bold block mb-2">مدل</label>
          <div className="space-y-1.5">
            {currentModels?.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => { activeProvider === "openai" ? setOpenaiModel(m.id) : setClaudeModel(m.id); markDirty(); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl border transition-all text-right ${
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary" : "border-border"}`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold">{m.name}</span>
                      <span className="text-[10px] text-muted mr-2">{m.desc}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-muted font-mono" dir="ltr">{m.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key */}
        <div className="mb-4">
          <label className="text-[11px] font-bold block mb-1.5">
            کلید API {activeProvider === "openai" ? "OpenAI" : "Anthropic"}
          </label>

          {/* Existing keys info */}
          {(dbKey || envKey) && (
            <div className="flex gap-2 mb-2">
              {dbKey && (
                <span className="text-[9px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  ذخیره شده: {dbKey}
                </span>
              )}
              {envKey && (
                <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  env: {envKey}
                </span>
              )}
            </div>
          )}

          <input
            type="password"
            placeholder={dbKey || envKey ? "کلید جدید وارد کنید (جایگزین می‌شود)" : "کلید API را وارد کنید"}
            value={activeProvider === "openai" ? openaiKey : claudeKey}
            onChange={(e) => {
              activeProvider === "openai" ? setOpenaiKey(e.target.value) : setClaudeKey(e.target.value);
              markDirty();
            }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary font-mono"
            dir="ltr"
          />
          <p className="text-[9px] text-muted mt-1">
            {activeProvider === "openai"
              ? "platform.openai.com/api-keys"
              : "console.anthropic.com/settings/keys"}
          </p>
        </div>

        {/* Action Row: Save + Test */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> ذخیره...</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg> ذخیره</>
            )}
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !hasKey}
            className="flex-1 py-2.5 bg-surface border border-border text-xs font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-1.5 hover:border-primary/30 transition-colors"
          >
            {testing ? (
              <><div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> تست...</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg> تست اتصال</>
            )}
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mt-3 rounded-xl p-3.5 border ${testResult.success ? "bg-accent/5 border-accent/20" : "bg-danger/5 border-danger/20"}`}>
            <div className="flex items-center gap-2 mb-1">
              {testResult.success ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent"><path d="M20 6L9 17l-5-5" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
              )}
              <span className={`text-xs font-bold ${testResult.success ? "text-accent" : "text-danger"}`}>
                {testResult.success ? "اتصال موفق" : "اتصال ناموفق"}
              </span>
              {testResult.elapsed && (
                <span className="text-[9px] text-muted mr-auto">{toPersianDigits(testResult.elapsed)} ms</span>
              )}
            </div>
            {testResult.success && testResult.response && (
              <p className="text-[11px] text-muted leading-5">پاسخ AI: &laquo;{testResult.response}&raquo;</p>
            )}
            {!testResult.success && testResult.error && (
              <p className="text-[11px] text-danger leading-5 break-all">{testResult.error}</p>
            )}
          </div>
        )}

        {/* Status */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${hasKey ? "bg-accent" : "bg-danger"}`} />
            <span className={`text-[11px] font-bold ${hasKey ? "text-accent" : "text-danger"}`}>
              {hasKey ? "آماده" : "کلید تنظیم نشده"}
            </span>
          </div>
          <span className="text-[10px] text-muted">
            {activeProvider === "openai" ? "OpenAI" : "Claude"} / {selectedModel}
          </span>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

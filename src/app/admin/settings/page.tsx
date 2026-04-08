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

      {/* Backup */}
      <BackupSection fetchAdmin={fetchAdmin} showToast={showToast} />

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Backup Section
// ═══════════════════════════════════════════════
function BackupSection({ fetchAdmin, showToast }: { fetchAdmin: any; showToast: (msg: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetchAdmin("/api/admin/backup", { method: "POST" });
      const data = await res.json();
      setStats(data);
    } catch {
      showToast("خطا در دریافت آمار");
    }
    setLoadingStats(false);
  };

  useEffect(() => { loadStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (scope: string) => {
    setDownloading(scope);
    try {
      const res = await fetchAdmin(`/api/admin/backup?scope=${scope}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mashinchi-backup-${scope}-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`بکاپ ${scope === "full" ? "کامل" : scope} دانلود شد`);
    } catch {
      showToast("خطا در دانلود");
    }
    setDownloading(null);
  };

  const totalRecords = stats
    ? Object.values(stats.cars as Record<string, number>).reduce((a: number, b: number) => a + b, 0) +
      Object.values(stats.users as Record<string, number>).reduce((a: number, b: number) => a + b, 0) +
      Object.values(stats.system as Record<string, number>).reduce((a: number, b: number) => a + b, 0)
    : 0;

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 mb-4">
      <h2 className="text-sm font-black mb-4 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        پشتیبان‌گیری (بکاپ)
      </h2>

      {/* Stats */}
      {loadingStats ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats && (
        <div className="mb-5">
          {/* Summary */}
          <div className="bg-background rounded-xl p-3 mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">کل رکوردها</span>
            <span className="text-lg font-black text-primary">{toPersianDigits(totalRecords)}</span>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Cars group */}
            <div className="bg-background rounded-xl p-3">
              <h4 className="text-[9px] font-bold text-primary mb-2">خودروها</h4>
              <div className="space-y-1">
                {[
                  { label: "خودرو", count: stats.cars.cars },
                  { label: "امتیاز", count: stats.cars.scores },
                  { label: "مشخصات", count: stats.cars.specs },
                  { label: "تحلیل", count: stats.cars.intelligence },
                  { label: "نظرات", count: stats.cars.reviews },
                  { label: "قیمت", count: stats.cars.prices },
                  { label: "منابع", count: stats.cars.sources },
                  { label: "تحلیل خام", count: stats.cars.rawAnalyses },
                  { label: "تگ", count: stats.cars.tags },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[9px] text-muted">{item.label}</span>
                    <span className="text-[10px] font-bold">{toPersianDigits(item.count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Users group */}
            <div className="bg-background rounded-xl p-3">
              <h4 className="text-[9px] font-bold text-emerald-500 mb-2">کاربران</h4>
              <div className="space-y-1">
                {[
                  { label: "کاربر", count: stats.users.users },
                  { label: "تعامل", count: stats.users.interactions },
                  { label: "پروفایل سلیقه", count: stats.users.tasteProfiles },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[9px] text-muted">{item.label}</span>
                    <span className="text-[10px] font-bold">{toPersianDigits(item.count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System group */}
            <div className="bg-background rounded-xl p-3">
              <h4 className="text-[9px] font-bold text-amber-500 mb-2">سیستم</h4>
              <div className="space-y-1">
                {[
                  { label: "کرالر", count: stats.system.crawlers },
                  { label: "تنظیمات", count: stats.system.settings },
                  { label: "اعلان", count: stats.system.notifications },
                  { label: "تحلیل بازار", count: stats.system.marketInsights },
                  { label: "آمار آگهی", count: stats.system.listingStats },
                  { label: "لاگ", count: stats.system.auditLogs },
                  { label: "ادمین", count: stats.system.adminUsers },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[9px] text-muted">{item.label}</span>
                    <span className="text-[10px] font-bold">{toPersianDigits(item.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download buttons */}
      <div className="space-y-2">
        <button onClick={() => handleDownload("full")} disabled={!!downloading}
          className="w-full flex items-center justify-between px-4 py-3 bg-primary text-white rounded-xl font-bold text-xs disabled:opacity-50">
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            {downloading === "full" ? "در حال دانلود..." : "دانلود بکاپ کامل"}
          </span>
          <span className="text-[10px] opacity-80">JSON</span>
        </button>

        <div className="grid grid-cols-3 gap-2">
          {[
            { scope: "cars", label: "خودروها", icon: "M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2" },
            { scope: "users", label: "کاربران", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8" },
            { scope: "settings", label: "تنظیمات", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0" },
          ].map((btn) => (
            <button key={btn.scope} onClick={() => handleDownload(btn.scope)} disabled={!!downloading}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-surface border border-border rounded-xl text-[10px] font-bold text-muted hover:text-foreground hover:border-primary/20 disabled:opacity-50 transition-all">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={btn.icon} /></svg>
              {downloading === btn.scope ? "..." : btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Restore section */}
      <RestoreSection fetchAdmin={fetchAdmin} showToast={showToast} onRestored={loadStats} />
    </div>
  );
}

// ═══════════════════════════════════════════════
// Restore Section
// ═══════════════════════════════════════════════
function RestoreSection({ fetchAdmin, showToast, onRestored }: { fetchAdmin: any; showToast: (msg: string) => void; onRestored: () => void }) {
  const [backupData, setBackupData] = useState<any>(null);
  const [backupMeta, setBackupMeta] = useState<{ exportedAt: string; scope: string; carsCount: number; exportedBy: string } | null>(null);
  const [mode, setMode] = useState<"full" | "merge">("merge");
  const [confirmStep, setConfirmStep] = useState(0); // 0=none, 1=confirm, 2=double-confirm for full
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ restored: number; skipped: number; errors: string[] } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data._meta) {
          showToast("فایل بکاپ نامعتبر — فیلد _meta یافت نشد");
          return;
        }
        setBackupData(data);
        setBackupMeta({
          exportedAt: data._meta.exportedAt,
          scope: data._meta.scope,
          exportedBy: data._meta.exportedBy || "unknown",
          carsCount: data.cars?.length || 0,
        });
        setConfirmStep(0);
        setResult(null);
        showToast(`بکاپ بارگذاری شد — ${toPersianDigits(data.cars?.length || 0)} خودرو`);
      } catch {
        showToast("فایل JSON نامعتبر");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRestore = async () => {
    if (!backupData) return;
    setRestoring(true);
    try {
      const res = await fetchAdmin("/api/admin/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: backupData, mode }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(`خطا: ${data.error}`);
      } else {
        setResult(data);
        showToast(`${toPersianDigits(data.restored)} رکورد بازیابی شد`);
        onRestored();
      }
    } catch {
      showToast("خطا در بازیابی");
    }
    setRestoring(false);
    setConfirmStep(0);
  };

  return (
    <div className="mt-5 pt-5 border-t border-border">
      <h3 className="text-xs font-black mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        بازیابی (ریستور)
      </h3>

      {/* File select */}
      {!backupMeta && !result && (
        <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-xs text-muted font-bold">انتخاب فایل بکاپ JSON</span>
          <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
        </label>
      )}

      {/* Backup info + mode select */}
      {backupMeta && !result && (
        <div>
          {/* Backup file info */}
          <div className="bg-background rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">فایل بکاپ</span>
              <button onClick={() => { setBackupData(null); setBackupMeta(null); setConfirmStep(0); }}
                className="text-[9px] text-muted hover:text-red-400">حذف</button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div><span className="text-muted">تاریخ:</span> <span className="font-bold">{new Date(backupMeta.exportedAt).toLocaleDateString("fa-IR")}</span></div>
              <div><span className="text-muted">نوع:</span> <span className="font-bold">{backupMeta.scope === "full" ? "کامل" : backupMeta.scope}</span></div>
              <div><span className="text-muted">خودروها:</span> <span className="font-bold">{toPersianDigits(backupMeta.carsCount)}</span></div>
            </div>
          </div>

          {/* Mode select */}
          <div className="mb-3">
            <label className="text-[10px] font-bold block mb-2">حالت بازیابی</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setMode("merge"); setConfirmStep(0); }}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  mode === "merge" ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
                }`}>
                <div className="text-xs font-bold text-foreground">فقط جدیدها</div>
                <div className="text-[9px] text-muted mt-0.5">رکوردهای تکراری رد میشوند. داده‌های فعلی حفظ میشوند.</div>
              </button>
              <button onClick={() => { setMode("full"); setConfirmStep(0); }}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  mode === "full" ? "border-red-500/40 bg-red-500/5" : "border-border"
                }`}>
                <div className="text-xs font-bold text-foreground">جایگزینی کامل</div>
                <div className="text-[9px] text-red-400 mt-0.5">تمام داده‌های فعلی پاک و با بکاپ جایگزین میشوند!</div>
              </button>
            </div>
          </div>

          {/* Confirm flow */}
          {confirmStep === 0 && (
            <button onClick={() => setConfirmStep(1)}
              className={`w-full py-3 rounded-xl text-xs font-bold ${
                mode === "full"
                  ? "bg-red-500 text-white"
                  : "bg-emerald-500 text-white"
              }`}>
              {mode === "full" ? "بازیابی کامل (حذف داده‌های فعلی)" : "بازیابی فقط جدیدها"}
            </button>
          )}

          {confirmStep === 1 && (
            <div className={`rounded-xl p-4 border-2 ${mode === "full" ? "bg-red-500/5 border-red-500/30" : "bg-amber-500/5 border-amber-500/30"}`}>
              <p className="text-xs font-bold mb-2">
                {mode === "full"
                  ? "تمام داده‌های فعلی دیتابیس پاک و با بکاپ جایگزین میشوند. آیا مطمئن هستید؟"
                  : `${toPersianDigits(backupMeta.carsCount)} خودرو بررسی و موارد جدید اضافه میشوند. ادامه میدهید؟`}
              </p>
              <div className="flex gap-2">
                {mode === "full" ? (
                  <button onClick={() => setConfirmStep(2)}
                    className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold rounded-lg">
                    بله، مطمئنم
                  </button>
                ) : (
                  <button onClick={handleRestore} disabled={restoring}
                    className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50">
                    {restoring ? "در حال بازیابی..." : "تایید و بازیابی"}
                  </button>
                )}
                <button onClick={() => setConfirmStep(0)}
                  className="px-4 py-2 bg-surface border border-border text-[10px] font-bold rounded-lg text-muted">
                  انصراف
                </button>
              </div>
            </div>
          )}

          {confirmStep === 2 && (
            <div className="rounded-xl p-4 border-2 bg-red-500/10 border-red-500/40">
              <p className="text-sm font-black text-red-500 mb-2">تایید نهایی</p>
              <p className="text-xs text-red-400 mb-3">
                تمام خودروها، امتیازها، نظرات، قیمت‌ها و تحلیل‌ها حذف و از بکاپ بازنشانی میشوند. این عملیات غیرقابل برگشت است.
              </p>
              <div className="flex gap-2">
                <button onClick={handleRestore} disabled={restoring}
                  className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                  {restoring ? "در حال بازیابی..." : "حذف همه و بازیابی"}
                </button>
                <button onClick={() => setConfirmStep(0)}
                  className="px-4 py-2 bg-surface border border-border text-[10px] font-bold rounded-lg text-muted">
                  انصراف
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-background rounded-xl p-4">
          <h4 className="text-xs font-black mb-2">نتیجه بازیابی</h4>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-lg font-black text-emerald-500">{toPersianDigits(result.restored)}</div>
              <div className="text-[9px] text-muted">بازیابی شده</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-muted">{toPersianDigits(result.skipped)}</div>
              <div className="text-[9px] text-muted">رد شده</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black text-red-400">{toPersianDigits(result.errors.length)}</div>
              <div className="text-[9px] text-muted">خطا</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-500/5 rounded-lg p-2 mb-2">
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="text-[9px] text-red-400">- {e}</div>
              ))}
            </div>
          )}
          <button onClick={() => { setResult(null); setBackupData(null); setBackupMeta(null); }}
            className="text-[10px] text-primary font-bold">
            بازگشت
          </button>
        </div>
      )}
    </div>
  );
}

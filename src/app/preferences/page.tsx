"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Distinct car silhouettes — each body type is visually unique
const CATEGORIES = [
  {
    key: "sedan",
    label: "سدان",
    desc: "خانوادگی، راحت",
    icon: (
      // Long three-box profile: hood + cabin + trunk, low roof
      <svg width="52" height="26" viewBox="0 0 64 32" fill="none">
        <circle cx="16" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="48" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 25v-7l6-2 6-6h16l7 6 15 2v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 10l-4 6h20l-3-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: "suv",
    label: "شاسی‌بلند",
    desc: "قوی، بلند",
    icon: (
      // Tall boxy silhouette with big wheels
      <svg width="52" height="30" viewBox="0 0 64 34" fill="none">
        <circle cx="16" cy="27" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="48" cy="27" r="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M6 27v-13l4-3h44l4 3v13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 13h44M32 11v2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: "crossover",
    label: "کراس‌اوور",
    desc: "بین سدان و شاسی",
    icon: (
      // Sloped roof that descends toward the rear
      <svg width="52" height="28" viewBox="0 0 64 32" fill="none">
        <circle cx="16" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="48" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 25v-10l4-3h16l6 3 28 5v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l4 7h18l-3-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: "hatchback",
    label: "هاچبک",
    desc: "شهری، جمع‌وجور",
    icon: (
      // Short rear overhang, steep rear hatch
      <svg width="52" height="26" viewBox="0 0 64 32" fill="none">
        <circle cx="16" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="48" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 25v-7l4-3h9l5-6h14l7 5 12 4v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 9l-5 6h17l-3-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    ),
  },
  {
    key: "pickup",
    label: "وانت",
    desc: "بار، کاری",
    icon: (
      // Clearly two-section: cab (left) + open bed (right)
      <svg width="52" height="26" viewBox="0 0 64 32" fill="none">
        <circle cx="14" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <circle cx="46" cy="25" r="3.5" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M4 25v-7l4-3h10l4-6h12l4 9h26v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 18v7M20 9l-4 6h16l-3-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </svg>
    ),
  },
];

const ORIGINS = [
  { key: "iranian", label: "ایرانی", flag: "🇮🇷" },
  { key: "chinese", label: "چینی", flag: "🇨🇳" },
  { key: "korean", label: "کره‌ای", flag: "🇰🇷" },
  { key: "japanese", label: "ژاپنی", flag: "🇯🇵" },
  { key: "european", label: "اروپایی", flag: "🇪🇺" },
];

const POPULAR_BRANDS = [
  "ایران‌خودرو", "سایپا", "چری", "جک", "رنو", "ام‌وی‌ام",
  "هیوندای", "ام‌جی", "چانگان", "هوندا", "کیا", "جیلی",
  "تویوتا", "نیسان", "هاوال", "مزدا", "لاماری", "پژو",
];

function PreferencesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const budget = searchParams.get("budget") || "2500000000";

  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [excludedOrigins, setExcludedOrigins] = useState<string[]>([]);
  const [excludedBrands, setExcludedBrands] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferredCategories) setPreferredCategories(d.preferredCategories);
        if (d.excludedOrigins) setExcludedOrigins(d.excludedOrigins);
        if (d.excludedBrands) setExcludedBrands(d.excludedBrands);
      })
      .catch(() => {});
  }, []);

  const toggle = (arr: string[], setter: (v: string[]) => void, key: string) => {
    if (arr.includes(key)) setter(arr.filter((k) => k !== key));
    else setter([...arr, key]);
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredCategories, excludedOrigins, excludedBrands }),
    });
    router.push(`/explore?budget=${budget}`);
  };

  const skip = () => {
    router.push(`/explore?budget=${budget}`);
  };

  const totalChanges = preferredCategories.length + excludedOrigins.length + excludedBrands.length;

  return (
    <div className="flex-1 flex flex-col page-transition bg-background">
      {/* Compact header with progress */}
      <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-border px-5 pt-3 pb-2.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 flex gap-1">
            <div className="h-1 flex-1 bg-primary rounded-full" />
            <div className="h-1 flex-1 bg-primary rounded-full" />
            <div className="h-1 flex-1 bg-border rounded-full" />
          </div>
          <span className="text-[10px] font-bold text-muted">۲ از ۳</span>
        </div>
        <h1 className="text-base font-black">سلیقه‌ت رو بگو</h1>
        <p className="text-[11px] text-muted mt-0.5">با چند انتخاب، پیشنهادها دقیق‌تر می‌شن</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28 space-y-5">
        {/* ─── Body types ─── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-black">نوع بدنه دلخواه</h2>
              <p className="text-[10px] text-muted mt-0.5">می‌تونی چندتا انتخاب کنی</p>
            </div>
            {preferredCategories.length > 0 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {preferredCategories.length} انتخاب شده
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => {
              const selected = preferredCategories.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggle(preferredCategories, setPreferredCategories, c.key)}
                  className={`relative flex items-center gap-3 text-right px-3 py-2.5 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                    selected
                      ? "bg-primary/10 border-primary"
                      : "bg-surface border-border hover:border-muted/40"
                  }`}
                >
                  <div className={`shrink-0 ${selected ? "text-primary" : "text-muted"}`}>
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-black ${selected ? "text-primary" : "text-foreground"}`}>
                      {c.label}
                    </div>
                    <div className="text-[10px] text-muted mt-0.5 truncate">{c.desc}</div>
                  </div>
                  {selected && (
                    <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                  )}
                </button>
              );
            })}
            {/* 6th cell: smart placeholder / clear button */}
            {preferredCategories.length === 0 ? (
              <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl px-3 py-2.5 flex items-center justify-center text-center">
                <p className="text-[10px] text-primary/80 leading-5">
                  هیچ‌کدوم؟ <br />همه نوع‌ها نمایش داده می‌شن
                </p>
              </div>
            ) : (
              <button
                onClick={() => setPreferredCategories([])}
                className="bg-surface border-2 border-dashed border-border rounded-2xl px-3 py-2.5 flex items-center justify-center text-center hover:border-danger/30 hover:bg-danger/5 transition-colors"
              >
                <span className="text-[11px] font-bold text-muted">پاک کردن</span>
              </button>
            )}
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* ─── Excluded origins ─── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-black">
                کشورهای <span className="text-danger">ناپسند</span>
              </h2>
              <p className="text-[10px] text-muted mt-0.5">این کشورها در پیشنهادها نمایش داده نمی‌شن</p>
            </div>
            {excludedOrigins.length > 0 && (
              <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full">
                {excludedOrigins.length} حذف شده
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {ORIGINS.map((o) => {
              const excluded = excludedOrigins.includes(o.key);
              return (
                <button
                  key={o.key}
                  onClick={() => toggle(excludedOrigins, setExcludedOrigins, o.key)}
                  className={`relative flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl border-2 transition-all active:scale-[0.96] ${
                    excluded
                      ? "bg-danger/10 border-danger"
                      : "bg-surface border-border hover:border-muted/40"
                  }`}
                >
                  <span className={`text-xl leading-none ${excluded ? "grayscale opacity-50" : ""}`}>{o.flag}</span>
                  <span className={`text-[10px] font-bold ${excluded ? "text-danger line-through" : "text-foreground"}`}>
                    {o.label}
                  </span>
                  {excluded && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-danger rounded-full flex items-center justify-center shadow-sm">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* ─── Excluded brands ─── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-black">
                برندهای <span className="text-danger">ناپسند</span>
              </h2>
              <p className="text-[10px] text-muted mt-0.5">روی برندها بزن تا حذف بشن</p>
            </div>
            {excludedBrands.length > 0 && (
              <button
                onClick={() => setExcludedBrands([])}
                className="text-[10px] font-bold text-muted hover:text-danger transition-colors"
              >
                پاک کردن ({excludedBrands.length})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_BRANDS.map((b) => {
              const excluded = excludedBrands.includes(b);
              return (
                <button
                  key={b}
                  onClick={() => toggle(excludedBrands, setExcludedBrands, b)}
                  className={`relative px-3 py-1.5 rounded-full border transition-all text-[11px] font-bold ${
                    excluded
                      ? "bg-danger/10 border-danger text-danger pr-7"
                      : "bg-surface border-border text-foreground hover:border-muted/40"
                  }`}
                >
                  {excluded && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-danger rounded-full flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </span>
                  )}
                  {b}
                </button>
              );
            })}
          </div>
        </section>

        {/* Summary */}
        {totalChanges > 0 && (
          <div className="bg-linear-to-br from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <div className="text-[11px] leading-6 flex-1">
                <div className="font-bold text-foreground mb-1">خلاصه انتخاب‌هات</div>
                {preferredCategories.length > 0 && (
                  <div className="text-muted">
                    <span className="text-primary font-bold">فقط:</span> {preferredCategories.map(k => CATEGORIES.find(c => c.key === k)?.label).join("، ")}
                  </div>
                )}
                {excludedOrigins.length > 0 && (
                  <div className="text-muted">
                    <span className="text-danger font-bold">بدون:</span> {excludedOrigins.map(k => ORIGINS.find(o => o.key === k)?.label).join("، ")}
                  </div>
                )}
                {excludedBrands.length > 0 && (
                  <div className="text-muted">
                    <span className="text-danger font-bold">حذف برند:</span> {excludedBrands.join("، ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions — sticky CTA */}
      <div className="sticky bottom-14 px-5 pb-3 pt-3 bg-linear-to-t from-background via-background/95 to-transparent">
        <div className="flex gap-2 max-w-md mx-auto">
          <button
            onClick={skip}
            disabled={saving}
            className="py-3 px-5 bg-surface border border-border text-muted text-sm font-bold rounded-xl active:scale-[0.97] transition-all"
          >
            رد کردن
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-3 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/25 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {totalChanges > 0 ? "ذخیره و ادامه" : "ادامه"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <PreferencesContent />
    </Suspense>
  );
}

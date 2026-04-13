"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import { useAdmin } from "../../layout";

interface CarData {
  id: string;
  nameEn: string;
  nameFa: string;
  brand: string;
  brandFa: string;
  category: string;
  origin: string;
  year: number;
  priceMin: string;
  priceMax: string;
  description: string | null;
  isNew: boolean;
  imageUrl: string | null;
  scores: Record<string, number> | null;
  specs: Record<string, unknown> | null;
  intel: Record<string, unknown> | null;
  tags: { id: string; tag: string }[];
  reviews: { id: string }[];
  _count?: { sources: number };
}

const SCORE_FIELDS = [
  { key: "comfort", label: "راحتی" }, { key: "performance", label: "عملکرد" },
  { key: "economy", label: "صرفه اقتصادی" }, { key: "safety", label: "ایمنی" },
  { key: "prestige", label: "پرستیژ" }, { key: "reliability", label: "اطمینان" },
  { key: "resaleValue", label: "نقدشوندگی" }, { key: "familyFriendly", label: "خانوادگی" },
  { key: "sportiness", label: "اسپرت" }, { key: "offroad", label: "آفرود" },
  { key: "cityDriving", label: "شهری" }, { key: "longTrip", label: "سفر" },
  { key: "maintenanceRisk", label: "ریسک نگهداری" }, { key: "afterSales", label: "خدمات پس فروش" },
];

const SPEC_FIELDS = [
  { key: "engine", label: "موتور", type: "text" },
  { key: "horsepower", label: "اسب بخار", type: "number" },
  { key: "torque", label: "گشتاور", type: "number" },
  { key: "transmission", label: "گیربکس", type: "select", options: ["automatic", "manual", "CVT"] },
  { key: "fuelType", label: "سوخت", type: "select", options: ["gasoline", "diesel", "hybrid", "electric"] },
  { key: "fuelConsumption", label: "مصرف (لیتر/۱۰۰کم)", type: "number" },
  { key: "acceleration", label: "۰-۱۰۰ (ثانیه)", type: "number" },
  { key: "seatingCapacity", label: "ظرفیت سرنشین", type: "number" },
];

const INTEL_SCORE_FIELDS = [
  { key: "acceleration", label: "شتاب" }, { key: "depreciation", label: "استهلاک" },
  { key: "repairCost", label: "هزینه تعمیر" }, { key: "secondHandMarket", label: "بازار دست‌دوم" },
  { key: "priceDropRate", label: "افت قیمت" }, { key: "buildQuality", label: "کیفیت ساخت" },
  { key: "afterSalesService", label: "خدمات پس فروش" }, { key: "ownerSatisfaction", label: "رضایت مالکان" },
  { key: "purchaseRisk", label: "ریسک خرید" }, { key: "fuelEconomy", label: "بهره‌وری سوخت" },
  { key: "suitFamily", label: "تناسب خانواده" }, { key: "suitCity", label: "تناسب شهری" },
  { key: "suitTravel", label: "تناسب سفر" }, { key: "suitYoung", label: "تناسب جوان" },
  { key: "suitInvestment", label: "تناسب سرمایه" },
];

const INTEL_TEXT_FIELDS = [
  { key: "overallSummary", label: "جمع‌بندی کلی" }, { key: "whyBuy", label: "چرا بخری" },
  { key: "whyNotBuy", label: "چرا نخری" }, { key: "ownerVerdict", label: "نظر مالکان" },
];

const INTEL_ARRAY_FIELDS = [
  { key: "frequentPros", label: "نقاط قوت" }, { key: "frequentCons", label: "نقاط ضعف" },
  { key: "commonIssues", label: "خرابی‌های رایج" }, { key: "purchaseWarnings", label: "هشدارهای خرید" },
];

function formatBillions(toman: string): string {
  const n = parseInt(toman);
  if (!n || n <= 0) return "";
  return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "");
}

function fromBillions(b: string): string {
  const n = parseFloat(b);
  if (isNaN(n) || n <= 0) return "0";
  return Math.round(n * 1_000_000_000).toString();
}

export default function AdminCarEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { fetchAdmin } = useAdmin();
  const router = useRouter();

  const [car, setCar] = useState<CarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "scores" | "specs" | "intel">("basic");

  // Editable state
  const [basic, setBasic] = useState<Record<string, string | number | boolean>>({});
  const [priceMinB, setPriceMinB] = useState("");
  const [priceMaxB, setPriceMaxB] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [specs, setSpecs] = useState<Record<string, string | number | null>>({});
  const [intel, setIntel] = useState<Record<string, unknown>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Quick stats
  const [sourcesCount, setSourcesCount] = useState(0);

  useEffect(() => {
    fetchAdmin(`/api/admin/cars?full=true`)
      .then((r) => r.json())
      .then((data: CarData[]) => {
        const found = data.find((c) => c.id === id);
        if (found) {
          setCar(found);
          setBasic({
            nameEn: found.nameEn, nameFa: found.nameFa,
            brand: found.brand, brandFa: found.brandFa,
            category: found.category, origin: found.origin,
            year: found.year,
            description: found.description || "", isNew: found.isNew,
          });
          setPriceMinB(formatBillions(found.priceMin));
          setPriceMaxB(formatBillions(found.priceMax));
          if (found.scores) setScores(found.scores as Record<string, number>);
          if (found.specs) setSpecs(found.specs as Record<string, string | number | null>);
          if (found.intel) setIntel(found.intel as Record<string, unknown>);
          setTags(found.tags.map((t) => t.tag));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Get sources count
    fetchAdmin(`/api/admin/cars/${id}/data-inventory`)
      .then((r) => r.json())
      .then((d) => { if (d.summary) setSourcesCount(d.summary.totalSources); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      payload.car = {
        nameEn: basic.nameEn, nameFa: basic.nameFa,
        brand: basic.brand, brandFa: basic.brandFa,
        category: basic.category, origin: basic.origin,
        year: Number(basic.year),
        priceMin: fromBillions(priceMinB), priceMax: fromBillions(priceMaxB),
        description: basic.description || null, isNew: basic.isNew,
      };

      const scoreData: Record<string, number> = {};
      for (const f of SCORE_FIELDS) scoreData[f.key] = scores[f.key] ?? 5;
      payload.scores = scoreData;

      const specData: Record<string, unknown> = {};
      for (const f of SPEC_FIELDS) {
        const val = specs[f.key];
        specData[f.key] = f.type === "number" ? (val ? Number(val) : null) : val || null;
      }
      payload.specs = specData;

      const intelData: Record<string, unknown> = {};
      for (const f of INTEL_SCORE_FIELDS) intelData[f.key] = Number(intel[f.key]) || 5;
      for (const f of INTEL_TEXT_FIELDS) intelData[f.key] = (intel[f.key] as string) || "";
      for (const f of INTEL_ARRAY_FIELDS) intelData[f.key] = (intel[f.key] as string[]) || [];
      payload.intel = intelData;
      payload.tags = tags;

      await fetchAdmin(`/api/admin/cars/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showToast("ذخیره شد");
    } catch {
      showToast("خطا در ذخیره");
    }
    setSaving(false);
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) { setTags([...tags, newTag]); setNewTag(""); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!car) return <div className="p-8 text-muted">خودرو پیدا نشد</div>;

  // Health dots
  const healthDots = [
    { ok: !!car.scores, label: "امتیاز" },
    { ok: !!car.specs, label: "مشخصات" },
    { ok: !!car.intel && !!(car.intel as Record<string, unknown>).overallSummary, label: "تحلیل" },
    { ok: (car.reviews?.length || 0) >= 2, label: "نظر" },
    { ok: sourcesCount >= 2, label: "منبع" },
    { ok: !!car.imageUrl, label: "تصویر" },
  ];
  const healthCount = healthDots.filter((d) => d.ok).length;

  const TABS = [
    { key: "basic" as const, label: "پایه", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { key: "scores" as const, label: "امتیازات", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
    { key: "specs" as const, label: "فنی", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573" },
    { key: "intel" as const, label: "هوش", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3" },
  ];

  return (
    <div className="p-5 max-w-5xl">
      {/* ─── Header with car info + quick stats ─── */}
      <div className="bg-surface rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-start gap-4">
          {/* Back + Image */}
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => router.push("/admin/cars")} className="p-1 text-muted hover:text-foreground" title="بازگشت">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            {car.imageUrl ? (
              <img src={car.imageUrl} alt={car.nameFa} className="w-16 h-12 object-cover rounded-lg border border-border" />
            ) : (
              <div className="w-16 h-12 bg-background rounded-lg border border-dashed border-border flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/30">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black">{car.nameFa}</h1>
              <span className="text-[10px] text-muted">{car.nameEn}</span>
              {car.isNew && <span className="text-[8px] bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">نو</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted">{car.brandFa}</span>
              <span className="text-muted/30">·</span>
              <span className="text-[10px] text-muted">{getOriginLabel(car.origin)}</span>
              <span className="text-muted/30">·</span>
              <span className="text-[10px] text-muted">{getCategoryLabel(car.category)}</span>
              <span className="text-muted/30">·</span>
              <span className="text-[10px] text-muted">{toPersianDigits(car.year)}</span>
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-3 mt-2">
              {/* Health dots */}
              <div className="flex items-center gap-1" title={healthDots.map((d) => `${d.ok ? "+" : "-"}${d.label}`).join(" ")}>
                {healthDots.map((d, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${d.ok ? "bg-emerald-500" : "bg-red-400/40"}`} title={d.label} />
                ))}
                <span className={`text-[9px] font-black mr-0.5 ${healthCount >= 5 ? "text-emerald-600" : healthCount >= 3 ? "text-amber-600" : "text-red-500"}`}>
                  {toPersianDigits(healthCount)}/۶
                </span>
              </div>
              <div className="h-3 w-px bg-border" />
              <span className="text-[9px] text-muted">{toPersianDigits(sourcesCount)} منبع</span>
              <span className="text-[9px] text-muted">{toPersianDigits(car.reviews?.length || 0)} نظر</span>
              <span className="text-[9px] text-muted">{toPersianDigits(tags.length)} تگ</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white font-bold text-[11px] rounded-xl disabled:opacity-50 shadow-sm shadow-primary/20"
            >
              {saving ? "..." : "ذخیره تغییرات"}
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => router.push(`/admin/cars/${id}/data`)}
                className="flex-1 px-2 py-1.5 text-[9px] font-bold text-accent bg-accent/5 border border-accent/15 rounded-lg hover:bg-accent/10 text-center"
              >
                دیتای خام
              </button>
              <button
                onClick={() => router.push("/admin/prices")}
                className="flex-1 px-2 py-1.5 text-[9px] font-bold text-primary bg-primary/5 border border-primary/15 rounded-lg hover:bg-primary/10 text-center"
              >
                قیمت‌ها
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 mb-4 bg-background rounded-xl p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === tab.key ? "bg-surface text-foreground shadow-sm" : "text-muted"
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={activeTab === tab.key ? "text-primary" : "text-muted/50"}>
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Basic Info Tab ─── */}
      {activeTab === "basic" && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-border p-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "nameFa", label: "نام فارسی" },
                { key: "nameEn", label: "نام انگلیسی" },
                { key: "brandFa", label: "برند فارسی" },
                { key: "brand", label: "برند انگلیسی" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-[10px] text-muted block mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={String(basic[f.key] || "")}
                    onChange={(e) => setBasic({ ...basic, [f.key]: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>

            {/* Price + Year + Origin + Category — one row */}
            <div className="grid grid-cols-5 gap-3 mt-3">
              <div>
                <label className="text-[10px] text-muted block mb-1">حداقل (میلیارد)</label>
                <input type="text" value={priceMinB} onChange={(e) => setPriceMinB(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">حداکثر (میلیارد)</label>
                <input type="text" value={priceMaxB} onChange={(e) => setPriceMaxB(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">سال</label>
                <input type="text" value={String(basic.year || "")} onChange={(e) => setBasic({ ...basic, year: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">مبدا</label>
                <select value={String(basic.origin || "")} onChange={(e) => setBasic({ ...basic, origin: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none">
                  {["iranian", "chinese", "korean", "japanese", "european"].map((o) => <option key={o} value={o}>{getOriginLabel(o)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">دسته</label>
                <select value={String(basic.category || "")} onChange={(e) => setBasic({ ...basic, category: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none">
                  {["sedan", "suv", "hatchback", "crossover", "pickup"].map((c) => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="mt-3">
              <label className="text-[10px] text-muted block mb-1">توضیحات</label>
              <textarea value={String(basic.description || "")} onChange={(e) => setBasic({ ...basic, description: e.target.value })}
                rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary resize-none leading-5" />
            </div>
          </div>

          {/* Image + Tags inline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-2xl border border-border p-4">
              <label className="text-[10px] text-muted block mb-2">تصویر خودرو</label>
              <div className="flex items-center gap-2">
                {car.imageUrl ? (
                  <img src={car.imageUrl} alt={car.nameFa} className="w-16 h-11 object-cover rounded-lg border border-border" />
                ) : (
                  <div className="w-16 h-11 bg-background rounded-lg border border-dashed border-border" />
                )}
                <label className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold cursor-pointer hover:bg-border/50">
                  آپلود
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const formData = new FormData(); formData.append("file", file); formData.append("carId", id);
                      const res = await fetchAdmin("/api/admin/upload", { method: "POST", body: formData });
                      if (res.ok) { const data = await res.json(); setCar({ ...car, imageUrl: data.imageUrl } as CarData); showToast("آپلود شد"); }
                    }} />
                </label>
              </div>
            </div>
            <div className="bg-surface rounded-2xl border border-border p-4">
              <label className="text-[10px] text-muted block mb-2">تگ‌ها</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    {tag}
                    <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-primary/50 hover:text-primary">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="تگ جدید..." className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-[10px] outline-none" />
                <button onClick={addTag} className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg">+</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Scores Tab ─── */}
      {activeTab === "scores" && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="grid grid-cols-2 gap-3">
            {SCORE_FIELDS.map((f) => {
              const val = scores[f.key] ?? 5;
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="text-[10px] font-bold w-24 shrink-0">{f.label}</label>
                  <input type="range" min={1} max={10} value={val}
                    onChange={(e) => setScores({ ...scores, [f.key]: Number(e.target.value) })} className="flex-1" />
                  <span className="text-xs font-black text-primary w-6 text-center">{toPersianDigits(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Specs Tab ─── */}
      {activeTab === "specs" && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="grid grid-cols-2 gap-3">
            {SPEC_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] text-muted block mb-1">{f.label}</label>
                {f.type === "select" ? (
                  <select value={String(specs[f.key] || "")} onChange={(e) => setSpecs({ ...specs, [f.key]: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none">
                    <option value="">-</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={specs[f.key] ?? ""}
                    onChange={(e) => setSpecs({ ...specs, [f.key]: f.type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Intel Tab ─── */}
      {activeTab === "intel" && (
        <div className="space-y-3">
          {/* Intel Scores */}
          <div className="bg-surface rounded-2xl border border-border p-4">
            <h3 className="text-[11px] font-black mb-2">امتیازات هوشمند</h3>
            <div className="grid grid-cols-3 gap-2">
              {INTEL_SCORE_FIELDS.map((f) => {
                const val = Number(intel[f.key]) || 5;
                return (
                  <div key={f.key} className="flex items-center gap-1.5">
                    <label className="text-[9px] font-bold w-20 shrink-0 truncate">{f.label}</label>
                    <input type="range" min={1} max={10} value={val}
                      onChange={(e) => setIntel({ ...intel, [f.key]: Number(e.target.value) })} className="flex-1" />
                    <span className="text-[10px] font-black text-primary w-5 text-center">{toPersianDigits(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Intel Text */}
          <div className="bg-surface rounded-2xl border border-border p-4">
            <h3 className="text-[11px] font-black mb-2">متون تحلیلی</h3>
            <div className="grid grid-cols-2 gap-3">
              {INTEL_TEXT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-[10px] text-muted block mb-1">{f.label}</label>
                  <textarea value={String(intel[f.key] || "")} onChange={(e) => setIntel({ ...intel, [f.key]: e.target.value })}
                    rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary resize-none leading-5" />
                </div>
              ))}
            </div>
          </div>

          {/* Intel Arrays */}
          <div className="bg-surface rounded-2xl border border-border p-4">
            <h3 className="text-[11px] font-black mb-2">لیست‌ها</h3>
            <div className="grid grid-cols-2 gap-3">
              {INTEL_ARRAY_FIELDS.map((f) => {
                const items = (intel[f.key] as string[]) || [];
                return (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold block mb-1">{f.label} ({toPersianDigits(items.length)})</label>
                    <div className="space-y-0.5 mb-1.5">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input type="text" value={item}
                            onChange={(e) => { const n = [...items]; n[i] = e.target.value; setIntel({ ...intel, [f.key]: n }); }}
                            className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] outline-none" />
                          <button onClick={() => setIntel({ ...intel, [f.key]: items.filter((_, j) => j !== i) })} className="text-muted/50 hover:text-red-500">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setIntel({ ...intel, [f.key]: [...items, ""] })} className="text-[9px] text-primary font-bold">+ افزودن</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

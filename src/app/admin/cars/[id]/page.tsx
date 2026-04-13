"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toPersianDigits } from "@/lib/utils";
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
}

const SCORE_FIELDS = [
  { key: "comfort", label: "راحتی" },
  { key: "performance", label: "عملکرد" },
  { key: "economy", label: "صرفه اقتصادی" },
  { key: "safety", label: "ایمنی" },
  { key: "prestige", label: "پرستیژ" },
  { key: "reliability", label: "اطمینان" },
  { key: "resaleValue", label: "نقدشوندگی" },
  { key: "familyFriendly", label: "خانوادگی" },
  { key: "sportiness", label: "اسپرت" },
  { key: "offroad", label: "آفرود" },
  { key: "cityDriving", label: "شهری" },
  { key: "longTrip", label: "سفر" },
  { key: "maintenanceRisk", label: "ریسک نگهداری" },
  { key: "afterSales", label: "خدمات پس فروش" },
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
  { key: "acceleration", label: "شتاب" },
  { key: "depreciation", label: "استهلاک" },
  { key: "repairCost", label: "هزینه تعمیر" },
  { key: "secondHandMarket", label: "بازار دست‌دوم" },
  { key: "priceDropRate", label: "افت قیمت" },
  { key: "buildQuality", label: "کیفیت ساخت" },
  { key: "afterSalesService", label: "خدمات پس فروش" },
  { key: "ownerSatisfaction", label: "رضایت مالکان" },
  { key: "purchaseRisk", label: "ریسک خرید" },
  { key: "fuelEconomy", label: "بهره‌وری سوخت" },
  { key: "suitFamily", label: "تناسب خانواده" },
  { key: "suitCity", label: "تناسب شهری" },
  { key: "suitTravel", label: "تناسب سفر" },
  { key: "suitYoung", label: "تناسب جوان" },
  { key: "suitInvestment", label: "تناسب سرمایه" },
];

const INTEL_TEXT_FIELDS = [
  { key: "overallSummary", label: "جمع‌بندی کلی" },
  { key: "whyBuy", label: "چرا بخری" },
  { key: "whyNotBuy", label: "چرا نخری" },
  { key: "ownerVerdict", label: "نظر مالکان" },
];

const INTEL_ARRAY_FIELDS = [
  { key: "frequentPros", label: "نقاط قوت" },
  { key: "frequentCons", label: "نقاط ضعف" },
  { key: "commonIssues", label: "خرابی‌های رایج" },
  { key: "purchaseWarnings", label: "هشدارهای خرید" },
];

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
  const [scores, setScores] = useState<Record<string, number>>({});
  const [specs, setSpecs] = useState<Record<string, string | number | null>>({});
  const [intel, setIntel] = useState<Record<string, unknown>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

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
            year: found.year, priceMin: found.priceMin, priceMax: found.priceMax,
            description: found.description || "", isNew: found.isNew,
          });
          if (found.scores) setScores(found.scores as Record<string, number>);
          if (found.specs) setSpecs(found.specs as Record<string, string | number | null>);
          if (found.intel) setIntel(found.intel as Record<string, unknown>);
          setTags(found.tags.map((t) => t.tag));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build update payload
      const payload: Record<string, unknown> = {};

      payload.car = {
        nameEn: basic.nameEn, nameFa: basic.nameFa,
        brand: basic.brand, brandFa: basic.brandFa,
        category: basic.category, origin: basic.origin,
        year: Number(basic.year),
        priceMin: basic.priceMin?.toString(), priceMax: basic.priceMax?.toString(),
        description: basic.description || null, isNew: basic.isNew,
      };

      // Only send scores that are actual score fields
      const scoreData: Record<string, number> = {};
      for (const f of SCORE_FIELDS) {
        scoreData[f.key] = scores[f.key] ?? 5;
      }
      payload.scores = scoreData;

      // Specs
      const specData: Record<string, unknown> = {};
      for (const f of SPEC_FIELDS) {
        const val = specs[f.key];
        specData[f.key] = f.type === "number" ? (val ? Number(val) : null) : val || null;
      }
      payload.specs = specData;

      // Intel
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
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!car) return <div className="p-8 text-muted">خودرو پیدا نشد</div>;

  const TABS = [
    { key: "basic" as const, label: "اطلاعات پایه" },
    { key: "scores" as const, label: "امتیازات" },
    { key: "specs" as const, label: "مشخصات فنی" },
    { key: "intel" as const, label: "هوش خودرو" },
  ];

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/cars")} className="p-1 text-muted hover:text-foreground" title="بازگشت به خودروها">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-black">{car.nameFa}</h1>
            <p className="text-xs text-muted">{car.nameEn} | {car.brandFa}</p>
          </div>
          <button
            onClick={() => router.push("/admin/prices")}
            className="mr-2 px-2.5 py-1 text-[10px] font-bold text-primary bg-primary/5 border border-primary/15 rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></svg>
            قیمت‌ها
          </button>
          <button
            onClick={() => router.push(`/admin/cars/${id}/data`)}
            className="px-2.5 py-1 text-[10px] font-bold text-accent bg-accent/5 border border-accent/15 rounded-lg hover:bg-accent/10 transition-colors flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8" /></svg>
            دیتای خام
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-primary text-white font-bold text-sm rounded-xl disabled:opacity-50"
        >
          {saving ? "..." : "ذخیره"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-background rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === tab.key ? "bg-surface text-foreground shadow-sm" : "text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Info Tab */}
      {activeTab === "basic" && (
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "nameFa", label: "نام فارسی" },
              { key: "nameEn", label: "نام انگلیسی" },
              { key: "brandFa", label: "برند فارسی" },
              { key: "brand", label: "برند انگلیسی" },
              { key: "priceMin", label: "قیمت حداقل (تومان)" },
              { key: "priceMax", label: "قیمت حداکثر (تومان)" },
              { key: "year", label: "سال" },
            ].map((f) => (
              <div key={f.key}>
                <label className="text-[11px] text-muted block mb-1">{f.label}</label>
                <input
                  type="text"
                  value={String(basic[f.key] || "")}
                  onChange={(e) => setBasic({ ...basic, [f.key]: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-muted block mb-1">مبدا</label>
              <select
                value={String(basic.origin || "")}
                onChange={(e) => setBasic({ ...basic, origin: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none"
              >
                {["iranian", "chinese", "korean", "japanese", "european"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">دسته</label>
              <select
                value={String(basic.category || "")}
                onChange={(e) => setBasic({ ...basic, category: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none"
              >
                {["sedan", "suv", "hatchback", "crossover", "pickup"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-muted block mb-1">توضیحات</label>
            <textarea
              value={String(basic.description || "")}
              onChange={(e) => setBasic({ ...basic, description: e.target.value })}
              rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-[11px] text-muted block mb-1">تصویر خودرو</label>
            <div className="flex items-center gap-3">
              {car.imageUrl ? (
                <img src={car.imageUrl} alt={car.nameFa} className="w-20 h-14 object-cover rounded-lg border border-border" />
              ) : (
                <div className="w-20 h-14 bg-background rounded-lg border border-dashed border-border flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted/40">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
              <label className="px-3 py-1.5 bg-background border border-border rounded-lg text-[11px] font-bold cursor-pointer hover:bg-border/50 transition-colors">
                آپلود
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("carId", id);
                    const res = await fetchAdmin("/api/admin/upload", { method: "POST", body: formData });
                    if (res.ok) {
                      const data = await res.json();
                      setCar({ ...car, imageUrl: data.imageUrl } as CarData);
                      showToast("تصویر آپلود شد");
                    } else {
                      showToast("خطا در آپلود");
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] text-muted block mb-1">تگ‌ها</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))} className="text-primary/50 hover:text-primary">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="تگ جدید..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none"
              />
              <button onClick={addTag} className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg">
                افزودن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scores Tab */}
      {activeTab === "scores" && (
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="grid grid-cols-2 gap-4">
            {SCORE_FIELDS.map((f) => {
              const val = scores[f.key] ?? 5;
              return (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold">{f.label}</label>
                    <span className="text-sm font-black text-primary">{toPersianDigits(val)}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={val}
                    onChange={(e) => setScores({ ...scores, [f.key]: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Specs Tab */}
      {activeTab === "specs" && (
        <div className="bg-surface rounded-2xl border border-border p-5">
          <div className="grid grid-cols-2 gap-4">
            {SPEC_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-[11px] text-muted block mb-1">{f.label}</label>
                {f.type === "select" ? (
                  <select
                    value={String(specs[f.key] || "")}
                    onChange={(e) => setSpecs({ ...specs, [f.key]: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    <option value="">-</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    value={specs[f.key] ?? ""}
                    onChange={(e) => setSpecs({ ...specs, [f.key]: f.type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intel Tab */}
      {activeTab === "intel" && (
        <div className="space-y-4">
          {/* Intel Scores */}
          <div className="bg-surface rounded-2xl border border-border p-5">
            <h3 className="text-xs font-black mb-3">امتیازات هوشمند</h3>
            <div className="grid grid-cols-3 gap-4">
              {INTEL_SCORE_FIELDS.map((f) => {
                const val = Number(intel[f.key]) || 5;
                return (
                  <div key={f.key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold">{f.label}</label>
                      <span className="text-xs font-black text-primary">{toPersianDigits(val)}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={val}
                      onChange={(e) => setIntel({ ...intel, [f.key]: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Intel Text */}
          <div className="bg-surface rounded-2xl border border-border p-5">
            <h3 className="text-xs font-black mb-3">متون تحلیلی</h3>
            <div className="space-y-3">
              {INTEL_TEXT_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-[11px] text-muted block mb-1">{f.label}</label>
                  <textarea
                    value={String(intel[f.key] || "")}
                    onChange={(e) => setIntel({ ...intel, [f.key]: e.target.value })}
                    rows={2}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Intel Arrays */}
          <div className="bg-surface rounded-2xl border border-border p-5">
            <h3 className="text-xs font-black mb-3">لیست‌ها</h3>
            <div className="space-y-4">
              {INTEL_ARRAY_FIELDS.map((f) => {
                const items = (intel[f.key] as string[]) || [];
                return (
                  <div key={f.key}>
                    <label className="text-[11px] font-bold block mb-1">{f.label}</label>
                    <div className="space-y-1 mb-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[i] = e.target.value;
                              setIntel({ ...intel, [f.key]: newItems });
                            }}
                            className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs outline-none"
                          />
                          <button
                            onClick={() => setIntel({ ...intel, [f.key]: items.filter((_, j) => j !== i) })}
                            className="text-danger/50 hover:text-danger"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setIntel({ ...intel, [f.key]: [...items, ""] })}
                      className="text-[10px] text-primary font-bold"
                    >
                      + افزودن مورد جدید
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50" style={{ animation: "fadeIn 0.2s ease-out" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

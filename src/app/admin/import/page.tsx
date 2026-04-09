"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toPersianDigits, formatPrice, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface ExistingCar {
  id: string; nameEn: string; nameFa: string; brandFa: string; origin: string; category: string;
  priceMin: string; priceMax: string;
}

interface PreviewCar {
  nameEn: string; nameFa: string; brand?: string; brandFa: string;
  category: string; origin: string; year?: number;
  priceMin: string | number; priceMax: string | number;
  description?: string; tags?: string[]; scores?: Record<string, number>;
  specs?: Record<string, unknown>; intelligence?: Record<string, unknown>;
  _match?: { type: "exact" | "similar" | "new"; car?: ExistingCar };
}

interface ImportResult {
  total: number; created: number; updated: number; skipped: number; errors: string[];
}

const ORIGINS = [
  { key: "iranian", label: "ایرانی" }, { key: "chinese", label: "چینی" },
  { key: "korean", label: "کره‌ای" }, { key: "japanese", label: "ژاپنی" },
  { key: "european", label: "اروپایی" },
];
const CATEGORIES = [
  { key: "sedan", label: "سدان" }, { key: "suv", label: "شاسی‌بلند" },
  { key: "hatchback", label: "هاچبک" }, { key: "crossover", label: "کراس‌اوور" },
  { key: "pickup", label: "وانت" },
];

// Billion helpers
const toBillions = (toman: string | number): string => {
  const n = typeof toman === "string" ? parseInt(toman) : toman;
  if (!n || n === 0) return "";
  return (n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "");
};
const fromBillions = (b: string): string => {
  const n = parseFloat(b);
  if (isNaN(n) || n <= 0) return "0";
  return Math.round(n * 1_000_000_000).toString();
};
const formatBillion = (toman: string | number): string => {
  const n = typeof toman === "string" ? parseInt(toman) : toman;
  if (!n || n === 0) return "—";
  if (n >= 1_000_000_000) return `${toPersianDigits((n / 1_000_000_000).toFixed(1).replace(/\.0$/, ""))} میلیارد`;
  if (n >= 1_000_000) return `${toPersianDigits(Math.round(n / 1_000_000))} میلیون`;
  return toPersianDigits(formatPrice(String(n)));
};

export default function AdminImportPage() {
  const { fetchAdmin } = useAdmin();
  const router = useRouter();
  const [tab, setTab] = useState<"single" | "json" | "file">("single");
  const [existingCars, setExistingCars] = useState<ExistingCar[]>([]);
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [toast, setToast] = useState<string | null>(null);

  // Single form — prices stored as billion strings for display
  const [single, setSingle] = useState({
    nameEn: "", nameFa: "", brandFa: "", brand: "",
    category: "sedan", origin: "iranian", year: 1403,
    priceMinB: "", priceMaxB: "", description: "",
  });
  const [singleMatch, setSingleMatch] = useState<{ type: string; car?: ExistingCar } | null>(null);

  // JSON/File
  const [jsonInput, setJsonInput] = useState("");
  const [preview, setPreview] = useState<PreviewCar[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetchAdmin("/api/admin/cars").then((r: Response) => r.json())
      .then((d: ExistingCar[]) => setExistingCars(d))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-enrich from Persian name ──
  function enrichFromName(name: string): PreviewCar {
    const n = name.trim();

    const BRAND_RULES: { keywords: string[]; brandFa: string; brand: string; origin: string; defaultCat: string }[] = [
      { keywords: ["تارا", "دنا", "سمند", "پژو", "هایما", "رانا", "سهند"], brandFa: "ایران‌خودرو", brand: "IKCO", origin: "iranian", defaultCat: "sedan" },
      { keywords: ["شاهین", "کوییک", "ساینا", "تیبا", "ریرا", "ری‌را", "آریسان", "رسپکت", "سایپا", "سراتو سایپا"], brandFa: "سایپا", brand: "SAIPA", origin: "iranian", defaultCat: "sedan" },
      { keywords: ["زامیاد"], brandFa: "زامیاد", brand: "Zamyad", origin: "iranian", defaultCat: "pickup" },
      { keywords: ["تندر"], brandFa: "ایران‌خودرو", brand: "IKCO", origin: "iranian", defaultCat: "sedan" },
      { keywords: ["ام‌وی‌ام", "MVM"], brandFa: "ام‌وی‌ام", brand: "MVM", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["چری", "تیگو", "آریزو"], brandFa: "چری", brand: "Chery", origin: "chinese", defaultCat: "suv" },
      { keywords: ["فونیکس"], brandFa: "فونیکس", brand: "Fownix", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["چانگان"], brandFa: "چانگان", brand: "Changan", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["هاوال"], brandFa: "هاوال", brand: "Haval", origin: "chinese", defaultCat: "suv" },
      { keywords: ["جک", "JAC"], brandFa: "جک", brand: "JAC", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["بایک", "BAIC"], brandFa: "بایک", brand: "BAIC", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["دانگ‌فنگ"], brandFa: "دانگ‌فنگ", brand: "Dongfeng", origin: "chinese", defaultCat: "suv" },
      { keywords: ["جیلی"], brandFa: "جیلی", brand: "Geely", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["بی‌وای‌دی", "BYD"], brandFa: "بی‌وای‌دی", brand: "BYD", origin: "chinese", defaultCat: "suv" },
      { keywords: ["لیفان"], brandFa: "لیفان", brand: "Lifan", origin: "chinese", defaultCat: "suv" },
      { keywords: ["کی‌ام‌سی", "KMC"], brandFa: "کرمان‌موتور", brand: "KMC", origin: "chinese", defaultCat: "suv" },
      { keywords: ["ام‌جی", "MG"], brandFa: "ام‌جی", brand: "MG", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["بستیون"], brandFa: "بستیون", brand: "Bestune", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["بسترن"], brandFa: "بسترن", brand: "Besturn", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["دایون"], brandFa: "دایون", brand: "Dayun", origin: "chinese", defaultCat: "suv" },
      { keywords: ["گک", "GAC"], brandFa: "جک", brand: "GAC", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["تیگارد"], brandFa: "تیگارد", brand: "Tigard", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["تیسان"], brandFa: "تیسان", brand: "Tissan", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["دیگنیتی"], brandFa: "بهمن‌موتور", brand: "Dignity", origin: "chinese", defaultCat: "suv" },
      { keywords: ["فردا"], brandFa: "فردا موتورز", brand: "Farda", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["لاماری"], brandFa: "لاماری", brand: "Lamari", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["لونا"], brandFa: "لونا", brand: "Luna", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["لوکانو"], brandFa: "لوکانو", brand: "Lucano", origin: "chinese", defaultCat: "suv" },
      { keywords: ["ونوسیا"], brandFa: "ونوسیا", brand: "Venucia", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["وویا"], brandFa: "وویا", brand: "Voyah", origin: "chinese", defaultCat: "suv" },
      { keywords: ["ولکس"], brandFa: "ولکس", brand: "Voleex", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["آمیکو"], brandFa: "آمیکو", brand: "Amico", origin: "chinese", defaultCat: "sedan" },
      { keywords: ["اطلس"], brandFa: "اطلس", brand: "Atlas", origin: "chinese", defaultCat: "crossover" },
      { keywords: ["کلوت"], brandFa: "کلوت", brand: "Kalout", origin: "iranian", defaultCat: "crossover" },
      { keywords: ["بک", "Buick"], brandFa: "بیوک", brand: "Buick", origin: "chinese", defaultCat: "suv" },
      { keywords: ["هیوندای"], brandFa: "هیوندای", brand: "Hyundai", origin: "korean", defaultCat: "sedan" },
      { keywords: ["کیا"], brandFa: "کیا", brand: "KIA", origin: "korean", defaultCat: "sedan" },
      { keywords: ["سانگ‌یانگ"], brandFa: "سانگ‌یانگ", brand: "SsangYong", origin: "korean", defaultCat: "suv" },
      { keywords: ["تویوتا"], brandFa: "تویوتا", brand: "Toyota", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["نیسان"], brandFa: "نیسان", brand: "Nissan", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["هوندا"], brandFa: "هوندا", brand: "Honda", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["مزدا"], brandFa: "مزدا", brand: "Mazda", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["میتسوبیشی"], brandFa: "میتسوبیشی", brand: "Mitsubishi", origin: "japanese", defaultCat: "suv" },
      { keywords: ["سوزوکی"], brandFa: "سوزوکی", brand: "Suzuki", origin: "japanese", defaultCat: "hatchback" },
      { keywords: ["رنو"], brandFa: "رنو", brand: "Renault", origin: "european", defaultCat: "sedan" },
      { keywords: ["پژو"], brandFa: "پژو", brand: "Peugeot", origin: "european", defaultCat: "sedan" },
      { keywords: ["بی‌ام‌و", "BMW"], brandFa: "بی‌ام‌و", brand: "BMW", origin: "european", defaultCat: "sedan" },
      { keywords: ["آئودی", "Audi"], brandFa: "آئودی", brand: "Audi", origin: "european", defaultCat: "suv" },
      { keywords: ["فولکس"], brandFa: "فولکس‌واگن", brand: "Volkswagen", origin: "european", defaultCat: "crossover" },
      { keywords: ["لکسوس"], brandFa: "لکسوس", brand: "Lexus", origin: "japanese", defaultCat: "suv" },
    ];

    const CAT_HINTS: { keywords: string[]; category: string }[] = [
      { keywords: ["وانت", "پیکاپ"], category: "pickup" },
      { keywords: ["کراس", "X33", "X55", "CS35", "FX", "HR-V", "وزل", "C-HR", "ASX", "GS3", "CX-"], category: "crossover" },
      { keywords: ["شاسی", "SUV", "توسان", "سانتافه", "اسپورتیج", "سورنتو", "RAV", "CX-5", "اوتلندر", "CR-V", "H6", "H2", "X70", "K7", "AX7", "ایکس‌تریل", "سانگ", "تیگو", "ID4", "Q5", "X2", "سری ۵", "کولئوس", "داستر", "قشقایی", "7x", "8S"], category: "suv" },
      { keywords: ["هاچبک", "کوییک", "ساینا", "تیبا", "۲۰۷", "بالنو", "GC6", "C30"], category: "hatchback" },
      { keywords: ["سدان", "تارا", "دنا", "شاهین", "سمند", "النترا", "سوناتا", "سراتو", "کرولا", "سیویک", "اکسنت", "امگرند", "آریزو", "J3", "J4", "J5", "سیلفی", "مزدا ۳", "اپتیما", "تلیسمان", "سیمبل", "GT"], category: "sedan" },
    ];

    let brandFa = "";
    let brand = "";
    let origin = "iranian";
    let defaultCat = "sedan";

    for (const rule of BRAND_RULES) {
      if (rule.keywords.some((kw) => n.includes(kw))) {
        brandFa = rule.brandFa;
        brand = rule.brand;
        origin = rule.origin;
        defaultCat = rule.defaultCat;
        break;
      }
    }

    let category = defaultCat;
    for (const hint of CAT_HINTS) {
      if (hint.keywords.some((kw) => n.includes(kw))) {
        category = hint.category;
        break;
      }
    }

    const nameEn = brand ? `${brand} ${n.replace(brandFa, "").replace(/[^\w\s۰-۹آ-ی]/g, "").trim()}` : n;

    return {
      nameEn, nameFa: n, brandFa, brand,
      category, origin, year: 1403,
      priceMin: "0", priceMax: "0",
    };
  }

  // ── Match logic ──
  function findMatch(nameEn: string, nameFa: string): { type: "exact" | "similar" | "new"; car?: ExistingCar } {
    const en = nameEn.toLowerCase().trim();
    const fa = nameFa.trim();

    const exact = existingCars.find((c) =>
      c.nameEn.toLowerCase() === en || c.nameFa === fa
    );
    if (exact) return { type: "exact", car: exact };

    const similar = existingCars.find((c) => {
      const cEn = c.nameEn.toLowerCase();
      const cFa = c.nameFa;
      return (en.length > 3 && (cEn.includes(en) || en.includes(cEn))) ||
             (fa.length > 2 && (cFa.includes(fa) || fa.includes(cFa)));
    });
    if (similar) return { type: "similar", car: similar };

    return { type: "new" };
  }

  // ── Single form: live match check ──
  useEffect(() => {
    if (single.nameEn.length > 2 || single.nameFa.length > 2) {
      setSingleMatch(findMatch(single.nameEn, single.nameFa));
    } else {
      setSingleMatch(null);
    }
  }, [single.nameEn, single.nameFa, existingCars]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSingleSubmit = async () => {
    if (!single.nameEn || !single.nameFa || !single.brandFa || !single.priceMinB || !single.priceMaxB) {
      showToast("فیلدهای ستاره‌دار الزامی هستند");
      return;
    }
    setImporting(true);
    try {
      const carData = {
        nameEn: single.nameEn, nameFa: single.nameFa,
        brandFa: single.brandFa, brand: single.brand,
        category: single.category, origin: single.origin,
        year: single.year,
        priceMin: fromBillions(single.priceMinB),
        priceMax: fromBillions(single.priceMaxB),
        description: single.description,
      };
      const res = await fetchAdmin("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cars: [carData], mode }),
      });
      const data = await res.json();
      if (data.created > 0) {
        showToast(`${single.nameFa} اضافه شد`);
        setSingle({ nameEn: "", nameFa: "", brandFa: "", brand: "", category: "sedan", origin: "iranian", year: 1403, priceMinB: "", priceMaxB: "", description: "" });
        fetchAdmin("/api/admin/cars").then((r: Response) => r.json()).then(setExistingCars);
      } else if (data.skipped > 0) {
        showToast("این خودرو قبلاً وجود دارد");
      } else if (data.updated > 0) {
        showToast("بروزرسانی شد");
      }
      if (data.errors?.length > 0) showToast(data.errors[0]);
    } catch { showToast("خطا"); }
    setImporting(false);
  };

  // ── JSON preview with match check ──
  const handlePreview = () => {
    try {
      const data = JSON.parse(jsonInput);
      let rawItems: any[] = Array.isArray(data) ? data : data.cars ? data.cars : [data];

      let cars: PreviewCar[] = rawItems.map((item) => {
        if (typeof item === "string") {
          return enrichFromName(item.trim());
        }
        const car = item as PreviewCar;
        if (!car.brandFa || !car.origin || !car.nameEn) {
          const enriched = enrichFromName(car.nameFa || car.nameEn || "");
          return {
            ...enriched,
            ...Object.fromEntries(Object.entries(car).filter(([, v]) => v !== undefined && v !== null && v !== "")),
          } as PreviewCar;
        }
        return car;
      });

      cars = cars.map((car) => ({
        ...car,
        _match: findMatch(car.nameEn || "", car.nameFa || ""),
      }));

      setPreview(cars);
      setResult(null);

      const newCount = cars.filter((c) => c._match?.type === "new").length;
      const exactCount = cars.filter((c) => c._match?.type === "exact").length;
      const similarCount = cars.filter((c) => c._match?.type === "similar").length;
      showToast(`${toPersianDigits(newCount)} جدید · ${toPersianDigits(exactCount)} تکراری · ${toPersianDigits(similarCount)} مشابه`);
    } catch {
      showToast("فرمت JSON نامعتبر");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonInput(ev.target?.result as string);
      setTab("json");
    };
    reader.readAsText(file);
    e.target.value = "";
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
      showToast(`${toPersianDigits(data.created)} ایجاد · ${toPersianDigits(data.skipped)} رد`);
      fetchAdmin("/api/admin/cars").then((r: Response) => r.json()).then(setExistingCars);
    } catch { showToast("خطا"); }
    setImporting(false);
  };

  const removeFromPreview = (index: number) => {
    if (!preview) return;
    setPreview(preview.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/cars")} className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface transition-colors" title="بازگشت به خودروها">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-black">اضافه کردن خودرو</h1>
            <p className="text-[11px] text-muted mt-0.5">
              {toPersianDigits(existingCars.length)} خودرو در دیتابیس
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface rounded-xl p-1 border border-border">
        {[
          { key: "single" as const, label: "تکی", icon: "M12 4v16m8-8H4" },
          { key: "json" as const, label: "JSON / پیست", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
          { key: "file" as const, label: "فایل", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
        ].map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t.key ? "bg-background shadow-sm text-foreground" : "text-muted hover:text-foreground"
            }`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Single Form ═══ */}
      {tab === "single" && (
        <div className="bg-surface rounded-xl border border-border p-5">
          {/* Match indicator */}
          {singleMatch && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-2 ${
              singleMatch.type === "exact" ? "bg-red-500/10 text-red-500" :
              singleMatch.type === "similar" ? "bg-amber-500/10 text-amber-600" :
              "bg-emerald-500/10 text-emerald-600"
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                singleMatch.type === "exact" ? "bg-red-500" :
                singleMatch.type === "similar" ? "bg-amber-500" : "bg-emerald-500"
              }`} />
              {singleMatch.type === "exact" && `تکراری — "${singleMatch.car?.nameFa}" در دیتابیس موجود است`}
              {singleMatch.type === "similar" && `مشابه — "${singleMatch.car?.nameFa}" وجود دارد. مطمئنید متفاوت است؟`}
              {singleMatch.type === "new" && "جدید — این خودرو در دیتابیس وجود ندارد"}
            </div>
          )}

          {/* Names */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="نام فارسی" required value={single.nameFa} onChange={(v) => {
              setSingle({ ...single, nameFa: v });
              // Auto-enrich on Farsi name input
              if (v.length > 2 && !single.brandFa) {
                const enriched = enrichFromName(v);
                setSingle((prev) => ({
                  ...prev, nameFa: v,
                  brandFa: prev.brandFa || enriched.brandFa,
                  brand: prev.brand || enriched.brand || "",
                  nameEn: prev.nameEn || enriched.nameEn,
                  origin: enriched.origin,
                  category: enriched.category,
                }));
              }
            }} placeholder="هیوندای توسان" />
            <Field label="نام انگلیسی" required value={single.nameEn} onChange={(v) => setSingle({ ...single, nameEn: v })} placeholder="Hyundai Tucson" dir="ltr" />
          </div>

          {/* Brand */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field label="برند فارسی" required value={single.brandFa} onChange={(v) => setSingle({ ...single, brandFa: v })} placeholder="هیوندای" />
            <Field label="برند انگلیسی" value={single.brand} onChange={(v) => setSingle({ ...single, brand: v })} placeholder="Hyundai" dir="ltr" />
          </div>

          {/* Origin, Category, Year */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted font-bold block mb-1">مبدا</label>
              <select value={single.origin} onChange={(e) => setSingle({ ...single, origin: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary">
                {ORIGINS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted font-bold block mb-1">دسته</label>
              <select value={single.category} onChange={(e) => setSingle({ ...single, category: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary">
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <Field label="سال" value={String(single.year)} onChange={(v) => setSingle({ ...single, year: parseInt(v) || 1403 })} placeholder="۱۴۰۳" />
          </div>

          {/* Prices — billion format */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted font-bold block mb-1">
                حداقل قیمت <span className="text-primary">(میلیارد تومان)</span>
              </label>
              <div className="relative">
                <input
                  type="text" inputMode="decimal"
                  value={single.priceMinB}
                  onChange={(e) => setSingle({ ...single, priceMinB: e.target.value })}
                  placeholder="۱.۵"
                  dir="ltr"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary pl-16"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-muted">میلیارد</span>
              </div>
              {single.priceMinB && parseFloat(single.priceMinB) > 0 && (
                <div className="text-[9px] text-primary mt-1 font-bold">{formatBillion(fromBillions(single.priceMinB))}</div>
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted font-bold block mb-1">
                حداکثر قیمت <span className="text-primary">(میلیارد تومان)</span>
              </label>
              <div className="relative">
                <input
                  type="text" inputMode="decimal"
                  value={single.priceMaxB}
                  onChange={(e) => setSingle({ ...single, priceMaxB: e.target.value })}
                  placeholder="۲.۰"
                  dir="ltr"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary pl-16"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-muted">میلیارد</span>
              </div>
              {single.priceMaxB && parseFloat(single.priceMaxB) > 0 && (
                <div className="text-[9px] text-primary mt-1 font-bold">{formatBillion(fromBillions(single.priceMaxB))}</div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-[10px] text-muted font-bold block mb-1">توضیحات</label>
            <textarea value={single.description} onChange={(e) => setSingle({ ...single, description: e.target.value })}
              rows={2} placeholder="توضیح کوتاه فارسی..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs outline-none resize-none focus:border-primary" />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button onClick={handleSingleSubmit} disabled={importing || singleMatch?.type === "exact"}
              className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4" /></svg>
              {importing ? "..." : "اضافه کردن"}
            </button>
            {singleMatch?.type === "exact" && (
              <div className="flex items-center gap-2">
                <select value={mode} onChange={(e) => setMode(e.target.value as "skip" | "update")}
                  className="bg-background border border-border rounded-lg px-2 py-1.5 text-[10px] outline-none">
                  <option value="skip">رد شو</option>
                  <option value="update">بروزرسانی کن</option>
                </select>
                {mode === "update" && (
                  <button onClick={handleSingleSubmit} disabled={importing}
                    className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg">
                    بروزرسانی
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ JSON / Paste ═══ */}
      {tab === "json" && (
        <div>
          <div className="bg-surface rounded-xl border border-border p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <label className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold cursor-pointer hover:bg-border/30 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                آپلود فایل
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-[10px] text-muted">تکراری‌ها:</span>
                <select value={mode} onChange={(e) => setMode(e.target.value as "skip" | "update")}
                  className="bg-background border border-border rounded-lg px-2 py-1 text-[10px] outline-none">
                  <option value="skip">رد شو</option>
                  <option value="update">بروزرسانی</option>
                </select>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5 mb-3 flex items-start gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary shrink-0 mt-0.5">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-[10px] text-muted leading-4">
                  فرمت: آرایه <code className="bg-background px-1 rounded text-[9px]">[{"{...}"}]</code>
                  ، آبجکت تکی، یا <code className="bg-background px-1 rounded text-[9px]">{"{ cars: [...] }"}</code>
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  الزامی: <span className="font-bold text-foreground">nameEn, nameFa, brandFa, category, origin, priceMin, priceMax</span>
                </p>
              </div>
            </div>

            <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}
              rows={8} placeholder={'[\n  {\n    "nameEn": "Hyundai Tucson",\n    "nameFa": "هیوندای توسان",\n    "brandFa": "هیوندای",\n    "category": "suv",\n    "origin": "korean",\n    "priceMin": "3500000000",\n    "priceMax": "5000000000"\n  }\n]'}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-mono outline-none resize-none leading-5 focus:border-primary" dir="ltr" />

            <div className="flex items-center gap-3 mt-3">
              <button onClick={handlePreview} disabled={!jsonInput.trim()}
                className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-50">
                بررسی و پیش‌نمایش
              </button>
              {jsonInput.trim() && (
                <span className="text-[10px] text-muted">
                  {(() => { try { const d = JSON.parse(jsonInput); const c = Array.isArray(d) ? d : d.cars || [d]; return `${toPersianDigits(c.length)} ${typeof c[0] === "string" ? "اسم خودرو" : "خودرو"} شناسایی شد`; } catch { return "JSON نامعتبر"; } })()}
                </span>
              )}
              {jsonInput && (
                <button onClick={() => { setJsonInput(""); setPreview(null); }} className="text-[10px] text-muted hover:text-foreground mr-auto">پاک کردن</button>
              )}
            </div>
          </div>

          {/* Preview with match status */}
          {preview && !result && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border bg-background/50 flex items-center gap-4">
                <span className="text-xs font-black">
                  {toPersianDigits(preview.length)} خودرو
                </span>
                <div className="flex gap-3 text-[10px]">
                  {[
                    { type: "new", label: "جدید", color: "bg-emerald-500" },
                    { type: "exact", label: "تکراری", color: "bg-red-500" },
                    { type: "similar", label: "مشابه", color: "bg-amber-500" },
                  ].map((s) => (
                    <span key={s.type} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                      {s.label}: {toPersianDigits(preview.filter((c) => c._match?.type === s.type).length)}
                    </span>
                  ))}
                </div>
                <button onClick={handleImport} disabled={importing}
                  className="mr-auto px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50">
                  {importing ? "..." : `ثبت ${toPersianDigits(mode === "skip" ? preview.filter((c) => c._match?.type === "new").length : preview.length)} خودرو`}
                </button>
              </div>

              <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto">
                {preview.map((car, i) => (
                  <PreviewRow
                    key={i}
                    car={car}
                    mode={mode}
                    onUpdate={(updated) => {
                      const newPreview = [...preview];
                      newPreview[i] = { ...updated, _match: findMatch(updated.nameEn || "", updated.nameFa || "") };
                      setPreview(newPreview);
                    }}
                    onRemove={() => removeFromPreview(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {result && <ImportResultCard result={result} onReset={() => { setResult(null); setPreview(null); setJsonInput(""); }} />}
        </div>
      )}

      {/* ═══ File tab ═══ */}
      {tab === "file" && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-primary/10 rounded-2xl flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="text-sm font-black mb-1">آپلود فایل JSON</h3>
          <p className="text-[11px] text-muted mb-4">فایل شامل آرایه‌ای از خودروها با فیلدهای الزامی</p>
          <label className="inline-block px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-primary/90">
            انتخاب فایل
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <details className="mt-6 text-right">
            <summary className="cursor-pointer text-[10px] text-primary font-bold">نمونه فرمت JSON</summary>
            <pre className="mt-2 bg-background rounded-lg p-3 overflow-x-auto text-[9px] leading-4 text-left" dir="ltr">{JSON.stringify([{
              nameEn: "Hyundai Tucson", nameFa: "هیوندای توسان", brandFa: "هیوندای",
              category: "suv", origin: "korean", priceMin: "3500000000", priceMax: "5000000000",
              tags: ["خانوادگی", "لوکس"],
              scores: { comfort: 8, performance: 7, safety: 8 }
            }], null, 2)}</pre>
          </details>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

// ── Inline editable preview row ──
function PreviewRow({ car, mode, onUpdate, onRemove }: {
  car: PreviewCar; mode: string;
  onUpdate: (car: PreviewCar) => void; onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="px-4 py-3 bg-primary/3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <MiniField label="نام فارسی" value={car.nameFa} onChange={(v) => onUpdate({ ...car, nameFa: v })} />
          <MiniField label="نام انگلیسی" value={car.nameEn} onChange={(v) => onUpdate({ ...car, nameEn: v })} dir="ltr" />
          <MiniField label="برند فارسی" value={car.brandFa} onChange={(v) => onUpdate({ ...car, brandFa: v })} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-[8px] text-muted">مبدا</label>
            <select value={car.origin} onChange={(e) => onUpdate({ ...car, origin: e.target.value })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] outline-none">
              {ORIGINS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[8px] text-muted">دسته</label>
            <select value={car.category} onChange={(e) => onUpdate({ ...car, category: e.target.value })}
              className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] outline-none">
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <MiniField label="حداقل (میلیارد)" value={toBillions(String(car.priceMin || ""))} onChange={(v) => onUpdate({ ...car, priceMin: fromBillions(v) })} dir="ltr" />
          </div>
          <div>
            <MiniField label="حداکثر (میلیارد)" value={toBillions(String(car.priceMax || ""))} onChange={(v) => onUpdate({ ...car, priceMax: fromBillions(v) })} dir="ltr" />
          </div>
        </div>
        <button onClick={() => setEditing(false)} className="text-[10px] text-primary font-bold">
          بستن ویرایش
        </button>
      </div>
    );
  }

  return (
    <div className={`px-4 py-2.5 flex items-center gap-3 ${
      car._match?.type === "exact" ? "bg-red-500/3" :
      car._match?.type === "similar" ? "bg-amber-500/3" : ""
    }`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${
        car._match?.type === "new" ? "bg-emerald-500" :
        car._match?.type === "exact" ? "bg-red-500" : "bg-amber-500"
      }`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground">{car.nameFa}</span>
          <span className="text-[10px] text-muted" dir="ltr">{car.nameEn}</span>
        </div>
        <div className="text-[9px] text-muted mt-0.5">
          {car.brandFa} · {getCategoryLabel(car.category)} · {getOriginLabel(car.origin)}
          {car.priceMin && parseInt(String(car.priceMin)) > 0 && (
            <span className="mr-2 text-primary font-bold">{formatBillion(car.priceMin)}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-left">
        {car._match?.type === "exact" && (
          <span className="text-[9px] text-red-500 font-bold">
            تکراری: {car._match.car?.nameFa}
            {mode === "skip" && " (رد)"}
          </span>
        )}
        {car._match?.type === "similar" && (
          <span className="text-[9px] text-amber-600 font-bold">مشابه: {car._match.car?.nameFa}</span>
        )}
        {car._match?.type === "new" && (
          <span className="text-[9px] text-emerald-500 font-bold">جدید</span>
        )}
      </div>

      <button onClick={() => setEditing(true)} className="text-muted hover:text-primary shrink-0" title="ویرایش">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

      <button onClick={onRemove} className="text-muted hover:text-red-400 shrink-0" title="حذف">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function MiniField({ label, value, onChange, dir }: {
  label: string; value: string; onChange: (v: string) => void; dir?: string;
}) {
  return (
    <div>
      <label className="text-[8px] text-muted">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} dir={dir}
        className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] outline-none" />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, dir, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted font-bold block mb-1">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir}
        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs outline-none focus:border-primary" />
    </div>
  );
}

function ImportResultCard({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h3 className="text-sm font-black mb-3">نتیجه</h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { value: result.total, label: "کل", color: "text-foreground" },
          { value: result.created, label: "ایجاد شده", color: "text-emerald-500" },
          { value: result.updated, label: "بروزرسانی", color: "text-blue-500" },
          { value: result.skipped, label: "رد شده", color: "text-muted" },
        ].map((s) => (
          <div key={s.label} className="bg-background rounded-xl p-3 text-center">
            <div className={`text-lg font-black ${s.color}`}>{toPersianDigits(s.value)}</div>
            <div className="text-[9px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>
      {result.errors.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-3">
          <h4 className="text-[10px] font-bold text-red-500 mb-1">خطاها</h4>
          {result.errors.slice(0, 5).map((e, i) => (
            <div key={i} className="text-[9px] text-red-400">- {e}</div>
          ))}
        </div>
      )}
      <button onClick={onReset} className="px-4 py-2 bg-background text-xs font-bold rounded-xl border border-border hover:bg-surface transition-colors">
        ورود جدید
      </button>
    </div>
  );
}

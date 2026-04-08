"use client";

import { useState, useEffect } from "react";
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
  // Match info (added by preview check)
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

export default function AdminImportPage() {
  const { fetchAdmin } = useAdmin();
  const [tab, setTab] = useState<"single" | "json" | "file">("single");
  const [existingCars, setExistingCars] = useState<ExistingCar[]>([]);
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [toast, setToast] = useState<string | null>(null);

  // Single form
  const [single, setSingle] = useState({
    nameEn: "", nameFa: "", brandFa: "", brand: "",
    category: "sedan", origin: "iranian", year: 1403,
    priceMin: "", priceMax: "", description: "",
  });
  const [singleMatch, setSingleMatch] = useState<{ type: string; car?: ExistingCar } | null>(null);

  // JSON/File
  const [jsonInput, setJsonInput] = useState("");
  const [preview, setPreview] = useState<PreviewCar[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Load existing cars for matching
  useEffect(() => {
    fetchAdmin("/api/admin/cars").then((r: Response) => r.json())
      .then((d: ExistingCar[]) => setExistingCars(d))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-enrich from Persian name ──
  function enrichFromName(name: string): PreviewCar {
    const n = name.trim();

    // Brand detection rules: { keywords in nameFa → brandFa, brand, origin, category hint }
    const BRAND_RULES: { keywords: string[]; brandFa: string; brand: string; origin: string; defaultCat: string }[] = [
      // Iranian
      { keywords: ["تارا", "دنا", "سمند", "پژو", "هایما", "رانا", "سهند"], brandFa: "ایران‌خودرو", brand: "IKCO", origin: "iranian", defaultCat: "sedan" },
      { keywords: ["شاهین", "کوییک", "ساینا", "تیبا", "ریرا", "آریسان", "رسپکت"], brandFa: "سایپا", brand: "SAIPA", origin: "iranian", defaultCat: "sedan" },
      { keywords: ["زامیاد"], brandFa: "زامیاد", brand: "Zamyad", origin: "iranian", defaultCat: "pickup" },
      { keywords: ["تندر"], brandFa: "ایران‌خودرو", brand: "IKCO", origin: "iranian", defaultCat: "sedan" },
      // Chinese
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
      // Korean
      { keywords: ["هیوندای"], brandFa: "هیوندای", brand: "Hyundai", origin: "korean", defaultCat: "sedan" },
      { keywords: ["کیا"], brandFa: "کیا", brand: "KIA", origin: "korean", defaultCat: "sedan" },
      { keywords: ["سانگ‌یانگ"], brandFa: "سانگ‌یانگ", brand: "SsangYong", origin: "korean", defaultCat: "suv" },
      // Japanese
      { keywords: ["تویوتا"], brandFa: "تویوتا", brand: "Toyota", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["نیسان"], brandFa: "نیسان", brand: "Nissan", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["هوندا"], brandFa: "هوندا", brand: "Honda", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["مزدا"], brandFa: "مزدا", brand: "Mazda", origin: "japanese", defaultCat: "sedan" },
      { keywords: ["میتسوبیشی"], brandFa: "میتسوبیشی", brand: "Mitsubishi", origin: "japanese", defaultCat: "suv" },
      { keywords: ["سوزوکی"], brandFa: "سوزوکی", brand: "Suzuki", origin: "japanese", defaultCat: "hatchback" },
      // European
      { keywords: ["رنو"], brandFa: "رنو", brand: "Renault", origin: "european", defaultCat: "sedan" },
      { keywords: ["پژو"], brandFa: "پژو", brand: "Peugeot", origin: "european", defaultCat: "sedan" },
      { keywords: ["بی‌ام‌و", "BMW"], brandFa: "بی‌ام‌و", brand: "BMW", origin: "european", defaultCat: "sedan" },
      { keywords: ["آئودی", "Audi"], brandFa: "آئودی", brand: "Audi", origin: "european", defaultCat: "suv" },
      { keywords: ["فولکس"], brandFa: "فولکس‌واگن", brand: "Volkswagen", origin: "european", defaultCat: "crossover" },
      { keywords: ["لکسوس"], brandFa: "لکسوس", brand: "Lexus", origin: "japanese", defaultCat: "suv" },
    ];

    // Category hints from name
    const CAT_HINTS: { keywords: string[]; category: string }[] = [
      { keywords: ["وانت", "پیکاپ"], category: "pickup" },
      { keywords: ["کراس", "X33", "X55", "CS35", "FX", "HR-V", "وزل", "C-HR", "ASX", "GS3", "CX-"], category: "crossover" },
      { keywords: ["شاسی", "SUV", "توسان", "سانتافه", "اسپورتیج", "سورنتو", "RAV", "CX-5", "اوتلندر", "CR-V", "H6", "H2", "X70", "K7", "AX7", "ایکس‌تریل", "سانگ", "تیگو", "ID4", "Q5", "X2", "سری ۵", "کولئوس", "داستر", "قشقایی", "7x", "8S"], category: "suv" },
      { keywords: ["هاچبک", "کوییک", "ساینا", "تیبا", "۲۰۷", "بالنو", "GC6", "C30"], category: "hatchback" },
      { keywords: ["سدان", "تارا", "دنا", "شاهین", "سمند", "النترا", "سوناتا", "سراتو", "کرولا", "سیویک", "اکسنت", "امگرند", "آریزو", "J3", "J4", "J5", "سیلفی", "مزدا ۳", "اپتیما", "تلیسمان", "سیمبل", "GT"], category: "sedan" },
    ];

    // Find brand
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

    // Find category
    let category = defaultCat;
    for (const hint of CAT_HINTS) {
      if (hint.keywords.some((kw) => n.includes(kw))) {
        category = hint.category;
        break;
      }
    }

    // Generate English name
    const nameEn = brand ? `${brand} ${n.replace(brandFa, "").replace(/[^\w\s۰-۹آ-ی]/g, "").trim()}` : n;

    return {
      nameEn,
      nameFa: n,
      brandFa,
      brand,
      category,
      origin,
      year: 1403,
      priceMin: "0",
      priceMax: "0",
    };
  }

  // ── Match logic ──
  function findMatch(nameEn: string, nameFa: string): { type: "exact" | "similar" | "new"; car?: ExistingCar } {
    const en = nameEn.toLowerCase().trim();
    const fa = nameFa.trim();

    // Exact match
    const exact = existingCars.find((c) =>
      c.nameEn.toLowerCase() === en || c.nameFa === fa
    );
    if (exact) return { type: "exact", car: exact };

    // Similar match (partial)
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
    if (!single.nameEn || !single.nameFa || !single.brandFa || !single.priceMin || !single.priceMax) {
      showToast("فیلدهای ستاره‌دار الزامی هستند");
      return;
    }
    setImporting(true);
    try {
      const res = await fetchAdmin("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cars: [single], mode }),
      });
      const data = await res.json();
      if (data.created > 0) {
        showToast(`${single.nameFa} اضافه شد`);
        setSingle({ nameEn: "", nameFa: "", brandFa: "", brand: "", category: "sedan", origin: "iranian", year: 1403, priceMin: "", priceMax: "", description: "" });
        // Reload existing cars
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

      // Handle string arrays (just car names) — auto-enrich from name
      let cars: PreviewCar[] = rawItems.map((item) => {
        if (typeof item === "string") {
          return enrichFromName(item.trim());
        }
        // Fill missing fields from name if possible
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

      // Add match info
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
    <div className="p-6">
      <h1 className="text-xl font-black mb-1">اضافه کردن خودرو</h1>
      <p className="text-[11px] text-muted mb-5">
        {toPersianDigits(existingCars.length)} خودرو در دیتابیس موجود است
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-background rounded-xl p-1">
        {[
          { key: "single" as const, label: "تکی", icon: "M12 4v16m8-8H4" },
          { key: "json" as const, label: "JSON / پیست", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
          { key: "file" as const, label: "فایل", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
        ].map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              tab === t.key ? "bg-surface shadow-sm text-foreground" : "text-muted"
            }`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <div className={`mb-4 px-3 py-2 rounded-lg text-[11px] font-bold ${
              singleMatch.type === "exact" ? "bg-red-500/10 text-red-500" :
              singleMatch.type === "similar" ? "bg-amber-500/10 text-amber-600" :
              "bg-emerald-500/10 text-emerald-600"
            }`}>
              {singleMatch.type === "exact" && `تکراری — "${singleMatch.car?.nameFa}" در دیتابیس موجود است`}
              {singleMatch.type === "similar" && `مشابه — "${singleMatch.car?.nameFa}" وجود دارد. مطمئنید متفاوت است؟`}
              {singleMatch.type === "new" && "جدید — این خودرو در دیتابیس وجود ندارد"}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="نام انگلیسی *" value={single.nameEn} onChange={(v) => setSingle({ ...single, nameEn: v })} placeholder="Hyundai Tucson" dir="ltr" />
            <Field label="نام فارسی *" value={single.nameFa} onChange={(v) => setSingle({ ...single, nameFa: v })} placeholder="هیوندای توسان" />
            <Field label="برند فارسی *" value={single.brandFa} onChange={(v) => setSingle({ ...single, brandFa: v })} placeholder="هیوندای" />
            <Field label="برند انگلیسی" value={single.brand} onChange={(v) => setSingle({ ...single, brand: v })} placeholder="Hyundai" dir="ltr" />
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] text-muted block mb-1">مبدا *</label>
              <select value={single.origin} onChange={(e) => setSingle({ ...single, origin: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none">
                {ORIGINS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">دسته *</label>
              <select value={single.category} onChange={(e) => setSingle({ ...single, category: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none">
                {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <Field label="سال" value={String(single.year)} onChange={(v) => setSingle({ ...single, year: parseInt(v) || 1403 })} placeholder="1403" />
            <div />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Field label="حداقل قیمت (تومان) *" value={single.priceMin} onChange={(v) => setSingle({ ...single, priceMin: v })} placeholder="1500000000" dir="ltr" />
              {single.priceMin && parseInt(single.priceMin) > 0 && (
                <div className="text-[9px] text-primary mt-1 font-bold">{toPersianDigits(formatPrice(single.priceMin))} تومان</div>
              )}
            </div>
            <div>
              <Field label="حداکثر قیمت (تومان) *" value={single.priceMax} onChange={(v) => setSingle({ ...single, priceMax: v })} placeholder="2000000000" dir="ltr" />
              {single.priceMax && parseInt(single.priceMax) > 0 && (
                <div className="text-[9px] text-primary mt-1 font-bold">{toPersianDigits(formatPrice(single.priceMax))} تومان</div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-[10px] text-muted block mb-1">توضیحات</label>
            <textarea value={single.description} onChange={(e) => setSingle({ ...single, description: e.target.value })}
              rows={2} placeholder="توضیح کوتاه فارسی..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none resize-none" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSingleSubmit} disabled={importing || singleMatch?.type === "exact"}
              className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50">
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
          <div className="bg-surface rounded-xl border border-border p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <label className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-bold cursor-pointer hover:bg-border/30">
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

            <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5 mb-3">
              <p className="text-[10px] text-muted leading-4">
                فرمت‌های پشتیبانی‌شده: آرایه <code className="bg-background px-1 rounded text-[9px]">[{"{...}"}, {"{...}"}]</code>
                یا آبجکت تکی <code className="bg-background px-1 rounded text-[9px]">{"{...}"}</code>
                یا <code className="bg-background px-1 rounded text-[9px]">{"{ cars: [...] }"}</code>
              </p>
              <p className="text-[10px] text-muted mt-1">
                فیلد الزامی: <span className="font-bold">nameEn, nameFa, brandFa, category, origin, priceMin, priceMax</span>
              </p>
            </div>

            <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)}
              rows={10} placeholder={'[\n  {\n    "nameEn": "Hyundai Tucson",\n    "nameFa": "هیوندای توسان",\n    "brandFa": "هیوندای",\n    "category": "suv",\n    "origin": "korean",\n    "priceMin": "3500000000",\n    "priceMax": "5000000000"\n  }\n]'}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-mono outline-none resize-none leading-5" dir="ltr" />

            <div className="flex items-center gap-3 mt-3">
              <button onClick={handlePreview} disabled={!jsonInput.trim()}
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl disabled:opacity-50">
                بررسی و پیش‌نمایش
              </button>
              {jsonInput.trim() && (
                <span className="text-[10px] text-muted">
                  {(() => { try { const d = JSON.parse(jsonInput); const c = Array.isArray(d) ? d : d.cars || [d]; return `${toPersianDigits(c.length)} ${typeof c[0] === "string" ? "اسم خودرو" : "خودرو"} شناسایی شد`; } catch { return "JSON نامعتبر"; } })()}
                </span>
              )}
            </div>
          </div>

          {/* Preview with match status */}
          {preview && !result && (
            <div className="bg-surface rounded-xl border border-border overflow-hidden mb-4">
              {/* Summary bar */}
              <div className="px-4 py-3 border-b border-border bg-background/50 flex items-center gap-4">
                <span className="text-xs font-black">
                  {toPersianDigits(preview.length)} خودرو
                </span>
                <div className="flex gap-2 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    جدید: {toPersianDigits(preview.filter((c) => c._match?.type === "new").length)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    تکراری: {toPersianDigits(preview.filter((c) => c._match?.type === "exact").length)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    مشابه: {toPersianDigits(preview.filter((c) => c._match?.type === "similar").length)}
                  </span>
                </div>
                {preview.some((c) => !c.priceMin || c.priceMin === "0") && (
                  <span className="text-[9px] text-amber-500 font-bold">بدون قیمت: {toPersianDigits(preview.filter((c) => !c.priceMin || c.priceMin === "0").length)}</span>
                )}
                <button onClick={handleImport} disabled={importing}
                  className="mr-auto px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50">
                  {importing ? "..." : `ثبت ${toPersianDigits(mode === "skip" ? preview.filter((c) => c._match?.type === "new").length : preview.length)} خودرو`}
                </button>
              </div>

              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
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

          {/* Result */}
          {result && <ImportResultCard result={result} onReset={() => { setResult(null); setPreview(null); setJsonInput(""); }} />}
        </div>
      )}

      {/* ═══ File tab ═══ */}
      {tab === "file" && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-2xl flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h3 className="text-sm font-black mb-1">آپلود فایل JSON</h3>
          <p className="text-[11px] text-muted mb-4">فایل شامل آرایه‌ای از خودروها با فیلدهای الزامی</p>
          <label className="inline-block px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl cursor-pointer hover:bg-primary/90">
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
            <MiniField label="حداقل قیمت" value={String(car.priceMin || "")} onChange={(v) => onUpdate({ ...car, priceMin: v })} dir="ltr" />
            {car.priceMin && parseInt(String(car.priceMin)) > 0 && (
              <div className="text-[7px] text-primary font-bold">{toPersianDigits(formatPrice(String(car.priceMin)))}</div>
            )}
          </div>
          <div>
            <MiniField label="حداکثر قیمت" value={String(car.priceMax || "")} onChange={(v) => onUpdate({ ...car, priceMax: v })} dir="ltr" />
            {car.priceMax && parseInt(String(car.priceMax)) > 0 && (
              <div className="text-[7px] text-primary font-bold">{toPersianDigits(formatPrice(String(car.priceMax)))}</div>
            )}
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
          {car.priceMin && <span className="mr-2">{toPersianDigits(formatPrice(String(car.priceMin)))}</span>}
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

// ── Reusable field ──
function Field({ label, value, onChange, placeholder, dir }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; dir?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-muted block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary" />
    </div>
  );
}

// ── Result card ──
function ImportResultCard({ result, onReset }: { result: ImportResult; onReset: () => void }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <h3 className="text-sm font-black mb-3">نتیجه</h3>
      <div className="grid grid-cols-4 gap-2 mb-4">
        <StatCard value={result.total} label="کل" color="text-foreground" />
        <StatCard value={result.created} label="ایجاد شده" color="text-emerald-500" />
        <StatCard value={result.updated} label="بروزرسانی" color="text-blue-500" />
        <StatCard value={result.skipped} label="رد شده" color="text-muted" />
      </div>
      {result.errors.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-3">
          <h4 className="text-[10px] font-bold text-red-500 mb-1">خطاها</h4>
          {result.errors.slice(0, 5).map((e, i) => (
            <div key={i} className="text-[9px] text-red-400">- {e}</div>
          ))}
        </div>
      )}
      <button onClick={onReset} className="px-4 py-2 bg-background text-xs font-bold rounded-xl">
        ورود جدید
      </button>
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-background rounded-xl p-3 text-center">
      <div className={`text-lg font-black ${color}`}>{toPersianDigits(value)}</div>
      <div className="text-[9px] text-muted">{label}</div>
    </div>
  );
}

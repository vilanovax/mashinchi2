"use client";

import { useState, useMemo } from "react";
import { formatPrice, toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface PriceItem {
  brand: string;
  model: string;
  trim: string;
  year: number;
  price: number;
  change: number;
  priceLabel?: string;
  carId: string | null;
  carNameFa: string | null;
  matchScore: number;
}

interface FetchResult {
  source: string;
  priceType: string;
  total: number;
  matched: number;
  unmatched: number;
  items: PriceItem[];
  fetchedAt?: string;
}

type Filter = "all" | "matched" | "unmatched" | "high" | "low";

export default function BamaPricesPage() {
  const { fetchAdmin } = useAdmin();
  const [priceType, setPriceType] = useState<"MarketPrice" | "FactoryPrice">("MarketPrice");
  const [result, setResult] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [tab, setTab] = useState<"fetch" | "paste">("paste");
  const [filter, setFilter] = useState<Filter>("all");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    if (!result) return [];
    switch (filter) {
      case "matched": return result.items.filter((i) => i.carId);
      case "unmatched": return result.items.filter((i) => !i.carId);
      case "high": return result.items.filter((i) => i.matchScore >= 80);
      case "low": return result.items.filter((i) => i.carId && i.matchScore < 80);
      default: return result.items;
    }
  }, [result, filter]);

  // Fetch from bama API
  const handleFetch = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetchAdmin(`/api/admin/bama-prices?priceType=${priceType}`);
      const data = await res.json();
      if (data.error) {
        showToast(`${data.error}${data.suggestion ? " — " + data.suggestion : ""}`);
        setTab("paste");
      } else {
        setResult(data);
        showToast(`${toPersianDigits(data.matched)} مچ از ${toPersianDigits(data.total)}`);
      }
    } catch {
      showToast("خطا — از کپی-پیست استفاده کنید");
      setTab("paste");
    } finally {
      setLoading(false);
    }
  };

  // Parse pasted data
  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/bama-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse_paste",
          text: pasteText,
          priceType: priceType === "MarketPrice" ? "market" : "factory",
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error);
      } else {
        setResult(data);
        showToast(`${toPersianDigits(data.matched)} مچ از ${toPersianDigits(data.total)}`);
      }
    } catch {
      showToast("خطا در پردازش");
    } finally {
      setLoading(false);
    }
  };

  // Apply prices
  const handleApply = async (onlyMatched: boolean) => {
    if (!result) return;
    setApplying(true);
    const items = onlyMatched ? result.items.filter((i) => i.carId) : result.items;
    try {
      const res = await fetchAdmin("/api/admin/bama-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply", items,
          priceType: priceType === "MarketPrice" ? "market" : "factory",
        }),
      });
      const data = await res.json();
      showToast(`${toPersianDigits(data.applied)} قیمت ثبت شد`);
    } catch {
      showToast("خطا در ثبت");
    } finally {
      setApplying(false);
    }
  };

  const clearMatch = (index: number) => {
    if (!result) return;
    const items = [...result.items];
    items[index] = { ...items[index], carId: null, carNameFa: null, matchScore: 0 };
    setResult({ ...result, items, matched: items.filter((i) => i.carId).length, unmatched: items.filter((i) => !i.carId).length });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black">قیمت‌های باما</h1>
          <p className="text-[11px] text-muted mt-0.5">دریافت و ثبت قیمت روز از bama.ir</p>
        </div>
        <a href="https://bama.ir/price?priceType=MarketPrice" target="_blank" rel="noopener noreferrer"
          className="px-3 py-1.5 text-[10px] font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5">
          bama.ir/price
        </a>
      </div>

      {/* Price type + Method tabs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          {[
            { key: "MarketPrice" as const, label: "بازار" },
            { key: "FactoryPrice" as const, label: "کارخانه" },
          ].map((t) => (
            <button key={t.key} onClick={() => setPriceType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                priceType === t.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex gap-1.5">
          {[
            { key: "fetch" as const, label: "API خودکار" },
            { key: "paste" as const, label: "کپی-پیست" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                tab === t.key ? "bg-foreground/10 text-foreground" : "text-muted"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fetch section */}
      {tab === "fetch" && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-5">
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mb-3">
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              باما معمولاً درخواست‌های مستقیم API را بلاک می‌کند. اگر خطا گرفتید از <button onClick={() => setTab("paste")} className="underline font-bold">کپی-پیست</button> استفاده کنید.
            </p>
          </div>
          <button onClick={handleFetch} disabled={loading}
            className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50">
            {loading ? "در حال دریافت..." : "تلاش دریافت از API"}
          </button>
        </div>
      )}

      {/* Paste section */}
      {tab === "paste" && (
        <div className="bg-surface rounded-xl border border-border p-4 mb-5">
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3">
            <h3 className="text-[11px] font-black text-primary mb-1">راهنمای کپی-پیست</h3>
            <ol className="text-[10px] text-muted space-y-0.5 list-decimal list-inside">
              <li>صفحه <a href="https://bama.ir/price?priceType=MarketPrice" target="_blank" rel="noopener noreferrer" className="text-primary underline">bama.ir/price</a> را باز کنید</li>
              <li>کل محتوای جدول قیمت را انتخاب و کپی کنید</li>
              <li>در کادر زیر پیست کنید</li>
            </ol>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={"نیسان ,\nآلتیما ,\n2.0 لیتر\n2025\n20 ساعت پیش\nقیمت بازار\n0%\n6,800,000,000\nتومان"}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs outline-none resize-none mb-3 font-mono leading-5" dir="rtl"
          />
          <div className="flex items-center gap-3">
            <button onClick={handleParse} disabled={loading || !pasteText.trim()}
              className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50">
              {loading ? "پردازش..." : "پردازش متن"}
            </button>
            {pasteText.length > 0 && (
              <span className="text-[10px] text-muted">
                {toPersianDigits(pasteText.split("\n").filter(Boolean).length)} خط
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <SummaryCard label="کل" value={result.total} color="primary" />
            <SummaryCard label="مچ شده" value={result.matched} color="green" />
            <SummaryCard label="بدون مچ" value={result.unmatched} color="amber" />
            <SummaryCard label="قابل ثبت" value={result.items.filter((i) => i.carId && i.price > 0).length} color="blue" />
          </div>

          {/* Filters + Actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {[
                { key: "all" as Filter, label: "همه", count: result.total },
                { key: "matched" as Filter, label: "مچ شده", count: result.matched },
                { key: "high" as Filter, label: "مچ دقیق", count: result.items.filter((i) => i.matchScore >= 80).length },
                { key: "low" as Filter, label: "مچ ضعیف", count: result.items.filter((i) => i.carId && i.matchScore < 80).length },
                { key: "unmatched" as Filter, label: "بدون مچ", count: result.unmatched },
              ].map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    filter === f.key
                      ? "bg-primary text-white"
                      : "bg-surface border border-border text-muted"
                  }`}>
                  {f.label} ({toPersianDigits(f.count)})
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => handleApply(true)} disabled={applying || result.matched === 0}
                className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50">
                {applying ? "..." : `ثبت مچ‌شده (${toPersianDigits(result.matched)})`}
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-1.5">
            {filtered.map((item, i) => {
              const originalIndex = result.items.indexOf(item);
              return (
                <div key={i} className={`rounded-xl border p-3 flex items-center gap-3 ${
                  item.carId
                    ? item.matchScore >= 80
                      ? "bg-emerald-500/3 border-emerald-500/15"
                      : "bg-amber-500/3 border-amber-500/15"
                    : "bg-surface border-border"
                }`}>
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    item.carId ? (item.matchScore >= 80 ? "bg-emerald-500" : "bg-amber-500") : "bg-red-400/40"
                  }`} />

                  {/* Bama car info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">
                      {[item.brand, item.model, item.trim].filter(Boolean).join(" ")}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.year > 0 && (
                        <span className="text-[9px] text-muted">{toPersianDigits(item.year)}</span>
                      )}
                      {item.priceLabel && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                          item.priceLabel === "factory" ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"
                        }`}>
                          {item.priceLabel === "factory" ? "کارخانه" : "بازار"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Matched car */}
                  <div className="w-36 shrink-0">
                    {item.carId ? (
                      <div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.carNameFa}</span>
                        <span className={`mr-1 text-[8px] font-bold ${
                          item.matchScore >= 80 ? "text-emerald-500" : "text-amber-500"
                        }`}>
                          {toPersianDigits(item.matchScore)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted/30">مچ نشده</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="w-28 text-left shrink-0">
                    {item.price > 0 ? (
                      <span className="text-sm font-black text-foreground">
                        {toPersianDigits(formatPrice(item.price))}
                      </span>
                    ) : (
                      <span className="text-muted/30">—</span>
                    )}
                  </div>

                  {/* Change */}
                  <div className="w-12 text-center shrink-0">
                    {item.change !== 0 ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.change > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {item.change > 0 ? "+" : ""}{toPersianDigits(item.change)}%
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted/30">۰%</span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="w-8 shrink-0">
                    {item.carId && (
                      <button onClick={() => clearMatch(originalIndex)}
                        className="text-[9px] text-muted hover:text-red-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted">آیتمی با این فیلتر یافت نشد</p>
            </div>
          )}

          {/* Footer stats */}
          {filtered.length > 0 && (
            <div className="mt-3 text-[10px] text-muted text-center">
              نمایش {toPersianDigits(filtered.length)} از {toPersianDigits(result.total)} آیتم
            </div>
          )}
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClass = color === "primary" ? "text-primary" :
    color === "green" ? "text-emerald-500" :
    color === "amber" ? "text-amber-500" : "text-blue-500";
  return (
    <div className="bg-surface rounded-xl border border-border p-3 text-center">
      <div className={`text-lg font-black ${colorClass}`}>{toPersianDigits(value)}</div>
      <div className="text-[9px] text-muted mt-0.5">{label}</div>
    </div>
  );
}

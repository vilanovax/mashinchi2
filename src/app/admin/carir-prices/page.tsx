"use client";

import { useState, useMemo } from "react";
import { formatPrice, toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface ParsedItem {
  name: string;
  marketPrice: number;
  factoryPrice: number;
  changePct: number;
  carId: string | null;
  carNameFa: string | null;
  matchScore: number;
}

interface ParseResult {
  source: string;
  total: number;
  matched: number;
  unmatched: number;
  items: ParsedItem[];
}

type Filter = "all" | "matched" | "unmatched";

export default function CarirPricesPage() {
  const { fetchAdmin } = useAdmin();
  const [pasteText, setPasteText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [priceDate, setPriceDate] = useState(new Date().toISOString().split("T")[0]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const filtered = useMemo(() => {
    if (!result) return [];
    switch (filter) {
      case "matched": return result.items.filter((i) => i.carId);
      case "unmatched": return result.items.filter((i) => !i.carId);
      default: return result.items;
    }
  }, [result, filter]);

  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    try {
      const res = await fetchAdmin("/api/admin/carir-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", text: pasteText }),
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

  const handleApply = async () => {
    if (!result) return;
    const matchedItems = result.items.filter((i) => i.carId);
    if (matchedItems.length === 0) return;
    setApplying(true);
    try {
      const res = await fetchAdmin("/api/admin/carir-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", items: matchedItems, date: priceDate }),
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
          <h1 className="text-xl font-black">قیمت‌های car.ir</h1>
          <p className="text-[11px] text-muted mt-0.5">دریافت و ثبت قیمت روز از car.ir</p>
        </div>
        <a href="https://car.ir/prices" target="_blank" rel="noopener noreferrer"
          className="px-3 py-1.5 text-[10px] font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5">
          car.ir/prices
        </a>
      </div>

      {/* Paste section */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-5">
        <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3">
          <h3 className="text-[11px] font-black text-primary mb-1">راهنما</h3>
          <ol className="text-[10px] text-muted space-y-0.5 list-decimal list-inside">
            <li>صفحه <a href="https://car.ir/prices" target="_blank" rel="noopener noreferrer" className="text-primary underline">car.ir/prices</a> را باز کنید</li>
            <li>جدول قیمت را انتخاب و کپی کنید (Ctrl+A → Ctrl+C)</li>
            <li>در کادر زیر پیست کنید</li>
          </ol>
        </div>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={8}
          placeholder={"جک J4\n۱,۷۳۰,۰۰۰,۰۰۰\n۱,۲۳۵,۰۰۰,۰۰۰\n(%۶.۴۹)\n۱۲۰,۱۰۰,۰۰۰"}
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
          {pasteText.length > 0 && (
            <button onClick={() => { setPasteText(""); setResult(null); }} className="text-[10px] text-muted hover:text-foreground">پاک کردن</button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-surface rounded-xl border border-border p-3 text-center">
              <div className="text-lg font-black text-primary">{toPersianDigits(result.total)}</div>
              <div className="text-[9px] text-muted mt-0.5">کل</div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-3 text-center">
              <div className="text-lg font-black text-emerald-500">{toPersianDigits(result.matched)}</div>
              <div className="text-[9px] text-muted mt-0.5">مچ شده</div>
            </div>
            <div className="bg-surface rounded-xl border border-border p-3 text-center">
              <div className="text-lg font-black text-amber-500">{toPersianDigits(result.unmatched)}</div>
              <div className="text-[9px] text-muted mt-0.5">بدون مچ</div>
            </div>
          </div>

          {/* Filters + Actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {[
                { key: "all" as Filter, label: "همه", count: result.total },
                { key: "matched" as Filter, label: "مچ شده", count: result.matched },
                { key: "unmatched" as Filter, label: "بدون مچ", count: result.unmatched },
              ].map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    filter === f.key ? "bg-primary text-white" : "bg-surface border border-border text-muted"
                  }`}>
                  {f.label} ({toPersianDigits(f.count)})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[9px] text-muted">تاریخ:</label>
              <input type="date" value={priceDate} onChange={(e) => setPriceDate(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1 text-[10px] outline-none" />
              <button onClick={handleApply} disabled={applying || result.matched === 0}
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
                    ? item.matchScore >= 80 ? "bg-emerald-500/3 border-emerald-500/15" : "bg-amber-500/3 border-amber-500/15"
                    : "bg-surface border-border"
                }`}>
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    item.carId ? (item.matchScore >= 80 ? "bg-emerald-500" : "bg-amber-500") : "bg-red-400/40"
                  }`} />

                  {/* Car name from car.ir */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{item.name}</div>
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

                  {/* Market price */}
                  <div className="w-28 text-left shrink-0">
                    {item.marketPrice > 0 ? (
                      <span className="text-sm font-black text-foreground">
                        {toPersianDigits(formatPrice(item.marketPrice))}
                      </span>
                    ) : (
                      <span className="text-muted/30">—</span>
                    )}
                  </div>

                  {/* Change */}
                  <div className="w-14 text-center shrink-0">
                    {item.changePct !== 0 ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.changePct > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {item.changePct > 0 ? "+" : ""}{toPersianDigits(item.changePct.toFixed(1))}%
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

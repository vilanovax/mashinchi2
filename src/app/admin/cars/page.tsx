"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, toPersianDigits, getOriginLabel, getCategoryLabel } from "@/lib/utils";
import { useAdmin } from "../layout";

interface Car {
  id: string;
  nameEn: string;
  nameFa: string;
  brand: string;
  brandFa: string;
  category: string;
  origin: string;
  priceMin: string;
  priceMax: string;
  description: string | null;
  scores: Record<string, number> | null;
  specs: Record<string, unknown> | null;
  intel: Record<string, unknown> | null;
  tags: { id: string; tag: string }[];
  reviews: { id: string }[];
}

export default function AdminCarsPage() {
  const { fetchAdmin } = useAdmin();
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/cars")
      .then((r) => r.json())
      .then((data) => { setCars(data); setLoading(false); })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const deleteCar = async (id: string) => {
    const name = cars.find((c) => c.id === id)?.nameFa || "";
    await fetchAdmin(`/api/admin/cars/${id}`, { method: "DELETE" });
    setCars((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
    showToast(`${name} حذف شد`);
  };

  const filtered = cars.filter((c) => {
    const matchSearch = !search || c.nameFa.includes(search) || c.nameEn.toLowerCase().includes(search.toLowerCase()) || c.brandFa.includes(search);
    const matchOrigin = originFilter === "all" || c.origin === originFilter;
    return matchSearch && matchOrigin;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">مدیریت خودروها</h1>
        <span className="text-sm text-muted">{toPersianDigits(filtered.length)} خودرو</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pr-9 pl-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option value="all">همه مبداها</option>
          <option value="iranian">ایرانی</option>
          <option value="chinese">چینی</option>
          <option value="korean">کره‌ای</option>
          <option value="japanese">ژاپنی</option>
          <option value="european">اروپایی</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">نام</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">برند</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">مبدا</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">دسته</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">قیمت از</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">داده</th>
              <th className="text-center px-4 py-3 font-bold text-xs text-muted">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((car) => {
              const hasScores = !!car.scores;
              const hasSpecs = !!car.specs;
              const hasIntel = !!car.intel;
              const reviewCount = car.reviews?.length || 0;

              return (
                <tr key={car.id} className="border-b border-border/50 hover:bg-background/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold">{car.nameFa}</div>
                    <div className="text-[10px] text-muted">{car.nameEn}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{car.brandFa}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold bg-background px-2 py-0.5 rounded-full">
                      {getOriginLabel(car.origin)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{getCategoryLabel(car.category)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-primary">
                    {toPersianDigits(formatPrice(car.priceMin))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasScores ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"}`}>
                        S
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasSpecs ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"}`}>
                        Sp
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${hasIntel ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"}`}>
                        I
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-background text-muted">
                        R{toPersianDigits(reviewCount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => router.push(`/admin/cars/${car.id}`)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors"
                        title="ویرایش"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(car.id)}
                        className="p-1.5 rounded-lg hover:bg-danger/10 text-muted hover:text-danger transition-colors"
                        title="حذف"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-80">
            <p className="text-sm font-bold text-center mb-1">حذف خودرو</p>
            <p className="text-xs text-muted text-center mb-4">
              {cars.find((c) => c.id === deleteConfirm)?.nameFa} و تمام داده‌های مرتبط حذف شود؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-background text-foreground text-sm font-bold rounded-xl">
                انصراف
              </button>
              <button onClick={() => deleteCar(deleteConfirm)} className="flex-1 py-2 bg-danger text-white text-sm font-bold rounded-xl">
                حذف
              </button>
            </div>
          </div>
        </>
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

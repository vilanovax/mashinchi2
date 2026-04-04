"use client";

import { useState, useEffect } from "react";
import { formatPrice, toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface User {
  id: string; sessionId: string; budget: string | null;
  totalInteractions: number; likes: number; skips: number; favorites: number;
  userTypes: string[]; hasTasteProfile: boolean;
  createdAt: string; updatedAt: string;
}

export default function AdminUsersPage() {
  const { fetchAdmin } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmin("/api/admin/users").then((r) => r.json()).then((d) => { setUsers(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const activeUsers = users.filter((u) => u.totalInteractions > 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">کاربران</h1>
        <div className="flex gap-3 text-sm text-muted">
          <span>{toPersianDigits(users.length)} کل</span>
          <span>{toPersianDigits(activeUsers.length)} فعال</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-surface rounded-xl border border-border p-3">
          <div className="text-xl font-black text-primary">{toPersianDigits(users.length)}</div>
          <div className="text-[10px] text-muted">کل کاربران</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3">
          <div className="text-xl font-black text-accent">{toPersianDigits(activeUsers.length)}</div>
          <div className="text-[10px] text-muted">فعال (تعامل داشته)</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3">
          <div className="text-xl font-black">{toPersianDigits(users.filter((u) => u.hasTasteProfile).length)}</div>
          <div className="text-[10px] text-muted">دارای پروفایل سلیقه</div>
        </div>
        <div className="bg-surface rounded-xl border border-border p-3">
          <div className="text-xl font-black text-danger">{toPersianDigits(users.reduce((s, u) => s + u.favorites, 0))}</div>
          <div className="text-[10px] text-muted">کل نشان‌شده‌ها</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">شناسه</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">بودجه</th>
              <th className="text-center px-4 py-3 font-bold text-xs text-muted">تعاملات</th>
              <th className="text-center px-4 py-3 font-bold text-xs text-muted">لایک</th>
              <th className="text-center px-4 py-3 font-bold text-xs text-muted">اسکیپ</th>
              <th className="text-center px-4 py-3 font-bold text-xs text-muted">نشان</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">تیپ خریدار</th>
              <th className="text-right px-4 py-3 font-bold text-xs text-muted">آخرین فعالیت</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 hover:bg-background/30 transition-colors">
                <td className="px-4 py-2.5 text-xs font-mono text-muted">{u.sessionId}</td>
                <td className="px-4 py-2.5 text-xs font-bold text-primary">
                  {u.budget && u.budget !== "0" ? toPersianDigits(formatPrice(u.budget)) : "-"}
                </td>
                <td className="px-4 py-2.5 text-xs text-center">{toPersianDigits(u.totalInteractions)}</td>
                <td className="px-4 py-2.5 text-xs text-center text-accent font-bold">{toPersianDigits(u.likes)}</td>
                <td className="px-4 py-2.5 text-xs text-center">{toPersianDigits(u.skips)}</td>
                <td className="px-4 py-2.5 text-xs text-center text-danger font-bold">{toPersianDigits(u.favorites)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    {u.userTypes.length > 0 ? u.userTypes.map((t) => (
                      <span key={t} className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t}</span>
                    )) : <span className="text-[10px] text-muted">-</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[10px] text-muted">
                  {new Date(u.updatedAt).toLocaleDateString("fa-IR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-sm text-muted text-center py-8">کاربری وجود ندارد</p>}
      </div>
    </div>
  );
}

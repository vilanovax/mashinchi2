"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface AdminUser {
  id: string; username: string; name: string; role: string;
  isActive: boolean; lastLogin: string | null; createdAt: string;
}

const ROLE_LABELS: Record<string, string> = { super_admin: "مدیر ارشد", editor: "ویرایشگر", viewer: "مشاهده‌کننده" };
const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-danger/10 text-danger",
  editor: "bg-primary/10 text-primary",
  viewer: "bg-muted/10 text-muted",
};

export default function AdminTeamPage() {
  const { fetchAdmin, role } = useAdmin();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/admin-users").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setAdmins(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleAdd = async () => {
    if (!newUsername || !newPassword || !newName) return;
    const res = await fetchAdmin("/api/admin/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, name: newName, role: newRole }),
    });
    if (res.ok) {
      const data = await res.json();
      setAdmins([...admins, { ...data, isActive: true, lastLogin: null, createdAt: new Date().toISOString() }]);
      setShowAdd(false);
      setNewUsername(""); setNewPassword(""); setNewName(""); setNewRole("editor");
      showToast("کاربر اضافه شد");
    } else {
      const err = await res.json();
      showToast(err.error || "خطا");
    }
  };

  if (role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">فقط مدیر ارشد به این بخش دسترسی دارد</p>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">مدیریت تیم</h1>
        <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg">
          + عضو جدید
        </button>
      </div>

      <div className="space-y-3">
        {admins.map((admin) => (
          <div key={admin.id} className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-black text-primary">{admin.name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{admin.name}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[admin.role] || "bg-background text-muted"}`}>
                  {ROLE_LABELS[admin.role] || admin.role}
                </span>
                {!admin.isActive && (
                  <span className="text-[9px] bg-danger/10 text-danger px-2 py-0.5 rounded-full">غیرفعال</span>
                )}
              </div>
              <div className="text-[11px] text-muted">@{admin.username}</div>
            </div>
            <div className="text-left shrink-0">
              <div className="text-[10px] text-muted">آخرین ورود</div>
              <div className="text-[11px]">
                {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString("fa-IR") : "هرگز"}
              </div>
            </div>
          </div>
        ))}

        {/* Env-based admin info */}
        <div className="bg-background/50 rounded-xl border border-dashed border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-muted/10 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-muted">Admin (env)</div>
            <div className="text-[10px] text-muted">ورود با ADMIN_PASSWORD محیطی - همیشه super_admin</div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowAdd(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-2xl p-6 z-50 shadow-2xl w-96">
            <h3 className="text-sm font-black mb-4">عضو جدید</h3>
            <div className="space-y-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="نام نمایشی" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="نام کاربری (انگلیسی)" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" dir="ltr" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="رمز عبور" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none" />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none">
                <option value="viewer">مشاهده‌کننده</option>
                <option value="editor">ویرایشگر</option>
                <option value="super_admin">مدیر ارشد</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-background text-sm font-bold rounded-xl">انصراف</button>
              <button onClick={handleAdd} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl">ایجاد</button>
            </div>
          </div>
        </>
      )}

      {/* Info */}
      <div className="mt-5 bg-primary/5 border border-primary/15 rounded-xl p-4">
        <h4 className="text-xs font-black mb-1">سطوح دسترسی</h4>
        <div className="text-[11px] text-muted leading-5 space-y-1">
          <div><span className="font-bold text-danger">مدیر ارشد:</span> دسترسی کامل + مدیریت تیم + حذف</div>
          <div><span className="font-bold text-primary">ویرایشگر:</span> افزودن/ویرایش خودرو، نظرات، قیمت‌ها</div>
          <div><span className="font-bold text-muted">مشاهده‌کننده:</span> فقط مشاهده داشبورد و داده‌ها</div>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs font-bold px-5 py-2.5 rounded-full shadow-xl z-50">{toast}</div>}
    </div>
  );
}

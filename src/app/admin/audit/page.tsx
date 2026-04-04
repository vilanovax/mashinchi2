"use client";

import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils";
import { useAdmin } from "../layout";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "ایجاد", color: "bg-accent/10 text-accent" },
  update: { label: "بروزرسانی", color: "bg-primary/10 text-primary" },
  delete: { label: "حذف", color: "bg-danger/10 text-danger" },
  import: { label: "واردات", color: "bg-violet-500/10 text-violet-600" },
  ai_generate: { label: "تولید AI", color: "bg-amber-500/10 text-amber-600" },
};

const ENTITY_LABELS: Record<string, string> = {
  car: "خودرو", review: "نظر", crawler: "کرالر", price: "قیمت", settings: "تنظیمات",
};

export default function AdminAuditPage() {
  const { fetchAdmin } = useAdmin();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmin("/api/admin/audit?limit=100").then((r) => r.json()).then((d) => { setLogs(d); setLoading(false); }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const filtered = filterEntity === "all" ? logs : logs.filter((l) => l.entity === filterEntity);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black">لاگ عملیات</h1>
        <span className="text-sm text-muted">{toPersianDigits(filtered.length)} رکورد</span>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-4">
        {["all", "car", "review", "crawler", "price", "settings"].map((e) => (
          <button
            key={e}
            onClick={() => setFilterEntity(e)}
            className={`text-[11px] px-3 py-1 rounded-full font-bold transition-colors ${
              filterEntity === e ? "bg-primary text-white" : "bg-background text-muted"
            }`}
          >
            {e === "all" ? "همه" : ENTITY_LABELS[e] || e}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="space-y-1.5">
        {filtered.map((log) => {
          const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-background text-muted" };
          const isExpanded = expandedLog === log.id;

          return (
            <div
              key={log.id}
              className="bg-surface rounded-xl border border-border overflow-hidden"
            >
              <div
                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-background/30 transition-colors"
              >
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${actionInfo.color}`}>
                  {actionInfo.label}
                </span>
                <span className="text-[10px] bg-background px-2 py-0.5 rounded-full shrink-0">
                  {ENTITY_LABELS[log.entity] || log.entity}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs truncate block">
                    {log.details?.nameFa ? String(log.details.nameFa) : log.entityId ? `ID: ${log.entityId.slice(0, 8)}...` : "-"}
                  </span>
                </div>
                <span className="text-[10px] text-muted shrink-0">
                  {new Date(log.createdAt).toLocaleDateString("fa-IR")} {new Date(log.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-border/50 pt-2">
                  <pre className="text-[10px] bg-background rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-5" dir="ltr">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted text-center py-8">هیچ لاگی ثبت نشده</p>
        )}
      </div>
    </div>
  );
}

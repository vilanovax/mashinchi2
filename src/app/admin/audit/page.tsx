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

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-500",
  update: "bg-primary",
  delete: "bg-red-500",
  import: "bg-violet-500",
  ai_generate: "bg-amber-500",
};

const ACTION_LABELS: Record<string, string> = {
  create: "ایجاد", update: "بروزرسانی", delete: "حذف",
  import: "واردات", ai_generate: "تولید AI",
};

const ENTITY_LABELS: Record<string, string> = {
  car: "خودرو", review: "نظر", crawler: "کرالر", price: "قیمت",
  settings: "تنظیمات", source: "منبع", admin: "ادمین",
};

function extractName(entry: AuditEntry): string {
  const d = entry.details;
  if (d?.nameFa) return String(d.nameFa);
  if (d?.carName) return String(d.carName);
  if (d?.action) return String(d.action);
  return "";
}

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

  // Entity types present in data
  const entityTypes = [...new Set(logs.map((l) => l.entity))];
  const filtered = filterEntity === "all" ? logs : logs.filter((l) => l.entity === filterEntity);

  // Group by date
  const grouped: Record<string, AuditEntry[]> = {};
  for (const log of filtered) {
    const dateKey = new Date(log.createdAt).toLocaleDateString("fa-IR");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(log);
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-black">لاگ عملیات</h1>
          <p className="text-[10px] text-muted">{toPersianDigits(filtered.length)} رکورد</p>
        </div>
      </div>

      {/* Filter — dynamic based on data */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setFilterEntity("all")}
          className={`text-[9px] px-2.5 py-1 rounded-full font-bold border ${filterEntity === "all" ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"}`}>
          همه {toPersianDigits(logs.length)}
        </button>
        {entityTypes.map((e) => (
          <button key={e} onClick={() => setFilterEntity(filterEntity === e ? "all" : e)}
            className={`text-[9px] px-2.5 py-1 rounded-full font-bold border ${filterEntity === e ? "bg-primary text-white border-primary" : "bg-surface border-border text-muted"}`}>
            {ENTITY_LABELS[e] || e} {toPersianDigits(logs.filter((l) => l.entity === e).length)}
          </button>
        ))}
      </div>

      {/* Timeline grouped by date */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, entries]) => (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold text-muted bg-background px-2 py-0.5 rounded">{date}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[9px] text-muted/60">{toPersianDigits(entries.length)}</span>
            </div>

            {/* Entries */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden divide-y divide-border/30">
              {entries.map((log) => {
                const dotColor = ACTION_COLORS[log.action] || "bg-muted";
                const actionLabel = ACTION_LABELS[log.action] || log.action;
                const entityLabel = ENTITY_LABELS[log.entity] || log.entity;
                const name = extractName(log);
                const time = new Date(log.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
                const isExpanded = expandedLog === log.id;

                return (
                  <div key={log.id}>
                    <div
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-background/40 transition-colors"
                    >
                      {/* Time */}
                      <span className="text-[9px] text-muted/60 w-10 shrink-0 font-mono">{time}</span>

                      {/* Dot */}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />

                      {/* Action + Entity + Name */}
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-foreground">{actionLabel}</span>
                        <span className="text-[9px] text-muted">{entityLabel}</span>
                        {name && (
                          <>
                            <span className="text-muted/30">·</span>
                            <span className="text-[10px] text-foreground truncate">{name}</span>
                          </>
                        )}
                      </div>

                      {/* Expand indicator */}
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-muted/30 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>

                    {isExpanded && Object.keys(log.details).length > 0 && (
                      <div className="px-3 pb-2 pt-1 border-t border-border/20">
                        <div className="bg-background rounded-lg px-3 py-2 text-[9px] font-mono leading-5 max-h-[150px] overflow-y-auto" dir="ltr">
                          {Object.entries(log.details).map(([key, val]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-muted shrink-0">{key}:</span>
                              <span className="text-foreground break-all">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-xs text-muted text-center py-8">هیچ لاگی ثبت نشده</p>
        )}
      </div>
    </div>
  );
}

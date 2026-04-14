"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: "Vazirmatn, sans-serif", margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "#f8fafc", color: "#0f172a" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <div style={{ width: "64px", height: "64px", margin: "0 auto 16px", borderRadius: "50%", background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "8px" }}>خطای سیستمی</h1>
          <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.7, marginBottom: "20px" }}>
            اپلیکیشن با خطای جدی مواجه شد. لطفا صفحه رو تازه کن.
          </p>
          {error.digest && (
            <p style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace", marginBottom: "16px" }}>
              کد خطا: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{ padding: "10px 20px", background: "#2563eb", color: "white", fontWeight: 700, fontSize: "12px", borderRadius: "12px", border: "none", cursor: "pointer" }}
          >
            تلاش مجدد
          </button>
        </div>
      </body>
    </html>
  );
}

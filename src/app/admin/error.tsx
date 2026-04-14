"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error]", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md bg-surface rounded-2xl border border-border p-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>

        <h1 className="text-base font-black mb-1">خطا در پنل ادمین</h1>
        <p className="text-xs text-muted leading-6 mb-4">
          درخواست با خطا مواجه شد. می‌تونی دوباره تلاش کنی یا به داشبورد برگردی.
        </p>

        <details className="text-right mb-4">
          <summary className="text-[10px] text-muted cursor-pointer hover:text-foreground">جزئیات فنی</summary>
          <div className="mt-2 bg-background rounded-lg p-2 text-[9px] font-mono text-muted break-all text-left" dir="ltr">
            {error.message?.slice(0, 300) || "Unknown error"}
            {error.digest && <div className="mt-1 opacity-60">Digest: {error.digest}</div>}
          </div>
        </details>

        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-lg"
          >
            تلاش مجدد
          </button>
          <button
            onClick={() => (window.location.href = "/admin")}
            className="px-4 py-2 bg-background border border-border font-bold text-xs rounded-lg"
          >
            داشبورد
          </button>
        </div>
      </div>
    </div>
  );
}

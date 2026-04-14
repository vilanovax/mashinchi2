import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "صفحه پیدا نشد | ماشینچی",
  description: "صفحه‌ای که دنبالش می‌گشتی پیدا نشد",
};

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 min-h-[70vh]">
      <div className="text-center max-w-sm">
        {/* 404 illustration */}
        <div className="relative mb-6 inline-block">
          <div className="text-[88px] font-black text-primary/10 leading-none select-none">۴۰۴</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M8 11h6" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-xl font-black mb-2">صفحه پیدا نشد</h1>
        <p className="text-sm text-muted leading-7 mb-6">
          این صفحه یا پاک شده یا آدرس اشتباه وارد کردی. بیا از اول شروع کن.
        </p>

        <div className="flex gap-2 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-dark shadow-lg shadow-primary/20"
          >
            صفحه اصلی
          </Link>
          <Link
            href="/catalog"
            className="px-5 py-2.5 bg-surface border border-border font-bold text-xs rounded-xl hover:border-primary/30"
          >
            کاتالوگ خودرو
          </Link>
        </div>
      </div>
    </div>
  );
}

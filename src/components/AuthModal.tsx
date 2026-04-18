"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { toPersianDigits } from "@/lib/utils";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    const result = mode === "login"
      ? await login(phone, password)
      : await register(phone, password);

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setPhone("");
        setPassword("");
      }, 1000);
    } else {
      setError(result.error || "خطایی رخ داد");
    }
  };

  const isValid = /^09\d{9}$/.test(phone.replace(/\s|-/g, "")) && /^\d{6}$/.test(password);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl z-50 shadow-2xl safe-bottom animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-2 mb-4" />
        <div className="px-6 pb-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-3 bg-accent/10 rounded-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="text-sm font-bold text-accent">
                {mode === "login" ? "خوش آمدید!" : "ثبت‌نام موفق!"}
              </p>
            </div>
          ) : (
            <>
              {/* Title */}
              <h2 className="text-lg font-black text-center mb-1">
                {mode === "login" ? "ورود" : "ثبت‌نام"}
              </h2>
              <p className="text-xs text-muted text-center mb-6">
                {mode === "login"
                  ? "با شماره موبایل وارد شوید"
                  : "با شماره موبایل ثبت‌نام کنید"}
              </p>

              {/* Phone input */}
              <div className="mb-3">
                <label className="text-[11px] font-bold text-muted mb-1 block">شماره موبایل</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                    setPhone(val);
                    setError("");
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-center tracking-widest font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  dir="ltr"
                />
              </div>

              {/* Password input */}
              <div className="mb-4">
                <label className="text-[11px] font-bold text-muted mb-1 block">
                  رمزعبور ({toPersianDigits("6")} رقم)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="******"
                  maxLength={6}
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                    setPassword(val);
                    setError("");
                  }}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-center tracking-[0.5em] font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  dir="ltr"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-3 text-center text-xs text-danger bg-danger/5 border border-danger/15 rounded-lg py-2 px-3">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className="w-full py-3 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : mode === "login" ? (
                  "ورود"
                ) : (
                  "ثبت‌نام"
                )}
              </button>

              {/* Toggle mode */}
              <div className="text-center mt-4">
                <button
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError("");
                  }}
                  className="text-xs text-primary font-bold"
                >
                  {mode === "login"
                    ? "حساب ندارید؟ ثبت‌نام کنید"
                    : "حساب دارید؟ وارد شوید"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

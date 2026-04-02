export function formatPrice(value: number | string): string {
  const num = typeof value === "string" ? parseInt(value) : value;
  if (num >= 1_000_000_000) {
    const billions = num / 1_000_000_000;
    return `${billions.toFixed(1)} میلیارد`;
  }
  if (num >= 1_000_000) {
    const millions = num / 1_000_000;
    return `${millions.toFixed(0)} میلیون`;
  }
  return num.toLocaleString("fa-IR");
}

export function formatPriceShort(value: number | string): string {
  const num = typeof value === "string" ? parseInt(value) : value;
  if (num >= 1_000_000_000) {
    const billions = num / 1_000_000_000;
    return `${billions.toFixed(1)}`;
  }
  return num.toLocaleString("fa-IR");
}

export function toPersianDigits(str: string | number): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(str).replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
}

export function getOriginLabel(origin: string): string {
  const map: Record<string, string> = {
    iranian: "ایرانی",
    chinese: "چینی",
    korean: "کره‌ای",
    japanese: "ژاپنی",
    european: "اروپایی",
  };
  return map[origin] || origin;
}

export function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    sedan: "سدان",
    suv: "شاسی‌بلند",
    hatchback: "هاچبک",
    crossover: "کراس‌اوور",
    pickup: "وانت",
  };
  return map[category] || category;
}

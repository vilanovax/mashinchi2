import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "قیمت روز خودرو | بازار خودرو ایران | ماشینچی",
  description: "قیمت روز خودروهای ایرانی، چینی، کره‌ای و اروپایی. نمودار تغییرات قیمت، روند هفتگی و ماهانه بازار خودرو.",
  openGraph: {
    title: "قیمت روز خودرو | ماشینچی",
    description: "قیمت روز و روند بازار خودرو ایران",
    type: "website",
    locale: "fa_IR",
  },
};

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}

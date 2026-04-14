import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کاتالوگ خودرو | مقایسه و بررسی ۱۳۷ خودرو بازار ایران | ماشینچی",
  description: "لیست کامل خودروهای بازار ایران با قیمت روز، مشخصات فنی، نقاط قوت و ضعف، امتیاز رضایت مالکان. فیلتر بر اساس مبدا، دسته و بودجه.",
  openGraph: {
    title: "کاتالوگ خودرو | ماشینچی",
    description: "مقایسه و بررسی ۱۳۷ خودرو بازار ایران با قیمت، مشخصات و نظرات",
    type: "website",
    locale: "fa_IR",
  },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}

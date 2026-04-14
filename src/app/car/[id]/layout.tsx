import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://mashinchi.ir";

  const car = await prisma.car.findUnique({
    where: { id },
    select: {
      nameFa: true, nameEn: true, brandFa: true, brand: true,
      category: true, origin: true, priceMin: true, priceMax: true,
      description: true, imageUrl: true,
      intel: { select: { overallSummary: true } },
    },
  });

  if (!car) {
    return { title: "خودرو پیدا نشد | ماشینچی" };
  }

  const priceText = car.priceMin > 0n
    ? `قیمت از ${(Number(car.priceMin) / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} میلیارد`
    : "";

  const title = `${car.nameFa} ${car.brandFa} | بررسی، قیمت و مشخصات | ماشینچی`;
  const description = car.intel?.overallSummary
    || car.description
    || `بررسی کامل ${car.nameFa} ${car.brandFa}. ${priceText}. مشخصات فنی، نقاط قوت و ضعف، نظرات کارشناسان و مالکان.`;

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      url: `${base}/car/${id}`,
      type: "website",
      siteName: "ماشینچی",
      locale: "fa_IR",
      ...(car.imageUrl ? { images: [{ url: car.imageUrl, width: 800, height: 450, alt: car.nameFa }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${car.nameFa} | ماشینچی`,
      description: description.slice(0, 160),
      ...(car.imageUrl ? { images: [car.imageUrl] } : {}),
    },
    alternates: {
      canonical: `${base}/car/${id}`,
    },
  };
}

export default async function CarLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://mashinchi.ir";

  // JSON-LD structured data
  const car = await prisma.car.findUnique({
    where: { id },
    select: {
      nameFa: true, nameEn: true, brandFa: true, brand: true,
      priceMin: true, priceMax: true, imageUrl: true, description: true,
      intel: { select: { overallSummary: true, ownerSatisfaction: true } },
    },
  });

  const jsonLd = car ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${car.nameFa} ${car.brandFa}`,
    description: car.intel?.overallSummary || car.description || `خودرو ${car.nameFa}`,
    brand: { "@type": "Brand", name: car.brandFa },
    ...(car.imageUrl ? { image: car.imageUrl } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IRR",
      lowPrice: (Number(car.priceMin) * 10).toString(),
      highPrice: (Number(car.priceMax) * 10).toString(),
      offerCount: 1,
    },
    ...(car.intel?.ownerSatisfaction ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: car.intel.ownerSatisfaction,
        bestRating: 10,
        worstRating: 1,
      },
    } : {}),
    url: `${base}/car/${id}`,
  } : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}

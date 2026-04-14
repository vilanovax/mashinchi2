import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://mashinchi.ir";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/catalog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/market`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  // Best/landing pages
  const bestSlugs = [
    "under-1b", "under-2b", "under-3b",
    "family", "low-risk", "city", "investment", "fuel-efficient",
    "iranian", "chinese",
  ];
  const bestPages: MetadataRoute.Sitemap = bestSlugs.map((slug) => ({
    url: `${base}/best/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Dynamic car pages
  const cars = await prisma.car.findMany({
    select: { id: true, updatedAt: true },
  });

  const carPages: MetadataRoute.Sitemap = cars.map((car) => ({
    url: `${base}/car/${car.id}`,
    lastModified: car.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...bestPages, ...carPages];
}

import * as cheerio from "cheerio";
import { COMMON_HEADERS, CarQuery, ImageCandidate, ImageSource } from "./types";

// Scrapes Bama.ir search results for a car model and collects listing photos.
async function fetchBamaCandidates(query: CarQuery, limit: number): Promise<ImageCandidate[]> {
  const q = `${query.brandFa} ${query.nameFa}`.trim();
  const searchUrl = `https://bama.ir/car?q=${encodeURIComponent(q)}`;

  const res = await fetch(searchUrl, { headers: COMMON_HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const candidates: ImageCandidate[] = [];

  // Bama listings use .car-box__image or img tags within ad cards
  $("img").each((_, el) => {
    if (candidates.length >= limit) return;
    const src = $(el).attr("data-src") || $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    if (!src) return;
    // Skip icons, logos, placeholders
    if (src.includes("logo") || src.includes("icon") || src.includes("placeholder")) return;
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(src)) return;
    // Bama images are on cdn-img.bama.ir
    if (!src.includes("bama.ir")) return;

    candidates.push({
      url: src.startsWith("//") ? `https:${src}` : src,
      source: "bama",
      title: alt || q,
    });
  });

  return candidates;
}

export const bamaSource: ImageSource = {
  name: "bama",
  label: "بما",
  fetch: fetchBamaCandidates,
};

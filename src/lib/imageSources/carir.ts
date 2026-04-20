import * as cheerio from "cheerio";
import { COMMON_HEADERS, CarQuery, ImageCandidate, ImageSource } from "./types";

// Scrapes car.ir search page for car spec images.
async function fetchCarirCandidates(query: CarQuery, limit: number): Promise<ImageCandidate[]> {
  const q = `${query.brandFa} ${query.nameFa}`.trim();
  const searchUrl = `https://car.ir/search?q=${encodeURIComponent(q)}`;

  const res = await fetch(searchUrl, { headers: COMMON_HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const candidates: ImageCandidate[] = [];

  $("img").each((_, el) => {
    if (candidates.length >= limit) return;
    const src = $(el).attr("data-src") || $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    if (!src) return;
    if (src.includes("logo") || src.includes("icon") || src.includes("avatar")) return;
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(src)) return;
    // car.ir uses various CDN domains
    if (!/car\.ir|cdn/i.test(src)) return;

    candidates.push({
      url: src.startsWith("//") ? `https:${src}` : src.startsWith("/") ? `https://car.ir${src}` : src,
      source: "carir",
      title: alt || q,
    });
  });

  return candidates;
}

export const carirSource: ImageSource = {
  name: "carir",
  label: "کارآیر",
  fetch: fetchCarirCandidates,
};

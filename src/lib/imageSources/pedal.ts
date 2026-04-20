import * as cheerio from "cheerio";
import { COMMON_HEADERS, CarQuery, ImageCandidate, ImageSource } from "./types";

// Scrapes pedal.ir search results (car review articles usually include good photos).
async function fetchPedalCandidates(query: CarQuery, limit: number): Promise<ImageCandidate[]> {
  const q = `${query.brandFa} ${query.nameFa}`.trim();
  const searchUrl = `https://pedal.ir/?s=${encodeURIComponent(q)}`;

  const res = await fetch(searchUrl, { headers: COMMON_HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const candidates: ImageCandidate[] = [];

  // Pedal posts have featured images in article cards
  $("article img, .post img, img").each((_, el) => {
    if (candidates.length >= limit) return;
    const src = $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    if (!src) return;
    if (src.includes("logo") || src.includes("icon") || src.includes("avatar") || src.includes("gravatar")) return;
    if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(src)) return;
    if (!src.includes("pedal.ir")) return;

    candidates.push({
      url: src.startsWith("//") ? `https:${src}` : src,
      source: "pedal",
      title: alt || q,
    });
  });

  return candidates;
}

export const pedalSource: ImageSource = {
  name: "pedal",
  label: "پدال",
  fetch: fetchPedalCandidates,
};

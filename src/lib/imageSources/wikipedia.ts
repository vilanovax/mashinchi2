import { COMMON_HEADERS, CarQuery, ImageCandidate, ImageSource } from "./types";

// Wikipedia's search + imageinfo APIs. Reliable and globally accessible with
// no API key. Best results for well-known car models that have their own
// Wikipedia page (Toyota Corolla, Hyundai Elantra, etc.).
async function fetchWikipediaCandidates(query: CarQuery, limit: number): Promise<ImageCandidate[]> {
  const q = `${query.brand} ${query.nameEn}`.trim();

  try {
    // Step 1: search for matching pages in English Wikipedia
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q + " car")}&srlimit=3&format=json&origin=*`;
    const searchRes = await fetch(searchUrl, { headers: COMMON_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!searchRes.ok) return [];
    const searchData = (await searchRes.json()) as { query?: { search?: Array<{ title: string }> } };
    const pageTitles = (searchData.query?.search || []).map((s) => s.title);
    if (pageTitles.length === 0) return [];

    // Step 2: fetch images from those pages (each page can return multiple)
    const titles = pageTitles.join("|");
    const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=images&imlimit=20&format=json&origin=*`;
    const imagesRes = await fetch(imagesUrl, { headers: COMMON_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!imagesRes.ok) return [];

    const imagesData = (await imagesRes.json()) as {
      query?: { pages?: Record<string, { images?: Array<{ title: string }> }> };
    };

    const imageTitles: string[] = [];
    for (const page of Object.values(imagesData.query?.pages || {})) {
      for (const img of page.images || []) {
        // Skip icons, logos, maps that typically show up on Wikipedia pages
        if (/commons-logo|svg|icon|flag|map\.png|symbol|edit/i.test(img.title)) continue;
        imageTitles.push(img.title);
      }
    }
    if (imageTitles.length === 0) return [];

    // Step 3: resolve File:... titles to actual URLs via imageinfo
    const batch = imageTitles.slice(0, limit + 5).join("|");
    const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(batch)}&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
    const infoRes = await fetch(infoUrl, { headers: COMMON_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!infoRes.ok) return [];

    const infoData = (await infoRes.json()) as {
      query?: { pages?: Record<string, { title: string; imageinfo?: Array<{ url: string; thumburl?: string; width?: number; height?: number }> }> };
    };

    const candidates: ImageCandidate[] = [];
    for (const page of Object.values(infoData.query?.pages || {})) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      if (!/\.(jpg|jpeg|png|webp)$/i.test(ii.url)) continue; // skip svg etc.
      candidates.push({
        url: ii.thumburl || ii.url,
        thumbnail: ii.thumburl,
        source: "wikipedia",
        title: page.title.replace(/^File:/, "").replace(/\.(jpg|png|jpeg|webp)$/i, ""),
        width: ii.width,
        height: ii.height,
      });
      if (candidates.length >= limit) break;
    }
    return candidates;
  } catch {
    return [];
  }
}

export const wikipediaSource: ImageSource = {
  name: "wikipedia",
  label: "ویکی‌پدیا",
  fetch: fetchWikipediaCandidates,
};

import { COMMON_HEADERS, CarQuery, ImageCandidate, ImageSource } from "./types";

// DuckDuckGo Images proxy. We call DDG under the "google" label because the
// user-facing idea is "general web image search". DDG returns high-quality
// image results (sourced from Bing) with a simple two-step flow: first we
// grab a `vqd` token from the HTML, then we hit i.js with it.
async function fetchGoogleCandidates(query: CarQuery, limit: number): Promise<ImageCandidate[]> {
  const q = `${query.brand} ${query.nameEn} ${query.year || ""} car`.trim();

  try {
    // Step 1: get the vqd token
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iar=images&iax=images&ia=images`,
      { headers: COMMON_HEADERS, signal: AbortSignal.timeout(12000) }
    );
    if (!tokenRes.ok) return [];
    const tokenHtml = await tokenRes.text();
    const vqdMatch = tokenHtml.match(/vqd=["']?([\d-]+)["']?/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];

    // Step 2: fetch JSON image results
    const resultsRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,type:photo&p=1`,
      {
        headers: {
          ...COMMON_HEADERS,
          "Accept": "application/json",
          "Referer": "https://duckduckgo.com/",
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!resultsRes.ok) return [];

    const data = (await resultsRes.json()) as {
      results?: Array<{ image: string; thumbnail: string; title: string; width?: number; height?: number }>;
    };
    if (!Array.isArray(data.results)) return [];

    return data.results.slice(0, limit).map((r) => ({
      url: r.image,
      thumbnail: r.thumbnail,
      source: "google",
      title: r.title,
      width: r.width,
      height: r.height,
    }));
  } catch {
    return [];
  }
}

export const googleSource: ImageSource = {
  name: "google",
  label: "گوگل",
  fetch: fetchGoogleCandidates,
};

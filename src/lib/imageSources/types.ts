export interface CarQuery {
  brand: string;       // English brand, e.g. "Toyota"
  brandFa: string;     // Farsi brand, e.g. "تویوتا"
  nameEn: string;      // English model name
  nameFa: string;      // Farsi model name
  year?: number;
}

export interface ImageCandidate {
  url: string;         // direct URL to the image
  source: string;      // "bama", "carir", "pedal", "google", etc.
  title?: string;      // optional description (listing title, article title, etc.)
  thumbnail?: string;  // optional smaller preview URL
  width?: number;
  height?: number;
}

export interface ImageSource {
  name: string;
  label: string;       // Farsi label for UI
  fetch(query: CarQuery, limit: number): Promise<ImageCandidate[]>;
}

export const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8",
};

export function dedupeUrls(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}

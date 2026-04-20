import { bamaSource } from "./bama";
import { carirSource } from "./carir";
import { pedalSource } from "./pedal";
import { googleSource } from "./google";
import { wikipediaSource } from "./wikipedia";
import { CarQuery, ImageCandidate, ImageSource, dedupeUrls } from "./types";

export const ALL_SOURCES: ImageSource[] = [
  googleSource,
  wikipediaSource,
  bamaSource,
  carirSource,
  pedalSource,
];

export function getSourcesByNames(names: string[]): ImageSource[] {
  return ALL_SOURCES.filter((s) => names.includes(s.name));
}

export interface SourceResult {
  source: string;
  status: "ok" | "empty" | "error";
  count: number;
  error?: string;
}

export interface AllCandidatesResult {
  candidates: ImageCandidate[];
  sourceResults: SourceResult[];
}

/**
 * Fetch candidates from multiple sources in parallel. Returns combined
 * deduplicated list plus per-source diagnostic info (so the UI can show
 * which sources worked, which returned empty, which errored).
 */
export async function fetchAllCandidates(
  query: CarQuery,
  sources: ImageSource[],
  perSourceLimit = 5
): Promise<AllCandidatesResult> {
  const results = await Promise.allSettled(
    sources.map((s) => s.fetch(query, perSourceLimit))
  );

  const all: ImageCandidate[] = [];
  const sourceResults: SourceResult[] = [];

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      all.push(...r.value);
      sourceResults.push({
        source: s.name,
        status: r.value.length > 0 ? "ok" : "empty",
        count: r.value.length,
      });
    } else {
      sourceResults.push({
        source: s.name,
        status: "error",
        count: 0,
        error: (r.reason as Error)?.message?.slice(0, 120) || "unknown",
      });
    }
  }

  return { candidates: dedupeUrls(all), sourceResults };
}

export type { CarQuery, ImageCandidate, ImageSource };

// Local storage helper for recommendation history
// Keeps last 3 result snapshots so user can revisit past suggestions

export interface HistoryEntry {
  id: string;          // unique id (timestamp-based)
  date: string;        // ISO date
  budget: string | null;
  cars: {
    id: string;
    nameFa: string;
    brandFa: string;
    priceMin: string;
    priceMax: string;
    matchScore: number;
  }[];
}

const KEY = "mashinchi-recommend-history";
const MAX = 3;

export function saveSnapshot(entry: Omit<HistoryEntry, "id" | "date">): void {
  if (typeof window === "undefined") return;
  if (!entry.cars || entry.cars.length === 0) return;

  try {
    const raw = localStorage.getItem(KEY);
    const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];

    // Skip if identical to most recent (same budget + same top car ids)
    const last = history[0];
    if (last && last.budget === entry.budget) {
      const lastIds = last.cars.slice(0, 3).map((c) => c.id).join(",");
      const newIds = entry.cars.slice(0, 3).map((c) => c.id).join(",");
      if (lastIds === newIds) return;
    }

    const newEntry: HistoryEntry = {
      id: `h_${Date.now()}`,
      date: new Date().toISOString(),
      ...entry,
    };

    const next = [newEntry, ...history].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage errors (private mode, quota)
  }
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

export function removeSnapshot(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const history = getHistory().filter((h) => h.id !== id);
    localStorage.setItem(KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

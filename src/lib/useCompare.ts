"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "mashinchi-compare";
const MAX_ITEMS = 2;

export function useCompare() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const router = useRouter();

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setCompareIds(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Sync to sessionStorage
  const persist = useCallback((ids: string[]) => {
    setCompareIds(ids);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }, []);

  const addToCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id) || prev.length >= MAX_ITEMS) return prev;
      const next = [...prev, id];
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      const next = prev.filter((i) => i !== id);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < MAX_ITEMS ? [...prev, id] : prev;
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    persist([]);
  }, [persist]);

  const isInCompare = useCallback((id: string) => compareIds.includes(id), [compareIds]);

  const canCompare = compareIds.length === MAX_ITEMS;

  const goToCompare = useCallback(() => {
    if (canCompare) {
      router.push(`/compare?a=${compareIds[0]}&b=${compareIds[1]}`);
    }
  }, [canCompare, compareIds, router]);

  return {
    compareIds,
    addToCompare,
    removeFromCompare,
    toggleCompare,
    clearCompare,
    isInCompare,
    canCompare,
    goToCompare,
    count: compareIds.length,
  };
}

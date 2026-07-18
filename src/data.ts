import Papa from "papaparse";
import { config, HEADER_MAP, rankByValue } from "./config";
import type { BookGroup, Review } from "./types";

const CACHE_KEY = "library-reviews-cache-v1";

type CacheShape = {
  fetchedAt: number;
  csv: string;
};

// Parses "DD/MM/YYYY H:MM:SS" (Google Sheets he-IL export) into a Date.
// Falls back to the native parser for anything unexpected.
export function parseSheetDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const m = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    const [, dd, mm, yyyy, hh = "0", min = "0", ss = "0"] = m;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss),
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function rowsFromCsv(csv: string): Review[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const reviews: Review[] = [];
  parsed.data.forEach((row, i) => {
    const book = (row[HEADER_MAP.book] ?? "").trim();
    const author = (row[HEADER_MAP.author] ?? "").trim();
    const rank = (row[HEADER_MAP.rank] ?? "").trim();
    const review = (row[HEADER_MAP.review] ?? "").trim();
    const reader = (row[HEADER_MAP.reader] ?? "").trim();
    const rawDate = (row[HEADER_MAP.date] ?? "").trim();

    // Skip rows with no book title (blank/malformed lines).
    if (!book) return;

    reviews.push({
      id: `${i}`,
      book,
      author,
      rank,
      review,
      reader,
      rawDate,
      date: parseSheetDate(rawDate),
    });
  });

  return reviews;
}

export function groupByBook(reviews: Review[]): BookGroup[] {
  const groups = new Map<string, BookGroup>();

  for (const r of reviews) {
    const key = `${r.book}\u0000${r.author}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        book: r.book,
        author: r.author,
        reviews: [],
        count: 0,
        avgScore: 0,
        latest: 0,
      };
      groups.set(key, g);
    }
    g.reviews.push(r);
  }

  for (const g of groups.values()) {
    g.reviews.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
    g.count = g.reviews.length;
    g.latest = g.reviews[0]?.date?.getTime() ?? 0;
    const scores = g.reviews
      .map((r) => rankByValue(r.rank)?.score)
      .filter((s): s is number => typeof s === "number");
    g.avgScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  return [...groups.values()];
}

function readCache(): CacheShape | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : null;
  } catch {
    return null;
  }
}

function writeCache(csv: string) {
  try {
    const payload: CacheShape = { fetchedAt: Date.now(), csv };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage may be full or unavailable; caching is best-effort.
  }
}

// In-memory copies so navigating between pages never re-parses or re-fetches.
let memReviews: Review[] | null = null;
let inflight: Promise<Review[]> | null = null;

// Returns the last-known reviews instantly (memory, then localStorage) without
// any network call, or null if nothing is cached yet. Used for instant paint.
export function getCachedReviews(): Review[] | null {
  if (memReviews) return memReviews;
  const cache = readCache();
  if (!cache) return null;
  memReviews = rowsFromCsv(cache.csv);
  return memReviews;
}

// Fetches fresh data from the sheet, updates caches, and returns it. Concurrent
// callers share one in-flight request.
export function fetchFreshReviews(): Promise<Review[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(config.csvUrl, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = await res.text();
      writeCache(csv);
      memReviews = rowsFromCsv(csv);
      return memReviews;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Warms the cache in the background (e.g. from the home screen) so the reviews
// page is ready by the time the user navigates to it. Errors are ignored.
export function prefetchReviews(): void {
  if (memReviews) return;
  fetchFreshReviews().catch(() => {
    /* will retry when the reviews page loads */
  });
}

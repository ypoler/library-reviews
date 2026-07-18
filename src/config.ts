// Central configuration. Edit these values to point the app at your own
// library's Google Sheet / Form and to change wording, without touching the
// component code.

export const config = {
  // Shown in the site header / home screen.
  libraryName: "ספריית נווה-מונוסון",

  // Public "fill the form" URL (Google Form -> Send -> link).
  // Leave empty until you have it; the "write a review" button will be disabled.
  formUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSc1wm6gADnW0s2TsX0TS8-g3fnK9BKZ0RfGbMmBjOTlqZi1QQ/viewform",

  // Public CSV of the responses sheet via "File -> Share -> Publish to web -> CSV".
  // This endpoint sends `cache-control: max-age=300`, so the browser caches it for
  // ~5 min and repeat loads are instant. New form responses appear within a few
  // minutes (Google's publish refresh interval).
  csvUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0AVoUec2PLIbt6ty3VMifdLtix1cfcEP5zsZkB_P157Du2aCL3fiS9EJYkr1Vtcm65pFnnyKKhu-7/pub?gid=0&single=true&output=csv",

  // How many book cards to show per "page" before "load more".
  pageSize: 24,
} as const;

// Maps the sheet's Hebrew column headers to internal field names. If your form
// uses different headers, update the right-hand side to match row 1 exactly.
export const HEADER_MAP = {
  date: "חותמת זמן",
  book: "שם הספר",
  author: "שם הסופר/ת",
  rank: "דירוג",
  review: "ביקורת מפורטת",
  reader: "שם הקורא/ת",
} as const;

export type RankLevel = {
  value: string; // exact text as it appears in the sheet
  score: number; // higher = better, used for sorting and averaging
  badgeClass: string; // Tailwind classes for the colored badge
};

// Ranks ordered best -> worst. `score` drives "highest/lowest rank" sorting and
// the average-rank badge on each book. Update `value` if your form's options
// differ from the sample data.
export const RANK_LEVELS: RankLevel[] = [
  {
    value: "אחד הספרים הטובים שקראתי",
    score: 4,
    badgeClass:
      "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-400/20",
  },
  {
    value: "מומלץ מאוד",
    score: 3,
    badgeClass:
      "bg-green-100 text-green-800 ring-green-600/20 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-400/20",
  },
  {
    value: "נחמד",
    score: 2,
    badgeClass:
      "bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-400/20",
  },
  {
    value: "משעמם",
    score: 1,
    badgeClass:
      "bg-rose-100 text-rose-800 ring-rose-600/20 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-400/20",
  },
];

const RANK_BY_VALUE = new Map(RANK_LEVELS.map((r) => [r.value, r]));

export function rankByValue(value: string): RankLevel | undefined {
  return RANK_BY_VALUE.get(value.trim());
}

// Given an average numeric score, return the nearest defined rank level (for
// coloring / labeling a book's average).
export function rankByScore(score: number): RankLevel {
  let best = RANK_LEVELS[0];
  let bestDiff = Infinity;
  for (const level of RANK_LEVELS) {
    const diff = Math.abs(level.score - score);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = level;
    }
  }
  return best;
}

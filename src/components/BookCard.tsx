import { useState } from "react";
import type { BookGroup, Review } from "../types";
import { t } from "../strings";
import { AverageRankBadge, RankBadge } from "./RankBadge";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatDate(d: Date | null): string {
  return d ? dateFmt.format(d) : "";
}

// Deterministic "book cover" color from the title so each book looks distinct
// but stable across renders.
const COVER_GRADIENTS = [
  "from-rose-500 to-rose-700",
  "from-amber-500 to-orange-700",
  "from-emerald-500 to-teal-700",
  "from-sky-500 to-indigo-700",
  "from-violet-500 to-fuchsia-700",
  "from-lime-500 to-green-700",
  "from-cyan-500 to-blue-700",
  "from-fuchsia-500 to-pink-700",
  "from-teal-500 to-cyan-700",
  "from-red-500 to-rose-700",
];

function coverGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return COVER_GRADIENTS[h % COVER_GRADIENTS.length];
}

const CARD =
  "overflow-hidden rounded-xl border border-amber-200 bg-[#fffdf8] shadow-sm dark:border-stone-700 dark:bg-stone-800";

export function BookCard({ group }: { group: BookGroup }) {
  const [open, setOpen] = useState(false);
  const grad = coverGradient(group.book + group.author);
  const coverText = group.book.split(/\s+/).slice(0, 3).join(" ");

  return (
    <div className={CARD}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-stretch gap-4 p-4 text-right"
        aria-expanded={open}
      >
        {/* book cover tile */}
        <div
          className={`relative flex w-16 flex-none items-center justify-center rounded-md bg-gradient-to-b ${grad} p-1.5 shadow-md sm:w-20`}
        >
          <span className="absolute inset-y-1.5 start-1 w-1 rounded-full bg-white/25" />
          <span
            className="line-clamp-4 text-center text-xs font-bold leading-tight text-white/95"
            dir="auto"
          >
            {coverText}
          </span>
        </div>

        {/* details */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h3
            className="truncate text-lg font-bold text-stone-900 dark:text-stone-50"
            dir="auto"
          >
            {group.book}
          </h3>
          {group.author && (
            <p
              className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400"
              dir="auto"
            >
              {t.by} {group.author}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AverageRankBadge score={group.avgScore} />
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {t.reviewsCount(group.count)}
            </span>
          </div>
        </div>

        <svg
          className={`mt-1 h-5 w-5 flex-none self-center text-amber-700 transition-transform dark:text-amber-400 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-black/5 px-4 pb-4 dark:border-white/10">
          <ul className="divide-y divide-amber-100 dark:divide-stone-700">
            {group.reviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.review.length > 180;
  const text =
    isLong && !expanded ? review.review.slice(0, 180) + "…" : review.review;

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="text-sm font-semibold text-stone-800 dark:text-stone-100"
          dir="auto"
        >
          {review.reader || "—"}
        </span>
        <div className="flex items-center gap-2">
          <RankBadge value={review.rank} />
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {formatDate(review.date)}
          </span>
        </div>
      </div>
      {review.review && (
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          <span dir="auto">{text}</span>{" "}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              {expanded ? t.showLess : t.showMore}
            </button>
          )}
        </p>
      )}
    </li>
  );
}

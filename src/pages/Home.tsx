import { useEffect } from "react";
import { Link } from "react-router-dom";
import { config } from "../config";
import { prefetchReviews } from "../data";
import { t } from "../strings";

const CARD =
  "group flex flex-col p-6 rounded-2xl border border-amber-200 bg-[#fffdf8] shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-stone-700 dark:bg-stone-800 dark:hover:border-amber-500";

export function Home() {
  // Warm the reviews cache while the user reads the home screen, so the
  // reviews page is ready (or near-ready) by the time they click through.
  useEffect(() => {
    prefetchReviews();
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-50 sm:text-4xl">
          {config.libraryName}
        </h1>
        <p className="mt-3 text-stone-600 dark:text-stone-300">{t.tagline}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormCard />

        <Link to="/reviews" className={CARD}>
          <span className="text-3xl">🔎</span>
          <span className="mt-3 text-xl font-bold">{t.browseReviews}</span>
          <span className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {t.browseReviewsSub}
          </span>
        </Link>
      </div>
    </div>
  );
}

function FormCard() {
  if (!config.formUrl) {
    return (
      <div className={`${CARD} cursor-not-allowed opacity-60`} aria-disabled>
        <span className="text-3xl">✍️</span>
        <span className="mt-3 text-xl font-bold">{t.writeReview}</span>
        <span className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {t.formUnavailable}
        </span>
      </div>
    );
  }

  return (
      <a href={config.formUrl} target="_blank" rel="noreferrer" className={CARD}>
        <span className="text-3xl">✍️</span>
        <span className="mt-3 text-xl font-bold">{t.writeReview}</span>
      <span className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {t.writeReviewSub}
      </span>
    </a>
  );
}

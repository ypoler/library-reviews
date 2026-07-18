import { rankByScore, rankByValue } from "../config";

export function RankBadge({ value }: { value: string }) {
  const level = rankByValue(value);
  const badgeClass =
    level?.badgeClass ??
    "bg-stone-100 text-stone-700 ring-stone-500/20 dark:bg-stone-700 dark:text-stone-200 dark:ring-stone-400/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeClass}`}
      dir="auto"
    >
      {value || "—"}
    </span>
  );
}

export function AverageRankBadge({ score }: { score: number }) {
  if (!score) {
    return (
      <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 ring-1 ring-inset ring-stone-500/20 dark:bg-stone-700 dark:text-stone-300 dark:ring-stone-400/20">
        —
      </span>
    );
  }
  const level = rankByScore(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${level.badgeClass}`}
      dir="auto"
      title={`ממוצע ${score.toFixed(1)}`}
    >
      {level.value}
    </span>
  );
}

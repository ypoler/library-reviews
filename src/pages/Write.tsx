import { Link } from "react-router-dom";
import { config } from "../config";
import { t } from "../strings";

// Google Forms renders inside an iframe when the `embedded=true` param is set.
function toEmbedUrl(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + "embedded=true";
}

export function Write() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="text-sm text-amber-700 hover:underline dark:text-amber-400"
        >
          {t.backHome}
        </Link>
        <a
          href={config.formUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-amber-700 hover:underline dark:text-amber-400"
        >
          {t.openFormFullPage}
        </a>
      </div>

      <h1 className="mb-4 text-2xl font-bold text-stone-900 dark:text-stone-50">
        {t.writeReview}
      </h1>

      <iframe
        src={toEmbedUrl(config.formUrl)}
        title={t.writeReview}
        className="h-[calc(100vh-12rem)] min-h-[600px] w-full rounded-xl border border-amber-200 bg-white dark:border-stone-700"
      >
        {t.formLoading}
      </iframe>
    </div>
  );
}

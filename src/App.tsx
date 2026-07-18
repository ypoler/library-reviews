import { Link, Outlet } from "react-router-dom";
import bookshelfBg from "./assets/bookshelf-bg.jpg";
import { config } from "./config";
import { t } from "./strings";
import { ModeSwitch } from "./theme";

export default function App() {
  return (
    <div className="flex min-h-full flex-col font-sans text-stone-800 dark:text-stone-100">
      {/* subtle colorful bookshelf backdrop, muted behind a paper/dark overlay */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bookshelfBg})` }}
        />
        <div className="absolute inset-0 bg-[#f6f1e7]/[0.78] dark:bg-[#1a1613]/[0.90]" />
      </div>

      <header className="border-b border-amber-200/70 bg-[#f6f1e7] dark:border-stone-700 dark:bg-stone-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <div className="leading-tight">
              <div className="text-lg font-bold text-stone-900 dark:text-stone-50">
                {config.libraryName}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {t.appTitle}
              </div>
            </div>
          </Link>
          <ModeSwitch />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="py-4 text-center text-xs text-stone-500 dark:text-stone-400">
        {config.libraryName}
      </footer>
    </div>
  );
}

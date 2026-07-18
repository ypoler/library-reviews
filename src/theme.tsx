import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Mode = "light" | "dark" | "system";

const STORAGE_KEY = "library-reviews-mode";

function getInitialMode(): Mode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyMode(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

type ModeContextValue = {
  mode: Mode;
  setMode: (m: Mode) => void;
};

const ModeContext = createContext<ModeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(getInitialMode);

  useEffect(() => {
    applyMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyMode("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within ThemeProvider");
  return ctx;
}

const ICONS: Record<Mode, ReactNode> = {
  light: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path
        fillRule="evenodd"
        d="M10 1.5a.75.75 0 01.75.75V4a.75.75 0 01-1.5 0V2.25A.75.75 0 0110 1.5zM5.05 5.05a.75.75 0 011.06 0l1.06 1.06A.75.75 0 116.11 7.17L5.05 6.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.06a.75.75 0 11-1.06-1.06l1.06-1.06a.75.75 0 011.06 0zM10 6a4 4 0 100 8 4 4 0 000-8zM1.5 10a.75.75 0 01.75-.75H4a.75.75 0 010 1.5H2.25A.75.75 0 011.5 10zm14 0a.75.75 0 01.75-.75H18a.75.75 0 010 1.5h-1.75a.75.75 0 01-.75-.75zM6.11 12.83a.75.75 0 010 1.06l-1.06 1.06A.75.75 0 013.99 13.9l1.06-1.06a.75.75 0 011.06 0zm7.78 0a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM10 16a.75.75 0 01.75.75V18a.75.75 0 01-1.5 0v-1.25A.75.75 0 0110 16z"
        clipRule="evenodd"
      />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M3 3.75A1.75 1.75 0 014.75 2h10.5A1.75 1.75 0 0117 3.75v7.5A1.75 1.75 0 0115.25 13h-3.5v1.5H13a.75.75 0 010 1.5H7a.75.75 0 010-1.5h1.25V13h-3.5A1.75 1.75 0 013 11.25v-7.5z" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" />
    </svg>
  ),
};

const ORDER: { id: Mode; label: string }[] = [
  { id: "light", label: "בהיר" },
  { id: "system", label: "מערכת" },
  { id: "dark", label: "כהה" },
];

export function ModeSwitch() {
  const { mode, setMode } = useMode();
  return (
    <div
      className="inline-flex items-center rounded-full border border-amber-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-800"
      role="group"
      aria-label="בחירת ערכת נושא"
    >
      {ORDER.map((o) => {
        const active = mode === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setMode(o.id)}
            title={o.label}
            aria-label={o.label}
            aria-pressed={active}
            data-mode={o.id}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
              active
                ? "bg-amber-600 text-white shadow-sm dark:bg-amber-500"
                : "text-stone-500 hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-300"
            }`}
          >
            {ICONS[o.id]}
          </button>
        );
      })}
    </div>
  );
}

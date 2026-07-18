# ביקורות ספרים / Library Reviews

A small, free-to-host web app (Hebrew, right-to-left) that turns a library's
review Google Sheet into a nicer browsing experience. Readers can open the
Google Form to write a review, and browse/search existing reviews grouped by
book.

- **Stack:** Vite + React + TypeScript + Tailwind CSS
- **Data:** reads a public Google Sheet directly in the browser as CSV
  (PapaParse) — no backend, no API key
- **Hosting:** static, built for GitHub Pages (works on any static host)

## Configure

Everything you need to change lives in [`src/config.ts`](src/config.ts):

| Field         | What it is                                                            |
| ------------- | -------------------------------------------------------------------- |
| `libraryName` | Shown in the header / home screen                                    |
| `formUrl`     | Public "fill the form" URL (Google Form → Send → link)              |
| `csvUrl`      | Public CSV of the responses sheet (see below)                       |
| `HEADER_MAP`  | Maps the sheet's Hebrew column headers to internal fields            |
| `RANK_LEVELS` | The rank options in order (best → worst) with colors                |

Hebrew UI text lives in [`src/strings.ts`](src/strings.ts).

### Getting the CSV URL

Either works, as long as the sheet is public:

1. **Publish to web (recommended):** in the sheet, File → Share → Publish to web
   → publish the responses sheet as **CSV**, copy the URL.
2. **Export URL:** if the sheet is shared "anyone with the link can view":
   `https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0`

## Develop

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # type checking
npm run build      # production build -> dist/
npm run preview    # preview the production build
```

## Deploy (GitHub Pages)

1. Push this project to a GitHub repo.
2. Repo → Settings → Pages → Source = **GitHub Actions**.
3. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
   builds and deploys `dist/` on every push to `main`.

The app uses `HashRouter` and a relative asset base (`base: "./"`), so it works
from a project subpath (`https://<user>.github.io/<repo>/`) without extra config.

## Sample data

`sample-data/` contains a generator (`generate_sample.py`) and a 1000-row mock
CSV (`reviews-sample.csv`) you can import into a Google Sheet for testing.

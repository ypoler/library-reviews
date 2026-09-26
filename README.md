# ביקורות ספרים / Library Reviews

A small, free-to-host web app (Hebrew, right-to-left) that turns a library's
review Google Sheet into a nicer browsing experience. Readers can open the
Google Form to write a review, and browse/search existing reviews grouped by
book.

- **Stack:** Vite + React + TypeScript + Tailwind CSS
- **Data:** reads a public Google Sheet directly in the browser as CSV
  (PapaParse) — no backend, no API key
- **Hosting:** static, built for GitHub Pages (works on any static host)

## Features

- **Browse & search** reviews grouped by book, with colored rank badges and an
  average rank per book. Sorted **highest-rank first** by default (newest breaks
  ties).
- **Children's section (ספרי ילדים):** a separate collection of kids' reviews
  (`/kids-reviews`) and a separate kids submission form (`/kids-write`), fed by
  their own Google Sheet/Form, with a whimsical pastel background so the kids'
  area feels distinct from the adults' area (ספרי מבוגרים).
- **Genre (סוגה) filter & badges** on the adults reviews page — filter by genre,
  and see the unique genres accumulated per book. Auto-hides when the data has no
  genre column (e.g. the kids sheet).
- **Stats page (נתונים וסטטיסטיקה):** a library-wide dashboard (linked from the
  footer) with combined adults + kids totals and breakdowns — book/review/reader
  counts, rank distribution, genre distribution, most-reviewed books, most active
  readers, and reviews per month.
- **Book covers** pulled from a separate published "covers" sheet, with a
  colored gradient tile as a graceful fallback when no cover exists.
- **Embedded review form** (`/write`) that renders the Google Form in-page,
  pinned to Hebrew (`hl=iw`) so it stays right-to-left.
- **Dark / light / system** theme toggle.
- **Fast loads** via a stale-while-revalidate cache (localStorage) plus
  home-page prefetch, and Google's "Publish to web" CSV endpoint for CDN
  caching.
- **Accessibility:** semantic HTML, keyboard navigation, visible focus, a
  skip-to-content link, labeled controls, a Hebrew accessibility statement page
  (`/accessibility`), and a free, self-hosted [Legilo](https://legilo.eu)
  reading-aid toolbar (font size, contrast, dyslexia font, read-aloud, etc.).

## Configure

Everything you need to change lives in [`src/config.ts`](src/config.ts):

| Field                       | What it is                                                                 |
| --------------------------- | -------------------------------------------------------------------------- |
| `libraryName`               | Shown in the header / home screen                                          |
| `formUrl`                   | Public "fill the form" URL for adults (Google Form → Send → link)          |
| `csvUrl`                    | Public CSV of the adults responses sheet (see below)                       |
| `kidsFormUrl`               | Public "fill the form" URL for the kids section (leave empty to disable)    |
| `kidsCsvUrl`                | Public CSV of the kids responses sheet (leave empty to disable)            |
| `coversCsvUrl`              | Public CSV of a separate covers sheet (leave empty to disable covers)      |
| `contactEmail`              | Library email for the footer "צור קשר" mailto link (empty to hide)         |
| `accessibilityContactEmail` | Email shown on the accessibility statement page for reporting issues       |
| `accessibilityWidget`       | `true`/`false` — show the self-hosted Legilo accessibility toolbar         |
| `pageSize`                  | How many book cards to show before "load more"                             |
| `HEADER_MAP`                | Maps the responses sheet's Hebrew column headers to internal fields        |
| `COVERS_HEADER_MAP`         | Maps the covers sheet's headers (`book` title → `cover` image link)        |
| `RANK_LEVELS`               | The rank options in order (best → worst) with colors                       |

Hebrew UI text lives in [`src/strings.ts`](src/strings.ts).

### Getting the CSV URL

Either works, as long as the sheet is public:

1. **Publish to web (recommended):** in the sheet, File → Share → Publish to web
   → publish the responses sheet as **CSV**, copy the URL. This endpoint sends a
   `cache-control` header, so repeat loads are near-instant.
2. **Export URL:** if the sheet is shared "anyone with the link can view":
   `https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0`

### Moderation (optional)

To gate which reviews appear, keep a separate **"Published"** tab in the sheet
that filters approved rows (e.g. a checkbox column a librarian ticks), and point
`csvUrl` at that published tab instead of the raw responses.

### Covers (optional)

Set `coversCsvUrl` to a second published sheet mapping a book title to a public
image link (a direct image URL or a Google Drive share link — Drive links are
converted to a viewable thumbnail automatically). Titles are matched
whitespace/case-insensitively. Leave empty to give every book its colored tile.

A separate catalog-enrichment script (Google Apps Script) can fill a **new**
sheet from the Agron catalog (cover, summary, genre) using titles from the
reviews CSVs only. See [`scripts/catalog-enrich/README.md`](scripts/catalog-enrich/README.md).

A local script can turn **loans CSVs** into an Excel file of co-borrowed works
for librarians (not published). See [`scripts/loan-related/README.md`](scripts/loan-related/README.md).

### Accessibility toolbar

The [Legilo](https://legilo.eu) widget is fully self-hosted in
[`public/legilo.js`](public/legilo.js) (with its dyslexia font in
`public/legilo-opendyslexic-400.woff2`), so nothing loads from a third party. It
is free and open source (MIT). Toggle it with `accessibilityWidget` in
`src/config.ts`; visitors can also open it with **Alt+Shift+A**.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # type checking
npm run lint       # eslint (includes jsx-a11y checks)
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

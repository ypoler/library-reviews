# Book identity hub — design

Status: **design only, not implemented.** This document captures a plan discussed
and agreed in direction, not yet built. Nothing here should be assumed to exist
in the code or in any live Google Sheet until it's actually implemented and this
status line is updated.

## Problem

Three independent data sources describe books, but none of them carry the
library's own catalog ID (`מזהה כותר`), and each source spells titles slightly
differently:

1. **Reviews** — Google Form responses (adults + kids), already live. Title/author
   are free text typed by reviewers.
2. **New arrivals** — periodic reports a librarian downloads from the catalog
   system: files named `דוח ספרים חדשים <date range>.csv` (e.g.
   `20.7-19.8`, `20.8-7.9`), columns `כותר, מחבר/ת, סימן מדף, שנה, מס. מיון,
   מוציא לאור`. No catalog ID. Not yet wired into the project at all.
3. **Lift (co-borrow) calculations** — `scripts/lift-calculation/build_related.py`
   turns librarian loan-export CSVs into a local-only Excel report
   (`loan-related-works.xlsx`) for librarians, keyed by `work_key` (a folded
   title string from loan records), not a catalog ID. Never enters the project;
   local-only by design (see that script's README).

Today, only source (1) is resolved to a catalog ID, via
`scripts/catalog-enrich/CatalogEnrich.gs`, which searches the library's own
catalog site by title and writes one row per **review title string** (not per
catalog ID) into a Google Sheet published as `detailsCsvUrl` in `src/config.ts`.

Goal: let each source keep living independently (reviews sheet, arrivals
reports, lift's local Excel) while giving librarians **one concentrated place**
to see and fix the title → catalog-ID connections across all three, without
merging the sources themselves.

### Data sources at a glance

| Source | Current location / format | Exact string stored as this source's key in the hub | How it lands in the hub |
|---|---|---|---|
| Reviews | Google Form → published CSV (adults + kids), already live | Raw title exactly as typed in the form (`שם הספר` column) | Already flows in today via `collectReviewBooks_` |
| New arrivals | Local file on a librarian's computer, downloaded from the catalog system: `דוח ספרים חדשים <date range>.csv`, columns `כותר, מחבר/ת, סימן מדף, שנה, מס. מיון, מוציא לאור`. No catalog ID | Raw title exactly as it appears in the report's `כותר` column | Google Form file-upload → `onFormSubmit` appends to a `ספרים חדשים (גולמי)` raw tab → `collectArrivalsBooks_` reads that tab (see [Ingestion](#ingestion-making-arrivals-collectible)) |
| Lift (co-borrow) | Local-only Excel from `scripts/lift-calculation/build_related.py`, grouped by `work_key` (trailing-punctuation-folded title), never published | **The group's `display_name(wk)`** — the most common actual raw title spelling within that `work_key` group, *not* the folded `work_key` string itself, since that's an internal grouping key, not a searchable title | Deferred: librarian reviews/approves in Excel → future script pushes approved rows into a `ליפט (גולמי)` raw tab (format/approval shape still open, see [Open questions](#open-questions-deferred-not-blocking-this-doc)) |

**All of the hub itself, the two raw staging tabs above (`ספרים חדשים (גולמי)`,
`ליפט (גולמי)`), the `לטיפול` triage tab, and the `לוג` log tab are proposed as
tabs within **one spreadsheet file** — the same file already behind
`detailsCsvUrl` in `src/config.ts` today, just with more tabs, matching how
that file already separates its main sheet from `לוג`. The recommendations
sheet ([below](#reader-facing-recommendations-feature)) is a different concern
with a different update cadence (tied to lift's approval cycle, not the
per-book resolution loop) — default proposal is to keep it as another tab in
that same file for one-spreadsheet-to-manage simplicity, but nothing prevents
it from being a separate file later if that turns out cleaner; not decided
either way.

Note that no cross-source title matching ever happens directly between, say, a
review's raw title and an arrivals raw title — each source's raw string is
only ever matched against the **external catalog site's own titles**
independently (via `searchCatalog_`/`pickMatch_`); rows only converge onto one
book because they resolve to the *same catalog ID*, not because their raw text
looks alike. So different sources are free to spell/punctuate the same book
differently without that being a problem to solve.

## Decisions made so far

- **Hub shape:** one row per canonical book (extends the existing
  catalog-details sheet), not a separate normalized mapping/junction table.
- **Lift ingestion, phase 1:** stays fully local/manual (librarian reviews the
  Excel). A later phase adds a script that pushes librarian-approved rows
  straight into the hub's raw tab — not built yet, and what exactly counts as
  "approved" (whole workbook vs. curated subset) is still open.
- **Arrivals ingestion:** a librarian-facing **Google Form with a file-upload
  question**, not a local script and not plain `File → Import`. See
  [Ingestion for non-technical librarians](#ingestion-for-non-technical-librarians).

## Hub schema

Extends the existing details sheet (today's columns: `שם ספר, מחבר, מזהה כותר,
קישור לקטלוג, קישור לכריכה, תקציר, סוגה, סטטוס עדכון, עדכון אחרון`). This is
the **first tab** of the spreadsheet (`ss.getSheets()[0]`, matching how
`CatalogEnrich.gs` already addresses it today), one row per canonical book,
frozen header row.

Final proposed column order (`CatalogEnrich.gs`'s `ensureHeaders_` enforces
this exact order, same as it enforces the current 9-column header today):

| Col | Header | Type | Example | Written by |
|---|---|---|---|---|
| A | `שם ספר` | text | `האי` | script, from the catalog match; a librarian may hand-correct it |
| B | `מחבר` | text | `קונרד ג'וזף` | script (from catalog details), librarian-correctable |
| C | `מזהה כותר` | text (opaque catalog ID string) | `U2llM1Fra2dhUFo0R00wNUNyQnpBUT09` | script; **this becomes the row's true identity** once present |
| D | `קישור לכריכה` | URL | `https://books.agron.org.il/...` | script |
| E | `תקציר` | long text | `רומן על ימאי צעיר...` | script |
| F | `סוגה` | text | `פרוזה מתורגמת` | script |
| G | `מפתח ביקורות` | text | `האי.` | script, from a reviews CSV row |
| H | `סטטוס ביקורות` | empty / `OK` / `fail` | `OK` | script; librarian may set to `fail` to force-stop retries, or clear to force a retry |
| I | `מפתח ספרים חדשים` | text | `האי` | script, from the `ספרים חדשים (גולמי)` raw tab |
| J | `סטטוס ספרים חדשים` | empty / `OK` / `fail` | `` (empty = still pending) | script/librarian, same convention as H |
| K | `מפתח ליפט` | text (the work's `display_name`, not its `work_key`) | `האי` | script, from the `ליפט (גולמי)` raw tab, once that phase exists |
| L | `סטטוס ליפט` | empty / `OK` / `fail` | `` | script/librarian, same convention as H |
| M | `עדכון אחרון` | datetime | `2026-09-20 10:03` | script, set whenever it writes the row |

Dropped versus today: `קישור לקטלוג` — fully derivable client-side as
`` `${catalogOrigin}/title-details/?title_no=${id}` ``; shipping it is pure
waste (see [scaling notes](#scaling-does-the-fetch-published-csv-in-the-browser-model-hold)).

A book may have any subset of G/I/K filled in — e.g. a book only known from
loans (via K/L) may never have a review or an arrivals entry (G/H and I/J stay
empty), and that's expected, not an error state.

Status values keep today's convention: empty = retry next run, `OK` = resolved
don't retry, `fail` = don't retry until a librarian clears it.

### Row identity becomes catalog-ID-first

Today `CatalogEnrich.gs` keys rows by the raw review title
(`loadExistingRows_` maps `normalizeTitle(col A)` → row). That has to change:
when a source's title resolves to a catalog ID that **already has a row**
(created by a different source), the script must fill that source's
key/status columns into the *existing* row rather than creating a duplicate —
so reviews, arrivals, and (later) lift converge onto one line per real book.

A title that fails to resolve still gets a fail/pending stub row keyed by its
own raw text (as today), since there's no catalog ID yet to attach it to. Two
stub rows for what's actually the same book (e.g. one source resolved, another
didn't yet) is an accepted, visible limitation — it's exactly the kind of thing
the librarian-facing monitoring view (below) surfaces for manual merge/cleanup,
rather than something the script tries to auto-resolve.

### Safety property already true today (verified in code)

`runEnrichment` skips any row whose status is already terminal (`OK`/`fail`) —
it is never rewritten on a later run. So a librarian can freely hand-edit any
resolved or failed row (fix a wrong catalog ID, correct an author) and the
script will never clobber it. Only empty-status rows are retried. This holds
under the new multi-source design too and needs no extra mechanism.

## Ingestion: making arrivals collectible

Arrivals CSVs aren't published anywhere (they're local files a librarian
downloads from the catalog system), so they need a raw staging tab in the hub
spreadsheet, **`ספרים חדשים (גולמי)`**, holding title/author as columns.
`CatalogEnrich.gs` gets a new `collectArrivalsBooks_()` that reads this tab the
same way `collectReviewBooks_()` reads the reviews CSVs. This tab is populated
by the Form-upload mechanism in the next section, not by manual paste/`File →
Import` — see [Ingestion for non-technical
librarians](#ingestion-for-non-technical-librarians) for how rows actually get
into it.

## Ingestion for non-technical librarians

Librarians aren't technical (no terminal, no local scripts) but are comfortable
with Sheets and web apps generally (they already use Google Forms daily via the
reviews flow).

**Rejected options:**
- *Local script + terminal* — rules itself out immediately.
- *Plain Sheets `File → Import`* — it does support "Append to current sheet"
  (not purely destructive, correcting an earlier over-statement in the
  discussion), but it puts a **destructive option right next to the correct
  one** ("Replace current sheet") in a menu a non-technical user has to get
  right every time, with no undo prompt, and requires first navigating to the
  correct tab.
- *Watched Drive folder* — no submit confirmation, needs a polling trigger
  (less instant), less familiar interaction than a form.

**Chosen approach: a Google Form with a file-upload question.**

- The librarian opens a bookmarked form (same UI paradigm as the review forms
  they already use daily), picks the CSV, submits. That's the whole manual
  step — no mode selector, nothing that can be gotten wrong.
- An `onFormSubmit` Apps Script trigger does the rest: reads the uploaded file
  from Drive, parses it, dedups against what's already in the raw arrivals tab
  (same normalized-title dedup `collectReviewBooks_` already does), and
  **always appends** the new rows — there is no code path that replaces
  anything, because none is written. This is the actual safety property versus
  Import: not "appends better," but that appending is the *only* possible
  outcome, since the librarian is never shown a choice.
- Can optionally kick off `runEnrichment` right after upload for an
  "upload → resolve" experience in one motion (still respecting `maxPerRun`).
- Free side effect: Form responses are timestamped and (if sign-in required)
  attributed — an automatic audit trail of who uploaded what, when.
- **Reusable for lift later:** add a "סוג קובץ" (file type) dropdown field
  (ספרים חדשים / ליפט) so the same form and trigger branch to the right parser
  once the future lift→sheet script exists, instead of building a second
  separate upload mechanism. What a librarian "approves and uploads" for lift
  specifically is still an open question, deferred to that phase.

## Librarian monitoring/fixing UX

Goal: a librarian can see what needs attention and fix it without leaving
Sheets or learning new tools.

**Native Sheets features (no script needed):**
- **Conditional formatting** on the hub: red if any source status = `fail`,
  amber if a source-key column is filled but its status is still empty
  (pending).
- **A `QUERY`-based triage tab** ("לטיפול"), e.g.
  `=QUERY(Hub!A:N, "select A,H,I,J,K,L,M where I='fail' or K='fail' or M='fail' or (H<>'' and I='')")`
  — a live filtered view of only the rows needing attention, instead of
  scrolling a sheet that will have thousands of rows.
- **Filter views** (Data → Filter views), not shared filters — personal,
  non-destructive per-librarian views so multiple people can work at once
  without stepping on each other.
- **Protected ranges** on header rows and script-owned columns, so a pasted
  import can't accidentally break what the script depends on.

**Small script additions:**
- Write ambiguous-match candidates (currently only logged as a slash-joined
  text blob in the `לוג` tab) onto the hub row itself as `catalogTitle |
  titleNo` pairs, so the fix doesn't require cross-referencing a second sheet.
- Nicer version: have the script set a **data-validation dropdown** on the
  `מזהה כותר` cell listing the candidate title-numbers, so the librarian picks
  from a list instead of typing an opaque ID.

**Explicitly not building (for now):** a custom Apps Script HtmlService sidebar
with clickable match-picking buttons. Real engineering lift for marginal gain
over the triage tab + dropdown combo above; revisit only if that combo proves
insufficient in practice.

## Scaling: does the "fetch published CSV in the browser" model hold?

Question raised: the hub grows from ~120 rows today to a projected 1,000–10,000
as arrivals and lift feed into it. Measured against the live site (2026-09-26):

| Source | Rows | Bytes | Bytes/row |
|---|---|---|---|
| reviews (adults) | 78 | 21,119 | ~270 |
| reviews (kids) | 61 | 8,890 | ~145 |
| covers | 114 | 16,136 | ~140 |
| **catalog-details (the hub)** | **122** | **126,241** | **~1,035** |

The hub row is heaviest because of `תקציר` (summary) and the long cover/catalog
URLs. Linear extrapolation: 1,000 books ≈ 1MB, 10,000 books ≈ 10MB (uncompressed
string size).

**Gzip — verified, real:** Google's publish-to-web endpoint negotiates gzip via
standard `Accept-Encoding`/`Content-Encoding` (confirmed by direct request:
126,241 bytes uncompressed → 39,461 bytes with `Accept-Encoding: gzip`, a 3.2x
reduction). Every real browser gets this for free via `fetch()`. This
meaningfully reduces wire/download time concerns (a 10MB CSV is more like
2–3MB over the wire), but **does not help**:
- **Parse cost** — the browser decompresses before PapaParse sees it; parsing
  still processes the full decompressed string on the main thread (no
  `worker: true` in use anywhere currently).
- **localStorage footprint** — `writeCache()` in `src/data.ts` stores the
  *decompressed* `res.text()` string. A 10MB payload is still a 10MB string
  against a quota that's commonly ~5MB/origin on mobile Safari. The write is
  wrapped in try/catch and fails **silently** — exactly when the fast-load
  cache matters most.

**Range requests / parallel chunking of one file — verified not supported.**
Sending `Range: bytes=0-99` to the details CSV endpoint returns `HTTP/2 200`
with the *full* body (no `Accept-Ranges`, no `Content-Range`, no `206`). The
endpoint is also served over HTTP/2, which already multiplexes concurrent
requests over one connection — there's no old HTTP/1.1 connection-limit
bottleneck to route around by opening more connections. Net: you cannot speed
up downloading *one* large CSV by range-splitting it; Google's endpoint gives
no hook for that.

### Mitigation plan (recommended, not yet implemented)

1. **Split the hub into two published views**, sharing one source-of-truth
   sheet:
   - **Index** (fetched eagerly): title, author, catalog ID, genre, cover URL —
     no summary, no catalog-URL column (derived client-side instead). Publish
     via a second tab using `=QUERY(Hub!A:I, "select ...")` to exclude the
     summary column — no change needed to `CatalogEnrich.gs`'s write logic.
   - **Full details** (fetched lazily, only when a book's card/popup opens):
     carries `תקציר`. This is not "faster transfer of the same bytes" — it's
     "transfer fewer bytes, most of the time," which is the real fix for both
     parse cost and localStorage size (gzip doesn't touch either).
   - Rough effect: cutting summary + the derivable catalog-URL column from the
     eager payload plausibly brings the ~1,035 bytes/row average down to
     roughly 300–450 bytes/row — at 10,000 rows that's ~3–4.5MB uncompressed /
     ~1–1.5MB gzip for the index alone, comfortably inside quota.
2. **UI change to match:** `BookCard.tsx`'s current inline "show more" for
   `תקציר` becomes a popup/modal that triggers the lazy full-details fetch on
   open, instead of the summary being present in the initially loaded data at
   all.
3. **`worker: true` on PapaParse** — free, removes main-thread parse blocking
   regardless of payload size.
4. **Move caching from localStorage to IndexedDB** once any single cached
   payload regularly exceeds roughly 1–2MB — much higher practical quota,
   async by nature, no silent failure mode.
5. **Not recommended pre-emptively:** letter/genre-bucketed index chunks
   fetched in parallel, or moving off the flat-CSV model to a queryable backend
   (Apps Script Web App / Cloudflare Worker / etc.). The index-only payload
   estimated above is small enough at 10K rows that this bigger lever isn't
   justified unless real measurement says otherwise — and it cuts against the
   project's explicit "no backend, free-to-host" design goal.

## Reader-facing recommendations feature

A public "if you liked X, try Y" feature: a reader picks a favorite book and
the site shows recommended books, powered by lift's co-borrow data. This
depends on the lift→hub pipeline above (still a future phase, format TBD) —
lift's raw output is local-only and keyed by `work_key`, not a catalog ID, so
this feature cannot be built directly on today's `build_related.py` output.

### New data artifact: a recommendations sheet, separate from the hub

The hub answers "what is this book"; recommendations answer "given this book,
what else" — a different concern, its own published sheet:

| Column | Notes |
|---|---|
| `מזהה כותר מקור` | seed catalog ID |
| `מזהה כותר מומלץ` | recommended catalog ID |
| `ליפט` | lift score, already computed/sorted/capped at top-10 per seed (mirrors the existing `עשר_המובילות` sheet logic) |

**Privacy note (needs the library's own sign-off, not just an engineering
call):** raw loans data and `work_key`-level reader identity stay local, per
the existing script's "not for publishing" rule. Only the *aggregated* pairs
would be published, and they're already k-anonymized by construction
(`MIN_SEED_READERS=5`, `MIN_PAIR=5` — no pair exists unless ≥5 distinct readers
back it). That's a materially different privacy posture than publishing loan
records, but it's a real decision about patron data, not a default to assume.

Size check: even 1,000 seeds × 10 recs = 10,000 rows of two short IDs + a
float is well under 500KB uncompressed — no scaling concern here, unlike the
hub.

### A gap this exposes in the current site data layer

`CatalogDetails` (`src/data.ts`) is currently keyed by `normalizeTitle(book)`
— title text, not catalog ID. Recommendations are expressed purely in catalog
IDs, and a recommended book may have **zero reviews** (loan history covers the
whole catalog; the reviews form only covers what people bothered to submit).
Resolving "catalog ID → display info" therefore needs a catalogId-keyed index
into the hub, independent of whether a `BookGroup` exists for it. This is a
real, necessary change on its own merits, not scope creep specific to this
feature.

### Site UX

- **Mirrors the existing adults/kids split**: separate `recommendationsCsvUrl`
  / `kidsRecommendationsCsvUrl` config fields, empty = disabled, same
  convention as `coversCsvUrl`/`detailsCsvUrl` today.
- **Picker scope — restrict to valid seeds only** (books that actually appear
  as a seed in the pairs sheet), not the whole catalog, so a search never dead
  ends on "no recommendations." Build the option list from distinct seed IDs
  in the pairs CSV, joined to the hub for title/author display; reuse the
  existing search-and-filter pattern already in `Reviews.tsx` rather than a
  new widget.
- **Rendering results:** reuse `BookCard`'s visual language via a synthetic
  `BookGroup` (empty `reviews: []`, hub-sourced summary/genre/cover) since a
  recommended entry may have no reviews at all; hide the rank badge when
  `count === 0` rather than showing a misleading average.
- **Wording — default to non-statistical.** Readers see something like
  "קוראים שאהבו גם את..." rather than a lift/confidence score (that jargon
  stays librarian-facing, already explained in the Excel's `הערה` tab).
  Revisit only if there's an appetite for exposing the "why" (e.g. a shared-
  reader count) to readers.
- **Placement:** a new tile alongside "כתיבת ביקורת" / "עיון בביקורות" in each
  Home section (adults/kids) — own route (e.g. `/recommendations`), matching
  how `/stats` already gets its own page, rather than inline on the reviews
  page.

### Open, not decided

- How many recommendations to show (data caps at 10; default proposal is ~5).
- Whether to surface any "why" signal to readers (e.g. shared-reader count)
  or keep it a black box.

## Sheet structures (detailed)

The hub tab itself is specified above. This section details every other tab
and sheet referenced elsewhere in this doc, so each has one concrete,
authoritative structure rather than a description scattered across sections.
All tabs below live in the **same spreadsheet file** as the hub (see
[Data sources at a glance](#data-sources-at-a-glance)) unless noted.

### `ספרים חדשים (גולמי)` — raw arrivals staging tab

Populated by the Form/`onFormSubmit` mechanism (never manual paste). Mirrors
the source report's own columns for full fidelity/audit, plus two ingestion
metadata columns:

| Col | Header | Type | Notes |
|---|---|---|---|
| A | `כותר` | text | used for resolution |
| B | `מחבר/ת` | text | used for resolution/disambiguation |
| C | `סימן מדף` | text | shelf mark; librarian reference only, not used by resolution |
| D | `שנה` | number/text | publication year; reference only |
| E | `מס. מיון` | text | classification code; reference only |
| F | `מוציא לאור` | text | publisher; reference only |
| G | `קובץ מקור` | text | the uploaded filename, e.g. `דוח ספרים חדשים 20.8-7.9.csv` |
| H | `יובא בתאריך` | datetime | the Form submission time |

`onFormSubmit` appends a row only if its normalized title (`normalizeTitle_`)
isn't already present in column A of this tab — so re-uploading the same or an
overlapping report is a no-op, not a duplicate. `collectArrivalsBooks_` reads
only columns A and B; C–F ride along for the librarian's own reference and
play no role in resolution.

### `ליפט (גולמי)` — raw lift staging tab (future phase, format may change)

Same role as the arrivals raw tab — a pending-resolution queue — but lift's
loan data carries no author field:

| Col | Header | Type | Notes |
|---|---|---|---|
| A | `כותר` | text | the work's `display_name`, used for resolution |
| B | `קוראים` | number | reader count for the work — context for librarian triage priority, not used by resolution |
| C | `קובץ מקור` | text | source run identifier |
| D | `יובא בתאריך` | datetime | ingestion time |

This tab's exact shape depends on the still-open question of what a librarian
"approves and uploads" for lift (see [Open questions](#open-questions-deferred-not-blocking-this-doc))
— treat this as a working proposal, not final.

### `לטיפול` — triage tab (formula-only, nothing manually maintained)

A live `QUERY` over the hub tab — no independent data, just a filtered view,
so it never goes stale on its own:

```
=QUERY(Hub!A1:M, "select A, G, H, I, J, K, L
  where H='fail' or J='fail' or L='fail'
     or (G<>'' and H='') or (I<>'' and J='') or (K<>'' and L='')
  label A 'שם ספר', G 'מפתח ביקורות', H 'סטטוס ביקורות',
        I 'מפתח ספרים חדשים', J 'סטטוס ספרים חדשים',
        K 'מפתח ליפט', L 'סטטוס ליפט'")
```

(`Hub` stands in for whatever the hub tab is actually named; adjust the range
if the hub's column order above changes.)

### `לוג` — log tab (script-written, append-only)

Exists today with 5 columns (`זמן, רמה, שם ספר, סטטוס, הערות`) written by
`log_()`. Needs a 6th column now that three sources can fail, not just
reviews:

| Col | Header | Type | Notes |
|---|---|---|---|
| A | `זמן` | datetime | unchanged |
| B | `מקור` | text: `ביקורות` / `ספרים חדשים` / `ליפט` | **new** — which source this attempt came from |
| C | `רמה` | text | unchanged (`error` / `not_found` / `ambiguous`) |
| D | `שם ספר` | text | unchanged — the raw title attempted |
| E | `סטטוס` | text | unchanged (`would_fail` / `fail` / `stopped`) |
| F | `הערות` | text | unchanged — e.g. ambiguous candidate titles |

### `המלצות` — recommendations sheet (published, site-facing)

One row per (seed, recommendation) pair, up to 10 rows per seed, already
sorted by lift descending (mirrors the existing `עשר_המובילות` ordering):

| Col | Header | Type | Notes |
|---|---|---|---|
| A | `מזהה כותר מקור` | text (catalog ID) | the seed book |
| B | `מזהה כותר מומלץ` | text (catalog ID) | the recommended book |
| C | `ליפט` | number | e.g. `3.42` |
| D | `מיקום` | number 1–10 | rank within this seed's list — lets the client trust row order without re-sorting |
| E | `עודכן בתאריך` | datetime | when this sheet was last (re)generated, for a librarian to judge freshness |

No display title/author/cover here by design — the site resolves both IDs
against the hub at read time, so this sheet never goes stale relative to the
hub's own corrections.

### The ingestion Form and its Response sheet

**Form fields** (the librarian-facing side):

1. `קובץ` — file upload, required, restricted to `.csv` (extend to `.xlsx` if
   the future lift phase needs it)
2. `סוג קובץ` — dropdown: `ספרים חדשים` / `ליפט`
3. `הערה` — optional free text, e.g. "דוח יולי–אוגוסט"

**Response sheet** (Google-managed columns, `onFormSubmit` reads this row):

| Col | Header | Type | Notes |
|---|---|---|---|
| A | `חותמת זמן` | datetime | auto |
| B | `כתובת אימייל` | text | present only if the form requires sign-in |
| C | `קובץ` | Drive file link/ID | the uploaded file |
| D | `סוג קובץ` | text | the dropdown answer — `onFormSubmit` branches its parser on this |
| E | `הערה` | text | optional |

## Open questions (deferred, not blocking this doc)

- Exact final column names/order for the hub sheet.
- What a librarian "approves and uploads" for lift specifically (whole
  workbook vs. curated subset of recommended pairs), and the shape of the
  future lift→sheet script — this also determines the shape of the
  recommendations sheet above.
- Whether letter/genre-bucketed index chunks are ever needed — revisit only if
  real-world testing of the two-tier split above shows it's insufficient.
- How many recommendations to show, and whether to expose any "why" signal to
  readers (see previous section).

## Suggested implementation order (not started)

1. Housekeeping already done: `.gitignore` fixed for the
   `scripts/loan-related` → `scripts/lift-calculation` rename.
2. Hub schema migration (manual, on the live spreadsheet) + `CatalogEnrich.gs`
   generalization: catalog-ID-first row matching/merge, per-source pending
   collection, `collectArrivalsBooks_`.
3. Arrivals raw tab + the Google Form + `onFormSubmit` trigger.
4. Librarian monitoring UX: conditional formatting, triage tab, protected
   ranges, on-row ambiguous candidates (+ dropdown as a stretch).
5. Site-side payload split: index/full-details CSVs, `BookCard` popup,
   `worker: true`, IndexedDB cache migration.
6. Lift → sheet push script (later phase, format TBD).
7. Recommendations feature: catalogId-keyed hub index, recommendations sheet +
   config fields, picker UI, results rendering.

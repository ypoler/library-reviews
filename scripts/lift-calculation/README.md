# Related loans (librarian Excel)

Local-only: unites `loans_adults_*.csv` or `loans_kids_*.csv` and writes co-borrow scores. **Do not commit the CSVs or the Excel file.**

Titles are **not** collapsed into series. A recommendation is included only if at least **5** distinct readers borrowed both titles. There is no “weak” fill and no separate strict sheet.

## Input files

Put exports in the input directory (default: `~/Downloads/re` if `loans_adults_*.csv` exist there, else `~/Downloads`).

**Names**

- Adults: `loans_adults_*.csv` (e.g. `loans_adults_2024.csv`)
- Kids: `loans_kids_*.csv`
- Files whose name contains `united` are ignored (those are this script’s output)

`--set adults` (default) vs `--set kids` picks one glob. A quarterly dump is another file with the same prefix in the same folder; a full rebuild concatenates all matching files.

**Format**

- Encoding: UTF-8, BOM allowed (`utf-8-sig`)
- Delimiter: comma (not tab)
- Header row required; extra columns (e.g. `ימי איחור`) are ignored

**Required columns** (row 1 must match exactly):

| Header | Role |
| --- | --- |
| `מס. קורא` | Reader id. Same person across years. Rows with value `1` are dropped (library admin). Empty reader → skipped. |
| `מס. ישן` | Copy barcode. Used only to detect exact duplicate rows, not as identity for lift. |
| `שם הכותר` | Catalog title. Empty title → skipped. Trailing `.` / quotes folded (`האי.` = `האי`). Volumes stay separate. |
| `ת. השאלה` | Loan timestamp. Date part `dd/mm/yyyy`, optional time (`09/01/2025 16:09`). Sets the date range in הערה. |

**Optional (not used for ranking)**

| Header | Role |
| --- | --- |
| `תאריך החזרה` | Empty = still out; still counts as a borrow |
| `ת. מיועד` | Due date; ignored |
| `ימי איחור` | Kids exports may include this; ignored |

**Exact duplicate** = same `מס. קורא` + `מס. ישן` + `שם הכותר` + `ת. השאלה` (full string). The second copy is dropped.

Lift uses distinct readers who borrowed each **folded title**, not loan counts.

## Install

From this folder, once:

```bash
cd scripts/loan-related
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Run

Default input is `~/Downloads/re`. Use `--set kids` for `loans_kids_*.csv` (writes `loans_kids_united.csv` and `loan-related-works-kids.xlsx`, leaves the adults files alone).

```bash
cd scripts/loan-related
.venv/bin/python build_related.py --self-test
.venv/bin/python build_related.py
.venv/bin/python build_related.py --set kids
```

Writes:

- `loans_adults_united.csv` / `loans_kids_united.csv`
- `loan-related-works.xlsx` / `loan-related-works-kids.xlsx`

## Sheets

| Sheet | What it is |
| --- | --- |
| הערה | Method, date range, file names — no reader IDs |
| יצירות | Each catalog title (trailing `.` folded) |
| זוגות | Seeds (≥5 readers) with co-borrowers, \(n_{XY} \ge 5\), ranked by lift |
| עשר_המובילות | Top 10 per seed from that same list |

Identity is `מס. קורא`. Reader **1** (library admin account) is dropped. Trailing punctuation on titles is folded (`האי.` = `האי`). See **Input files** above for the CSV layout.

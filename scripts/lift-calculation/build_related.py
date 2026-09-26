#!/usr/bin/env python3
"""Build a librarian Excel file: works that tend to be borrowed together.

Reads local loans CSVs (never committed). Writes .xlsx next to them by default.
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from work_key import self_test as work_key_self_test
from work_key import work_key

MIN_SEED_READERS = 5
MIN_PAIR = 5
TOP_N = 10
# Library desk / admin account — not a real borrower.
SKIP_READER_IDS = frozenset({"1"})

HEADER_FILL = PatternFill("solid", fgColor="F5E6C8")
HEADER_FONT = Font(bold=True)
NOTE_FONT = Font(size=11)
RTL = Alignment(horizontal="right", wrap_text=True)
WRAP = Alignment(wrap_text=True, vertical="top")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--input-dir",
        type=Path,
        default=None,
        help="Directory with loans_adults_*.csv (default: ~/Downloads/re if present, else ~/Downloads)",
    )
    p.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output .xlsx path (default: <input-dir>/loan-related-works[-kids].xlsx)",
    )
    p.add_argument(
        "--set",
        dest="loan_set",
        choices=("adults", "kids"),
        default="adults",
        help="Which loans_*.csv prefix to read (default: adults)",
    )
    p.add_argument("--min-seed-readers", type=int, default=MIN_SEED_READERS)
    p.add_argument("--self-test", action="store_true")
    return p.parse_args()


def default_input_dir() -> Path:
    re_dir = Path.home() / "Downloads" / "re"
    if list(re_dir.glob("loans_adults_*.csv")):
        return re_dir
    return Path.home() / "Downloads"


def self_test() -> None:
    work_key_self_test()
    print("self-test ok")


def loan_files(input_dir: Path, loan_set: str) -> list[Path]:
    files = sorted(input_dir.glob(f"loans_{loan_set}_*.csv"))
    files = [p for p in files if "united" not in p.name]
    if files:
        return files
    raise SystemExit(f"No loans_{loan_set}_*.csv in {input_dir}")


def loan_identity(row: dict[str, str]) -> tuple[str, str, str, str]:
    return (
        (row.get("מס. קורא") or "").strip(),
        (row.get("מס. ישן") or "").strip(),
        (row.get("שם הכותר") or "").strip(),
        (row.get("ת. השאלה") or "").strip(),
    )


def load_loans(
    input_dir: Path, loan_set: str
) -> tuple[list[dict[str, str]], list[Path], int, int]:
    files = loan_files(input_dir, loan_set)
    rows: list[dict[str, str]] = []
    n_admin = 0
    for path in files:
        text = path.read_text(encoding="utf-8-sig")
        for row in csv.DictReader(text.splitlines()):
            reader = (row.get("מס. קורא") or "").strip()
            if reader in SKIP_READER_IDS:
                n_admin += 1
                continue
            row["_file"] = path.name
            rows.append(row)
    seen: set[tuple[str, str, str, str]] = set()
    unique: list[dict[str, str]] = []
    n_dup = 0
    for row in rows:
        key = loan_identity(row)
        if key in seen:
            n_dup += 1
            continue
        seen.add(key)
        unique.append(row)
    return unique, files, n_dup, n_admin


def parse_loan_date(raw: str) -> datetime | None:
    raw = (raw or "").strip()
    if not raw:
        return None
    day = raw.split()[0]
    try:
        return datetime.strptime(day, "%d/%m/%Y")
    except ValueError:
        return None


def sheet_header(ws, headers: list[str], rtl: bool = True) -> None:
    ws.append(headers)
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = RTL if rtl else WRAP
    ws.sheet_view.rightToLeft = rtl


def autosize(ws, max_width: int = 48) -> None:
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        width = 10
        for cell in col[:80]:
            val = "" if cell.value is None else str(cell.value)
            width = min(max_width, max(width, min(max_width, len(val) + 2)))
        ws.column_dimensions[letter].width = width


def finish_sheet(ws) -> None:
    """Freeze header + filter. Avoid Excel Tables: Mac Excel flags them as corrupt
    when combined with RTL / freeze panes."""
    last = f"{get_column_letter(ws.max_column)}{ws.max_row}"
    if ws.max_row >= 2:
        ws.auto_filter.ref = f"A1:{last}"
    ws.freeze_panes = "A2"
    view = ws.views.sheetView[0]
    if view.selection:
        view.selection[0].activeCell = "A2"
        view.selection[0].sqref = "A2"


def build(
    rows: list[dict[str, str]],
    source_files: list[Path],
    min_seed: int,
    n_dup: int = 0,
    n_admin: int = 0,
):
    dates: list[datetime] = []
    # reader -> set of work keys
    reader_works: dict[str, set[str]] = defaultdict(set)
    title_loans: Counter[str] = Counter()
    title_readers: dict[str, set[str]] = defaultdict(set)
    work_titles: dict[str, Counter[str]] = defaultdict(Counter)
    work_loans: Counter[str] = Counter()
    work_readers: dict[str, set[str]] = defaultdict(set)

    skipped = 0
    for row in rows:
        reader = (row.get("מס. קורא") or "").strip()
        title = (row.get("שם הכותר") or "").strip()
        if not reader or not title:
            skipped += 1
            continue
        dt = parse_loan_date(row.get("ת. השאלה") or "")
        if dt:
            dates.append(dt)
        wk = work_key(title)
        if not wk:
            skipped += 1
            continue
        reader_works[reader].add(wk)
        title_loans[title] += 1
        title_readers[title].add(reader)
        work_titles[wk][title] += 1
        work_loans[wk] += 1
        work_readers[wk].add(reader)

    n_readers = len(reader_works)
    co: Counter[tuple[str, str]] = Counter()
    for works in reader_works.values():
        items = sorted(works)
        for i, a in enumerate(items):
            for b in items[i + 1 :]:
                co[(a, b)] += 1

    adj: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for (a, b), n_xy in co.items():
        if n_xy < MIN_PAIR:
            continue
        adj[a].append((b, n_xy))
        adj[b].append((a, n_xy))

    def display_name(wk: str) -> str:
        titles = work_titles[wk]
        return titles.most_common(1)[0][0]

    n_x = {wk: len(rs) for wk, rs in work_readers.items()}
    seeds = sorted((wk for wk, n in n_x.items() if n >= min_seed), key=lambda w: (-n_x[w], w))

    def pair_row(seed: str, other: str, n_xy: int) -> dict:
        nx, ny = n_x[seed], n_x[other]
        conf = n_xy / nx if nx else 0.0
        lift = (conf / (ny / n_readers)) if ny and n_readers else 0.0
        return {
            "seed": seed,
            "other": other,
            "nx": nx,
            "ny": ny,
            "nxy": n_xy,
            "confidence": round(conf, 4),
            "lift": round(lift, 4),
        }

    pairs: list[dict] = []
    for seed in seeds:
        cands = [pair_row(seed, other, n_xy) for other, n_xy in adj.get(seed, [])]
        cands.sort(key=lambda r: (-r["lift"], -r["nxy"], -r["confidence"], r["other"]))
        pairs.extend(cands)

    by_seed: dict[str, list[dict]] = defaultdict(list)
    for r in pairs:
        by_seed[r["seed"]].append(r)

    meta = {
        "files": source_files,
        "n_loans": len(rows),
        "n_dup": n_dup,
        "n_admin": n_admin,
        "skipped": skipped,
        "n_readers": n_readers,
        "n_titles": len(title_loans),
        "n_works": len(work_loans),
        "n_seeds": len(seeds),
        "date_min": min(dates).date() if dates else None,
        "date_max": max(dates).date() if dates else None,
        "min_seed": min_seed,
        "display_name": display_name,
        "title_loans": title_loans,
        "title_readers": title_readers,
        "work_titles": work_titles,
        "work_loans": work_loans,
        "n_x": n_x,
        "seeds": seeds,
        "pairs": pairs,
        "by_seed": by_seed,
    }
    return meta


def write_xlsx(path: Path, meta: dict) -> None:
    display_name = meta["display_name"]
    wb = Workbook()

    # --- הערה ---
    note = wb.active
    note.title = "הערה"
    files = ", ".join(p.name for p in meta["files"])
    note_lines = [
        "קובץ זה מיועד לספרניות בלבד. לא לפרסום באתר ולא להעלאה ל-GitHub.",
        "",
        "מקור",
        f"קבצים: {files}",
        f"השאלות: {meta['n_loans']} (הוסר קורא מנהלי {meta.get('n_admin', 0)}, כפילויות {meta.get('n_dup', 0)}, דולגו {meta['skipped']})",
        f"קוראים: {meta['n_readers']}",
        f"כותרים מקוריים: {meta['n_titles']}",
        f"כותרים: {meta['n_titles']}",
        f"טווח ת. השאלה: {meta['date_min']} – {meta['date_max']}",
        "",
        "שיטה",
        "שני כותרים קשורים אם אותו מס. קורא השאיל את שניהם (בכל זמן בטווח). אין איחוד סדרות.",
        "נקודה בסוף שם הכותר מקופלת (האי. = האי). כרכים נשארים כותרים נפרדים.",
        "ליפט: P(Y|X) / P(Y). ביטחון: P(Y|X) = קוראים משותפים / קוראי המקור.",
        f"מקור (seed) מופיע רק אם לפחות {meta['min_seed']} קוראים שונים השאילו את הכותר.",
        f"המלצה נכללת רק אם לפחות {MIN_PAIR} קוראים השאילו את שני הכותרים.",
        "עשר המובילות: עד 10 המלצות לפי ליפט (אחר כך משותפים, אחר כך ביטחון).",
        "מספרי קוראים אינם נכללים בקובץ. מס. קורא 1 (משתמש מנהלי) הוסר מהחישוב.",
        f"נוצר: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
    ]
    note["A1"] = "\n".join(note_lines)
    note["A1"].alignment = Alignment(wrap_text=True, vertical="top", horizontal="right")
    note["A1"].font = NOTE_FONT
    note.sheet_view.rightToLeft = True
    note.column_dimensions["A"].width = 100
    note.row_dimensions[1].height = 280

    # --- יצירות ---
    works = wb.create_sheet("יצירות")
    sheet_header(
        works,
        [
            "מפתח יצירה",
            "שם לתצוגה",
            "כמה כותרים אוחדו",
            "השאלות ליצירה",
            "קוראים ליצירה",
            "כותר מקורי",
            "השאלות לכותר",
            "קוראים לכותר",
        ],
    )
    work_rows = []
    for wk, titles in sorted(meta["work_titles"].items(), key=lambda kv: (-meta["n_x"][kv[0]], kv[0])):
        n_merged = len(titles)
        for title, n_loans in titles.most_common():
            work_rows.append(
                [
                    wk,
                    display_name(wk),
                    n_merged,
                    meta["work_loans"][wk],
                    meta["n_x"][wk],
                    title,
                    n_loans,
                    len(meta["title_readers"][title]),
                ]
            )
    for r in work_rows:
        works.append(r)
    autosize(works)
    finish_sheet(works)

    pair_headers = [
        "כותר מקור",
        "קוראים מקור",
        "כותר מומלץ",
        "קוראים מומלץ",
        "קוראים משותפים",
        "ביטחון",
        "ליפט",
    ]

    def fill_pairs(ws, data: list[dict], table_name: str) -> None:
        sheet_header(ws, pair_headers)
        for r in data:
            ws.append(
                [
                    display_name(r["seed"]),
                    r["nx"],
                    display_name(r["other"]),
                    r["ny"],
                    r["nxy"],
                    r["confidence"],
                    r["lift"],
                ]
            )
        autosize(ws)
        finish_sheet(ws)

    fill_pairs(wb.create_sheet("זוגות"), meta["pairs"], "Pairs")

    top = wb.create_sheet("עשר_המובילות")
    headers = ["כותר מקור", "קוראים מקור"]
    for i in range(1, TOP_N + 1):
        headers.extend(
            [
                f"המלצה {i}",
                f"ליפט {i}",
                f"משותפים {i}",
            ]
        )
    sheet_header(top, headers)
    for seed in meta["seeds"]:
        picked: list[dict] = []
        seen: set[str] = set()
        for r in meta["by_seed"][seed]:
            if r["other"] in seen:
                continue
            seen.add(r["other"])
            picked.append(r)
            if len(picked) >= TOP_N:
                break
        row = [display_name(seed), meta["n_x"][seed]]
        for i in range(TOP_N):
            if i < len(picked):
                r = picked[i]
                row.extend([display_name(r["other"]), r["lift"], r["nxy"]])
            else:
                row.extend(["", "", ""])
        top.append(row)
    autosize(top, max_width=40)
    finish_sheet(top)

    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


def write_united_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fields = [
        "מס. קורא",
        "מס. ישן",
        "שם הכותר",
        "ת. השאלה",
        "תאריך החזרה",
        "ת. מיועד",
        "מפתח יצירה",
        "קובץ מקור",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            w.writerow(
                {
                    "מס. קורא": row.get("מס. קורא", ""),
                    "מס. ישן": row.get("מס. ישן", ""),
                    "שם הכותר": row.get("שם הכותר", ""),
                    "ת. השאלה": row.get("ת. השאלה", ""),
                    "תאריך החזרה": row.get("תאריך החזרה", ""),
                    "ת. מיועד": row.get("ת. מיועד", ""),
                    "מפתח יצירה": work_key(row.get("שם הכותר") or ""),
                    "קובץ מקור": row.get("_file", ""),
                }
            )


def main() -> None:
    args = parse_args()
    if args.self_test:
        self_test()
        return
    input_dir = args.input_dir or default_input_dir()
    rows, files, n_dup, n_admin = load_loans(input_dir, args.loan_set)
    meta = build(rows, files, args.min_seed_readers, n_dup=n_dup, n_admin=n_admin)
    suffix = "" if args.loan_set == "adults" else f"-{args.loan_set}"
    out = args.output or (input_dir / f"loan-related-works{suffix}.xlsx")
    write_xlsx(out, meta)
    united = input_dir / f"loans_{args.loan_set}_united.csv"
    write_united_csv(united, rows)
    print(f"Wrote {out}")
    print(f"Wrote {united} ({len(rows)} rows, dropped {n_dup} duplicates, skipped {n_admin} admin-reader loans)")
    print(
        f"loans={meta['n_loans']} readers={meta['n_readers']} "
        f"titles={meta['n_titles']} works={meta['n_works']} seeds={meta['n_seeds']} "
        f"pairs>={MIN_PAIR}={len(meta['pairs'])}"
    )


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate a mock library-reviews sheet (5000 rows) for testing the app.

Columns mimic a Hebrew Google Form response sheet:
  timestamp, book name, author, rank, detailed review, reader name

- 75% Hebrew book titles (made-up words) with Hebrew authors
- 25% English book titles (made-up words) with English authors
- A fixed pool of books (avg ~4 reviews per book) and readers (avg ~2 reviews
  per reader); each book always keeps the same author, and no reader reviews
  the same book twice
- Hebrew reviews and Hebrew reader names
- Rank is one of: אחד הספרים הטובים שקראתי / מומלץ מאוד / נחמד / משעמם
  (best / good / nice / boring)

Output: reviews-sample.csv (UTF-8 with BOM so Excel/Sheets read Hebrew cleanly)
"""

import csv
import os
import random
from datetime import datetime, timedelta

random.seed(42)

# --- Hebrew made-up book title fragments -------------------------------------
HE_FRAGS = [
    "מר", "של", "דן", "גל", "רון", "תל", "נוף", "כפר", "אור", "לב",
    "שיר", "טל", "רם", "עוז", "בר", "גן", "דור", "זיו", "חן", "כרם",
    "לוז", "מור", "נעם", "סער", "פז", "צור", "קדם", "שחר", "תום", "גיל",
    "דקל", "הדר", "ורד", "זוהר", "חמד", "נהר", "ערן", "פלד", "צבר", "קשת",
    "שלו", "תמר", "אלם", "גזית", "רהט", "יעד", "כליל", "מרום", "נדב", "סהר",
]

HE_TITLE_WORDS = [
    "בצל", "מעבר", "אל", "בין", "ימי", "לילות", "שער", "בית", "דרך", "סוד",
    "צל", "אבק", "מלך", "עונת", "ארץ", "קול", "מגדל", "גשם", "נתיב", "חלום",
]

# --- Hebrew names ------------------------------------------------------------
HE_FIRST = [
    "דוד", "יוסי", "אבי", "משה", "יעקב", "איתי", "נועם", "עומר", "רון", "גיל",
    "אורי", "עידו", "ניר", "טל", "עמית", "אלון", "יונתן", "דניאל", "ליאור", "גיא",
    "מיכל", "נועה", "שירה", "תמר", "יעל", "דנה", "הדס", "רות", "מור", "אור",
    "ליאת", "גלית", "קרן", "מאיה", "רוני", "עדי", "שני", "נטע", "אביגיל", "אלה",
    "איתמר", "עידן", "נדב", "יובל", "אלעד", "שגיא", "רועי", "אסף", "בועז", "עמי",
    "דור", "שי", "ליעד", "אורן", "גדי", "חיים", "יגאל", "מנחם", "נתן", "צבי",
    "קובי", "רפי", "שלמה", "תמיר", "זהר", "יהודה", "אביב", "רן", "עוז", "איל",
    "אביבה", "בת-אל", "גפן", "דורית", "הילה", "ורדית", "זהבה", "חדוה", "טליה",
    "יסמין", "כרמל", "לימור", "מירב", "נופר", "סיגל", "עינת", "פנינה", "ציפי",
    "רחל", "שולמית", "תהילה", "אורנה", "בלה", "גילה", "דפנה", "מרים", "נילי",
]

HE_LAST = [
    "כהן", "לוי", "מזרחי", "פרץ", "ביטון", "דהן", "אברהם", "פרידמן", "שפירא",
    "אזולאי", "גבאי", "אוחיון", "ברק", "גולן", "הראל", "וקנין", "זילברמן", "חדד",
    "יעקובי", "כץ", "לביא", "מלכה", "נחום", "סבן", "עמר", "פלד", "צור", "קפלן",
    "רוזן", "שמש", "בן דוד", "אלקיים", "טולדנו", "נגר", "שרעבי", "בן חמו", "גבע",
    "דיין", "הלוי", "ויצמן", "זהבי", "חזן", "טוויל", "ישראלי", "כהנא", "לוגסי",
    "מוסקוביץ", "נוימן", "סופר", "עטיה", "פרנקל", "צדוק", "קדוש", "רוט", "שטרן",
    "בן שושן", "אדלר", "גרוס", "דרעי", "הרוש", "בכר", "גינת", "דומב", "ליפשיץ",
]

# --- English made-up book fragments and names --------------------------------
EN_FRAGS = [
    "mor", "tal", "ven", "dor", "lox", "ria", "thal", "gorn", "wyn", "bel",
    "cra", "fen", "sol", "dun", "mar", "keth", "zor", "vale", "brin", "quen",
    "shar", "eld", "wick", "thorn", "hollo", "grey", "ash", "raven", "mist", "fall",
]

EN_TITLE_WORDS = [
    "The", "of", "Shadow", "Crown", "Whispers", "Ashes", "Tide", "Ember", "Hollow",
    "Silent", "Broken", "Last", "Hidden", "Frozen", "Golden", "Wandering",
]

EN_FIRST = [
    "James", "Emily", "Daniel", "Sarah", "Michael", "Laura", "Thomas", "Anna",
    "Oliver", "Grace", "Henry", "Clara", "Edward", "Sophie", "William", "Alice",
]

EN_LAST = [
    "Hunter", "Blackwood", "Ashford", "Vance", "Whitmore", "Sinclair", "Holloway",
    "Carrow", "Fairbanks", "Merrick", "Thornton", "Larkin", "Bexley", "Crane",
]

# --- Ranks (Hebrew value -> intended English meaning) ------------------------
RANKS = ["אחד הספרים הטובים שקראתי", "מומלץ מאוד", "נחמד", "משעמם"]
RANK_WEIGHTS = [0.30, 0.35, 0.20, 0.15]

# --- Hebrew review pools per rank --------------------------------------------
REVIEWS = {
    "אחד הספרים הטובים שקראתי": [
        "אחד הספרים הטובים שקראתי השנה, ממליץ בחום.",
        "כתיבה מרהיבה שסחפה אותי מהעמוד הראשון.",
        "לא הצלחתי להניח את הספר, פשוט מושלם.",
        "עלילה מרתקת ודמויות בלתי נשכחות.",
        "יצירת מופת אמיתית, חובה לקרוא.",
        "ריגש אותי עד דמעות, ספר יוצא דופן.",
        "סוף מפתיע שהשאיר אותי חושב עליו ימים.",
    ],
    "מומלץ מאוד": [
        "ספר טוב ומהנה, נהניתי מאוד מהקריאה.",
        "עלילה מעניינת עם כמה רגעים חזקים.",
        "כתיבה קולחת ונעימה, שווה קריאה.",
        "התחלה קצת איטית אבל משם זה ממריא.",
        "דמויות אמינות וסיפור שנשאר בזיכרון.",
        "בהחלט ספר מומלץ, גם אם לא מושלם.",
    ],
    "נחמד": [
        "ספר נחמד להעביר בו את הזמן.",
        "קריאה קלה ונעימה לחופשה.",
        "לא רע בכלל, אם כי לא מיוחד במיוחד.",
        "היו רגעים חמודים אבל שכחתי אותו מהר.",
        "בסדר גמור, בלי יותר מדי ציפיות.",
        "קליל וסביר, מתאים לקריאה לפני השינה.",
    ],
    "משעמם": [
        "התקשיתי לסיים, קצב איטי ומייגע.",
        "העלילה נמתחה ללא צורך והשתעממתי.",
        "ציפיתי ליותר, לא ממש התחברתי.",
        "דמויות שטוחות וסיום צפוי.",
        "לצערי לא הצליח לרתק אותי.",
        "ויתרתי באמצע, פשוט לא זרם לי.",
    ],
}

EXTRA_CLAUSES = [
    "", "", "",  # often no extra clause
    " הכריכה יפה מאוד.",
    " שאלתי אותו מהספרייה והחזרתי בזמן.",
    " אקרא עוד מאותו הסופר.",
    " התרגום היה טוב.",
    " מתאים גם לבני נוער.",
]


def he_book_title():
    if random.random() < 0.5:
        w = random.choice(HE_TITLE_WORDS) + " " + _he_word()
    else:
        w = _he_word()
        if random.random() < 0.4:
            w += " " + _he_word()
    return w


def _he_word():
    n = random.choice([1, 1, 2])
    return "".join(random.choice(HE_FRAGS) for _ in range(n))


def en_book_title():
    parts = []
    if random.random() < 0.5:
        parts.append(random.choice(EN_TITLE_WORDS))
    parts.append(_en_word())
    if random.random() < 0.35:
        parts.append(random.choice(EN_TITLE_WORDS))
        parts.append(_en_word())
    return " ".join(p for p in parts if p)


def _en_word():
    n = random.choice([1, 2])
    w = "".join(random.choice(EN_FRAGS) for _ in range(n))
    return w.capitalize()


def he_name():
    return random.choice(HE_FIRST) + " " + random.choice(HE_LAST)


def en_name():
    return random.choice(EN_FIRST) + " " + random.choice(EN_LAST)


def random_timestamp(start, end):
    delta = end - start
    dt = start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))
    return dt.strftime("%d/%m/%Y %H:%M:%S")


HE_SHARE = 0.75  # fraction of books that are Hebrew (rest are English)


def build_books(n_books):
    """Fixed pool of unique (title, author) pairs; each book has one author."""
    books = []
    seen = set()
    while len(books) < n_books:
        if random.random() < HE_SHARE:
            title, author = he_book_title(), he_name()
        else:
            title, author = en_book_title(), en_name()
        if title in seen:
            continue
        seen.add(title)
        books.append((title, author))
    return books


def build_readers(n_readers):
    """Fixed pool of unique Hebrew reader names."""
    readers = []
    seen = set()
    while len(readers) < n_readers:
        name = he_name()
        if name in seen:
            continue
        seen.add(name)
        readers.append(name)
    return readers


def main():
    n_rows = 5000
    n_books = 1250     # -> avg ~4 reviews per book
    n_readers = 2500   # -> avg ~2 reviews per reader
    start = datetime(2024, 1, 1)
    end = datetime(2026, 7, 18)

    header = [
        "חותמת זמן",
        "שם הספר",
        "שם הסופר/ת",
        "דירוג",
        "ביקורת מפורטת",
        "שם הקורא/ת",
    ]

    books = build_books(n_books)
    readers = build_readers(n_readers)

    rows = []
    used_pairs = set()  # avoid the same reader reviewing the same book twice
    while len(rows) < n_rows:
        title, author = random.choice(books)
        reader = random.choice(readers)
        key = (title, reader)
        if key in used_pairs:
            continue
        used_pairs.add(key)

        rank = random.choices(RANKS, weights=RANK_WEIGHTS, k=1)[0]
        review = random.choice(REVIEWS[rank]) + random.choice(EXTRA_CLAUSES)
        ts = random_timestamp(start, end)
        rows.append([ts, title, author, rank, review, reader])

    rows.sort(key=lambda r: datetime.strptime(r[0], "%d/%m/%Y %H:%M:%S"))

    out_path = os.path.join(os.path.dirname(__file__), "reviews-sample.csv")
    with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == "__main__":
    main()

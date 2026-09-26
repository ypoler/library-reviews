"""Normalize catalog loan titles. No series collapsing."""

from __future__ import annotations

import re

_WS = re.compile(r"\s+")
_TRAIL_PUNCT = re.compile(r"[.\"'״׳]+$")


def normalize_spaces(s: str) -> str:
    return _WS.sub(" ", (s or "").strip())


def fold_title(title: str) -> str:
    s = normalize_spaces(title)
    while True:
        nxt = _TRAIL_PUNCT.sub("", s).strip()
        if nxt == s:
            break
        s = nxt
    return s


def work_key(title: str) -> str:
    """Each catalog title is its own work (trailing punctuation folded)."""
    return fold_title(title)


def self_test() -> None:
    cases = [
        ("היהלום הכחול 1 : סטילר", "היהלום הכחול 1 : סטילר"),
        ("היהלום הכחול 2 : המלך דוד", "היהלום הכחול 2 : המלך דוד"),
        ("הלביאות מטהראן", "הלביאות מטהראן"),
        ("האי.", "האי"),
        ("האי", "האי"),
        ("האיש של 6:20", "האיש של 6:20"),
        ("פטיט : אוריקה", "פטיט : אוריקה"),
    ]
    failed = [(raw, work_key(raw), want) for raw, want in cases if work_key(raw) != want]
    if failed:
        raise SystemExit(f"work_key self-test failed: {failed}")

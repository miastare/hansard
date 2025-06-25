"""
oral_questions_2024_onwards.py
──────────────────────────────
Scrapes *House of Commons oral questions* tabled on/after 2024‑01‑01 (by
default) using the Oral‑Questions‑and‑Motions API and writes two files per
calendar year:

    oral_questions_YYYY.csv
    oral_questions_YYYY.pkl

The output schema roughly mirrors the written‑questions harvester:
    • full text of the question & any printed answer text (if present)
    • core metadata – UIN, status, question number, tabled / answer dates,
      answering body & minister title, etc.
    • a point‑in‑time snapshot of the asking Member (name, gender, party …)

Pagination is handled with the API’s `parameters.skip` argument.
"""
from __future__ import annotations

import gc
import pickle
import re
import sys
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional

import pandas as pd
import requests

# ───────────────────────────── CONFIG ─────────────────────────────
START_DATE: str = "2024-01-01"                                    # inclusive
END_DATE: str = datetime.utcnow().strftime("%Y-%m-%d")              # today
TAKE: int = 100                                                   # page size

ORAL_API: str = (
    "https://oralquestionsandmotions-api.parliament.uk/"
    "oralquestions/list"
)
MEMBER_API: str = "https://members-api.parliament.uk/api/Members/{member_id}"

# ──────────────────────────── SESSION ────────────────────────────

sess = requests.Session()
sess.headers.update({"User-Agent": "ParlHarvester/1.0"})

# ───────────────────── MEMBER LOOKUP CACHE ───────────────────────

with open("uk_parliament.pkl", "rb") as fh:
    MEMBER_LOOKUP: Dict[int, Dict[str, Any]] = pickle.load(fh)
_missing_cache: Dict[int, Dict[str, Any]] = {}

# ────────────────────────── UTILITIES ────────────────────────────

def jget(url: str, **params) -> dict:  # noqa: D401
    """GET *url* with *params* and return its JSON payload."""
    resp = sess.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def approx_words(text: str | None) -> int:
    if not text:
        return 0
    return len(re.findall(r"\b\w+(?:['-]\w+)*\b", text))


def to_date(iso: str | None) -> Optional[date]:
    return None if iso is None else datetime.fromisoformat(iso[:10]).date()


def active_on(target: date, start: str | None, end: str | None) -> bool:
    s = to_date(start)
    e = to_date(end)
    return (s is None or target >= s) and (e is None or target <= e)

# ─────────────────────── MEMBER SNAPSHOT ─────────────────────────

def fetch_member(member_id: int) -> Dict[str, Any]:
    if member_id in MEMBER_LOOKUP:
        return MEMBER_LOOKUP[member_id]
    if member_id in _missing_cache:
        return _missing_cache[member_id]
    try:
        record = jget(MEMBER_API.format(member_id=member_id)).get("value", {})
    except Exception as exc:  # noqa: BLE001, S110
        print(f"[warn] member {member_id} fetch fail: {exc}", file=sys.stderr)
        record = {}
    _missing_cache[member_id] = record
    return record


def names_at(dt: date, rows: List[dict] | None, field: str) -> str:
    if not rows:
        return ""
    names: set[str] = set()
    for r in rows:
        if active_on(dt, r.get("startDate"), r.get("endDate")):
            val = r.get(field)
            names.add(val.get("name") if isinstance(val, dict) else val)
    return "; ".join(sorted(names))


def member_snapshot(member_id: int | None, ref_dt: date) -> Dict[str, Any]:
    if member_id is None:
        return {}
    rec = fetch_member(member_id)
    if not rec:
        return {"name": None}

    first_join = min(
        (
            to_date(m.get("startDate"))
            for m in rec.get("houseMemberships", [])
            if m.get("startDate")
        ),
        default=None,
    )

    party_at_dt = next(
        (
            a.get("party")
            for a in rec.get("partyAffiliations", [])
            if active_on(ref_dt, a.get("startDate"), a.get("endDate"))
        ),
        rec.get("currentParty"),
    )

    constituency = next(
        (
            r.get("name") or r.get("memberFrom")
            for r in rec.get("representationsRaw", [])
            if active_on(ref_dt, r.get("startDate"), r.get("endDate"))
        ),
        None,
    )
    peer_type = rec["peer_type"]  # for lords, this means e.g. hereditary, bishop etc.

    return {
        "name": rec.get("name") or rec.get("listAs"),
        "gender": rec.get("gender"),
        "age_proxy": None
        if first_join is None
        else round((ref_dt - first_join).days / 365.25, 1),
        "party": party_at_dt,
        "constituency": constituency,
        "government_posts": names_at(ref_dt, rec.get("governmentPostsRaw"), "name"),
        "opposition_posts": names_at(ref_dt, rec.get("oppositionPostsRaw"), "name"),
        "committees": names_at(ref_dt, rec.get("committeeMembershipsRaw"), "committee"),
        "peer_type" : peer_type,
        "member_id" : member_id
    }

# ─────────────────────────── PARSER ─────────────────────────────

def parse_oral_question(q: dict) -> Dict[str, Any]:
    ref_dt = to_date(q.get("TabledWhen")) or date.today()
    snap = member_snapshot(q.get("AskingMemberId"), ref_dt)
    return {
        **snap,
        "uin": q.get("UIN"),
        "question_text": q.get("QuestionText"),
        "answer_text": q.get("Answer"),
        "answering_body": q.get("AnsweringBody"),
        "answering_minister_title": q.get("AnsweringMinisterTitle"),
        "status": q.get("Status"),
        "question_number": q.get("Number"),
        "date_tabled": q.get("TabledWhen"),
        "date_for_answer": q.get("AnsweringWhen"),
        "n_words_question": approx_words(q.get("QuestionText")),
        "n_words_answer": approx_words(q.get("Answer")),
    }

# ─────────────────────── API ITERATOR ───────────────────────────

def iter_oral_questions(start: str, end: str) -> Iterable[dict]:
    skip = 0
    base_params = {
        "parameters.answeringDateStart": start,
        "parameters.answeringDateEnd": end,
    }
    while True:
        payload = jget(
            ORAL_API,
            **base_params,
            **{"parameters.skip": skip, "parameters.take": TAKE},
        )
        items = payload.get("Response") or []
        if not items:
            break
        yield from items
        skip += TAKE

# ───────────────────────── HARVESTER ────────────────────────────

def process_year(year: int) -> None:
    y_start = f"{year}-01-01"
    y_end = f"{year}-12-31"

    oral_qs: List[Dict[str, Any]] = []

    print(f"[info] {year}: harvesting oral questions …")
    for itm in iter_oral_questions(y_start, y_end):
        try:
            oral_qs.append(parse_oral_question(itm))
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] parse fail id={itm.get('Id')}: {exc}", file=sys.stderr)

    if oral_qs:
        df = pd.DataFrame(oral_qs)
        df.to_csv(f"./output/oral_questions_{year}.csv", index=False)
        df.to_pickle(f"./output/oral_questions_{year}.pkl")

    gc.collect()
    print(f"[done] {year}: {len(oral_qs)} oral questions")

# ───────────────────────────── CLI ─────────────────────────────

if __name__ == "__main__":
    first_year = int(START_DATE[:4])
    last_year = int(END_DATE[:4])

    for yr in range(first_year, last_year + 1):
        process_year(yr)

"""
written_qs_statements_2024_onwards.py
──────────────────────────────────────
Scrapes all *written questions* and *written ministerial statements* from
UK Parliament APIs, starting at 2024‑01‑01 by default, and writes one pair
of files per calendar year:

    written_questions_YYYY.csv   / .pkl
    written_statements_YYYY.csv  / .pkl

The output schema for questions mirrors the Hansard‑debate extractor:
    • text of the question & (if present) answer
    • metadata such as UIN, tabled/answer dates, answering body, status flags
    • a point‑in‑time snapshot of the asking Member (name, gender, party …)
    • asking / answering context URLs for convenience

Written statements records include:
    • title & full text of the statement
    • date made, issuing department, notice number, linked statement ids
    • MP/Lord snapshot at dateMade

Change START_DATE / END_DATE to narrow or extend the sweep. Pagination is
handled with the APIs’ `skip` parameter.
"""
from __future__ import annotations

import sys, re, pickle, gc
from datetime import datetime, date
from typing import Any, Dict, List, Optional

import pandas as pd
import requests
from slugify import slugify

from heckle_patterns import assess_parliamentary_turn  # optional reuse

# ───────────────────────── Config ──────────────────────────
START_DATE = "2024-01-01"  # inclusive
END_DATE   = datetime.utcnow().strftime("%Y-%m-%d")   # today
TAKE       = 100            # page size for search

QUESTIONS_API  = "https://questions-statements-api.parliament.uk/api/writtenquestions/questions"
STATEMENTS_API = "https://questions-statements-api.parliament.uk/api/writtenstatements/statements"
MEMBER_API     = "https://members-api.parliament.uk/api/Members/{}"
# ───────────────────────────────────────────────────────────

sess = requests.Session()
sess.headers.update({"User-Agent": "Mozilla/5.0"})

# Pre‑fetched Members index for speed (same structure used by debates script)
with open("uk_parliament.pkl", "rb") as fh:
    MEMBER_LOOKUP_DATA: Dict[int, Dict[str, Any]] = pickle.load(fh)

# ---------- helper: fetch & cache missing member records -------------
_missing_cache: Dict[int, Dict[str, Any]] = {}

def member_record(member_id: int) -> Dict[str, Any]:
    if member_id in MEMBER_LOOKUP_DATA:
        return MEMBER_LOOKUP_DATA[member_id]
    if member_id in _missing_cache:  # already fetched this run
        return _missing_cache[member_id]

    try:
        js = sess.get(MEMBER_API.format(member_id), timeout=30).json()
        rec = js.get("value") or {}
        _missing_cache[member_id] = rec
        return rec
    except Exception as e:
        print(f"[warn] failed to fetch Member {member_id}: {e}", file=sys.stderr)
        return {}

# ───────────────────────── Utilities ───────────────────────

def jget(url: str, **params) -> dict:
    r = sess.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def approx_word_count(text: str) -> int:
    return len(re.findall(r"\b\w+(?:['-]\w+)*\b", text))


def _to_date(iso: Optional[str]) -> Optional[date]:
    if not iso:
        return None
    return datetime.fromisoformat(iso[:10]).date()


def _active_on(target: date, start_iso: Optional[str], end_iso: Optional[str]) -> bool:
    s, e = _to_date(start_iso), _to_date(end_iso)
    return (s is None or target >= s) and (e is None or target <= e)


def _pluck_names(rows: List[Dict[str, Any]], field: str, d: date) -> List[str]:
    names: set[str] = set()
    for r in rows or []:
        if _active_on(d, r.get("startDate"), r.get("endDate")):
            val = r.get(field)
            names.add(val.get("name") if isinstance(val, dict) else val)
    return sorted(filter(None, names))


def _string_joiner(lst: List[str]) -> str:
    return " ___ ".join(lst)


# --------------- member snapshot (re‑used) ----------------

def member_snapshot(member_id: int, ref_dt: date) -> Dict[str, Any]:
    rec = member_record(member_id)
    if not rec:
        return {"name": None}

    name    = rec.get("name") or rec.get("listAs")
    gender  = rec.get("gender")

    first_join = min(( _to_date(b.get("startDate")) for b in rec.get("houseMemberships", []) if b.get("startDate") ), default=None)
    age_proxy  = round((ref_dt - first_join).days/365.25, 1) if first_join else None

    party_today = rec.get("currentParty") or rec.get("party")
    party_at_dt = next((p.get("party") for p in rec.get("partyAffiliations", []) if _active_on(ref_dt, p.get("startDate"), p.get("endDate"))), party_today)

    constituency = next((r.get("name") or r.get("memberFrom") for r in rec.get("representationsRaw", []) if _active_on(ref_dt, r.get("startDate"), r.get("endDate"))), None)

    gov_posts = _pluck_names(rec.get("governmentPostsRaw"), "name", ref_dt)
    opp_posts = _pluck_names(rec.get("oppositionPostsRaw"), "name", ref_dt)
    committees = _pluck_names(rec.get("committeeMembershipsRaw"), "committee", ref_dt)

    return {
        "name": name,
        "gender": gender,
        "age_proxy": age_proxy,
        "party": party_at_dt,
        "constituency": constituency,
        "government_posts": _string_joiner(gov_posts),
        "n_government_posts": len(gov_posts),
        "opposition_posts": _string_joiner(opp_posts),
        "n_opposition_posts": len(opp_posts),
        "committees": _string_joiner(committees),
        "n_committees": len(committees),
    }


# ──────────────────────── Parsers ─────────────────────────

def _attachments_summary(atts: List[Dict[str, Any]]) -> str:
    return " | ".join(f"{a.get('title')} ({a.get('fileType')}, {a.get('fileSizeBytes', 0)//1024}KB)" for a in atts)


# -- Written Question --------------------------------------

def parse_question(itm: Dict[str, Any]) -> Dict[str, Any]:
    q   = itm["value"]
    qdt = _to_date(q["dateTabled"])
    if qdt is None:
        qdt = _to_date(q["dateForAnswer"]) or date.today()

    ask_id = q.get("askingMemberId")
    snapshot = member_snapshot(ask_id, qdt) if ask_id else {}

    record: Dict[str, Any] = {
        # core
        "id": q["id"],
        "uin": q["uin"],
        "house": q["house"],
        "value": q["questionText"],
        "n_char" : q["questionText"],
        "n_words_guess": approx_word_count(q["questionText"]),
        "date_tabled": q["dateTabled"],
        "date_for_answer": q.get("dateForAnswer"),
        "answering_body": q.get("answeringBodyName"),
        "is_named_day": q.get("isNamedDay"),
        "is_withdrawn": q.get("isWithdrawn"),
        "status": q.get("questionStatus"),
        "answer_is_holding": q.get("answerIsHolding"),
        "answer_is_correction": q.get("answerIsCorrection"),
        "answer_text": q.get("answerText"),
        "answer_wordcount": approx_word_count(q.get("answerText", "")),
        "date_answered": q.get("dateAnswered"),
        "date_answer_corrected": q.get("dateAnswerCorrected"),
        "date_holding_answer": q.get("dateHoldingAnswer"),
        # extra
        "heading": q.get("heading"),
        "n_attachments": q.get("attachmentCount", 0),
        "attachments_summary": _attachments_summary(q.get("attachments", [])),
        # convenience URLs
        "url_api": f"https://questions-statements-api.parliament.uk/api/writtenquestions/questions/{qdt}/{q['uin']}",
    }
    return snapshot | record


# -- Written Statement -------------------------------------

def parse_statement(itm: Dict[str, Any]) -> Dict[str, Any]:
    s   = itm["value"]
    sdt = _to_date(s["dateMade"])
    member_id = s.get("memberId")
    snapshot = member_snapshot(member_id, sdt) if member_id else {}

    record: Dict[str, Any] = {
        "id": s["id"],
        "uin": s["uin"],
        "house": s.get("house"),
        "title": s.get("title"),
        "value": s.get("text"),
        "n_char" : len(s.get("text", 0)),
        "n_words_guess": approx_word_count(s.get("text", "")),
        "date_made": s.get("dateMade"),
        "answering_body": s.get("answeringBodyName"),
        "notice_number": s.get("noticeNumber"),
        "has_attachments": s.get("hasAttachments"),
        "has_linked_statements": s.get("hasLinkedStatements"),
        "linked_statement_ids": _string_joiner([str(l["linkedStatementId"]) for l in s.get("linkedStatements", [])]),
        "attachments_summary": _attachments_summary(s.get("attachments", [])),
        "url_api": f"https://questions-statements-api.parliament.uk/api/writtenstatements/statements/{sdt}/{s['uin']}",
    }
    return snapshot | record


# ─────────────────── API iterators (paged) ─────────────────

def iter_questions(start: str, end: str):
    skip = 0
    while True:
        js = jget(QUESTIONS_API,
                   tabledWhenFrom=start,
                   tabledWhenTo=end,
                   expandMember="true",
                   skip=skip,
                   take=TAKE)
        results = js.get("results", [])
        if not results:
            break
        yield from results
        skip += TAKE


def iter_statements(start: str, end: str):
    skip = 0
    while True:
        js = jget(STATEMENTS_API,
                   madeWhenFrom=start,
                   madeWhenTo=end,
                   expandMember="true",
                   skip=skip,
                   take=TAKE)
        results = js.get("results", [])
        if not results:
            break
        yield from results
        skip += TAKE


# ───────────────────── per‑year harvesting ─────────────────

def process_year(year: int):
    y_start = f"{year}-01-01"
    y_end   = f"{year}-12-31"

    questions: List[Dict[str, Any]] = []
    statements: List[Dict[str, Any]] = []

    # ---- questions ----
    for itm in iter_questions(y_start, y_end):
        questions.append(parse_question(itm))


    # ---- statements ----
    for itm in iter_statements(y_start, y_end):
        statements.append(parse_statement(itm))

    # ---------- write year files ---------------------------
    if questions:
        q_df = pd.DataFrame(questions)
        q_df.to_csv(f"written_questions_{year}.csv", index=False)
        q_df.to_pickle(f"written_questions_{year}.pkl")

    if statements:
        s_df = pd.DataFrame(statements)
        s_df.to_csv(f"written_statements_{year}.csv", index=False)
        s_df.to_pickle(f"written_statements_{year}.pkl")

    gc.collect()
    print(f"\n[{year}] done – {len(questions)} questions, {len(statements)} statements\n")


# ────────────────────────── CLI ───────────────────────────
if __name__ == "__main__":
    first_year = int(START_DATE[:4])
    last_year  = int(END_DATE[:4])

    for yr in range(first_year, last_year + 1):
        process_year(yr)

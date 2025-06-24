"""
debates_2024_onwards.py
—————————
Scrapes **all Westminster debates from 2024-01-01 onward**
and writes one pair of files per calendar year:

    contributions_YYYY.csv / .pkl
    divisions_YYYY.csv      / .pkl

Change START_DATE / END_DATE to narrow or extend the sweep.
Pagination is handled with the API’s `skip` parameter.
"""
from __future__ import annotations

import sys, re, pickle, gc
from datetime import datetime, date
from typing import Any, Dict, List, Optional

import pandas as pd
import requests
from slugify import slugify

from heckle_patterns import assess_parliamentary_turn   # ← your upgraded detector

# ───────────────────────── Config ──────────────────────────
START_DATE = "2024-01-01"          # inclusive
END_DATE   = datetime.utcnow().strftime("%Y-%m-%d")   # today
TAKE       = 100                   # page size for Hansard search
# ───────────────────────────────────────────────────────────

HANSARD_SEARCH = "https://hansard-api.parliament.uk/search/debates.json"
DEBATE_URL     = "https://hansard-api.parliament.uk/debates/debate/{}.json"

COMMONS_VOTES_SEARCH = "https://commonsvotes-api.parliament.uk/data/divisions.json/search"
LORDS_VOTES_SEARCH   = "https://lordsvotes-api.parliament.uk/data/Divisions/groupedbyparty"

sess = requests.Session()
sess.headers.update({"User-Agent": "Mozilla/5.0"})

with open("uk_parliament.pkl", "rb") as fh:
    MEMBER_LOOKUP_DATA = pickle.load(fh)


# ───────────────────────── Utilities ───────────────────────
def jget(url: str, **params) -> dict:
    r = sess.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def commons_vote_details(dt: str, number: str):
    js = jget(COMMONS_VOTES_SEARCH,
              startDate=dt, endDate=dt, divisionNumber=number)
    return (
        (js[0]['DivisionId'],
         js[0]['Date'],
         js[0]['Title'],
         js[0]['AyeCount'],
         js[0]['NoCount'])
        if js else (None,)*5
    )


def lords_vote_details(dt: str, number: str):
    js = jget(LORDS_VOTES_SEARCH,
              startDate=dt, endDate=dt, divisionNumber=number)
    return (
        (js[0]['divisionId'],
         js[0]['date'],
         js[0]['title'],
         js[0]['contentCount'],
         js[0]['notContentCount'])
        if js else (None,)*5
    )


# ––––– small helpers from your previous script  –––––
def _to_date(iso: Optional[str]) -> Optional[date]:
    if not iso:
        return None
    return datetime.fromisoformat(iso[:10]).date()


def _active_on(target: date, start_iso: Optional[str], end_iso: Optional[str]) -> bool:
    s, e = _to_date(start_iso), _to_date(end_iso)
    return (s is None or target >= s) and (e is None or target <= e)


def _pluck_names(rows: List[Dict[str, Any]], field: str, d: date) -> List[str]:
    names = set()
    for r in rows:
        if _active_on(d, r.get("startDate"), r.get("endDate")):
            val = r.get(field)
            names.add(val.get("name") if isinstance(val, dict) else val)
    return sorted(filter(None, names))


def _string_joiner(lst: List[str]) -> str:
    return " ___ ".join(lst)


# --------------- member snapshot (unchanged) ----------------
def member_snapshot(member_id: int, debate_dt: date, rec: Dict[str, Any]) -> Dict[str, Any]:
    name = rec["name"]
    gender = rec.get("gender")

    first_join = min((_to_date(b["startDate"]) for b in rec["houseMemberships"] if b.get("startDate")), default=None)
    age_proxy = round((debate_dt - first_join).days / 365.25, 1) if first_join else None

    party_today = rec.get("currentParty")
    party_at_dt = next((p["party"] for p in rec.get("partyAffiliations", [])
                        if _active_on(debate_dt, p["startDate"], p["endDate"])), party_today)

    constituency = next((r.get("name") or r.get("membershipFrom")
                         for r in rec.get("representationsRaw", [])
                         if _active_on(debate_dt, r.get("startDate"), r.get("endDate"))), None)

    gov_posts = _pluck_names(rec.get("governmentPostsRaw", []), "name", debate_dt)
    opp_posts = _pluck_names(rec.get("oppositionPostsRaw", []), "name", debate_dt)
    committees = _pluck_names(rec.get("committeeMembershipsRaw", []), "committee", debate_dt)

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


def approx_word_count(text: str) -> int:
    return len(re.findall(r"\b\w+(?:['-]\w+)*\b", text))


def _get_metadata(itm, latest_timecode):
    return {
        "ItemId": itm["ItemId"],
        "ExternalId": itm["ExternalId"],
        "OrderInSection": itm["OrderInSection"],
        "latest_timecode": latest_timecode,
    }


# --------------- per-item parsers -----------------------------------
def _parse_contribution(itm, debate_date, latest_timecode, house, debate_id, title_slug):
    member_id = itm.get("MemberId")
    if not member_id:
        return None
    rec = MEMBER_LOOKUP_DATA[member_id]
    snapshot = member_snapshot(member_id, _to_date(debate_date), rec)

    word_details = {
        "value": itm["Value"],
        "n_char": len(itm["Value"]),
        "n_words_guess": approx_word_count(itm["Value"]),
    }

    is_chair = itm.get("AttributedTo") in {"Speaker", "Deputy Speaker"}
    context_url = (
        f"https://hansard.parliament.uk/{house}/{debate_date}/debates/"
        f"{debate_id}/{title_slug}#contribution-{itm['ExternalId']}"
    )

    return (
        snapshot
        | word_details
        | _get_metadata(itm, latest_timecode)
        | {
            "MemberId": member_id,
            "speaker": member_id,      # field expected by detector
            "body": itm["Value"],
            "is_chair": is_chair,
            "context_url": context_url,
        }
    )


def _parse_division(itm, debate_date, debate_id, title_slug, house, latest_timecode):
    number = itm["Value"].split("|")[0]
    if house == "Commons":
        div_id, dt, title, ayes, noes = commons_vote_details(debate_date, number)
        base = "Commons"
    else:
        div_id, dt, title, ayes, noes = lords_vote_details(debate_date, number)
        base = "Lords"
    if div_id is None:
        print(f"[skip] could not map Division {number}", file=sys.stderr)
        return None

    context_url = (
        f"https://hansard.parliament.uk/{base}/{debate_date}/debates/"
        f"{debate_id}/{title_slug}#division-{itm['ItemId']}"
    )
    return (
        _get_metadata(itm, latest_timecode)
        | {
            "division_number": number,
            "division_id": div_id,
            "date": debate_date,
            "division_date_time": dt,
            "ayes": ayes,
            "noes": noes,
            "context_url": context_url,
            "division_title": title,
        }
    )


# --------------- debate search generator ----------------------------
def iter_debate_summaries(start: str, end: str):
    skip = 0
    while True:
        js = jget(HANSARD_SEARCH, startDate=start, endDate=end, take=TAKE, skip=skip)
        results = js["Results"]
        if not results:
            break
        yield from results
        skip += TAKE


# ───────────────────── main harvesting loop ─────────────────────────
def process_year(year: int):
    y_start = f"{year}-01-01"
    y_end   = f"{year}-12-31"

    contributions, divisions = [], []

    for d in iter_debate_summaries(y_start, y_end):
        debate_id = d["DebateSectionExtId"]
        print("\n" + "*" * 80)
        print(f"[{year}] processing debate {debate_id}")
        debate_js = jget(DEBATE_URL.format(debate_id))

        location = debate_js["Overview"]["Location"]
        if location not in {"Lords Chamber", "Commons Chamber"}:
            print(f"  – skipped (committee): {location}")
            continue

        house        = debate_js["Overview"]["House"]   # 'Commons' / 'Lords'
        debate_title = debate_js["Overview"]["Title"]
        title_slug   = slugify(debate_title)
        debate_dt    = debate_js["Overview"]["Date"][:10]   # YYYY-MM-DD
        latest_time  = debate_js["Overview"]["Date"]

        debate_contribs_raw = []

        for itm in debate_js["Items"]:
            if (tc := itm.get("Timecode")):
                latest_time = tc

            kind = itm["ItemType"]
            if kind == "Contribution":
                rec = _parse_contribution(itm, debate_dt, latest_time, house, debate_id, title_slug)
                if rec:
                    debate_contribs_raw.append(rec)

            elif kind == "Division":
                div = _parse_division(itm, debate_dt, debate_id, title_slug, house, latest_time)
                if div:
                    divisions.append(div | {
                        "debate_id": debate_id,
                        "location": location,
                        "debate_title": debate_title,
                        "title_slug": title_slug,
                        "debate_date": debate_dt,
                    })

        # 2-pass flagging
        speaker_window = [
            {"speaker": r["speaker"], "body": r["body"], "is_chair": r["is_chair"]}
            for r in debate_contribs_raw
        ]
        for idx, rec in enumerate(debate_contribs_raw):
            flags = assess_parliamentary_turn(speaker_window, idx, window=5)
            contributions.append(rec | flags | {
                "debate_id": debate_id,
                "location": location,
                "debate_title": debate_title,
                "title_slug": title_slug,
                "debate_date": debate_dt,
            })

    # ---------- write year files ------------------------------------
    if contributions:
        c_df = pd.DataFrame(contributions)
        c_df.to_csv(f"contributions_{year}.csv", index=False)
        c_df.to_pickle(f"contributions_{year}.pkl")

    if divisions:
        d_df = pd.DataFrame(divisions)
        d_df.to_csv(f"divisions_{year}.csv", index=False)
        d_df.to_pickle(f"divisions_{year}.pkl")

    # free memory
    gc.collect()
    print(f"\n[{year}] done – {len(contributions)} speeches, {len(divisions)} divisions\n")


if __name__ == "__main__":
    first_year = int(START_DATE[:4])
    last_year  = int(END_DATE[:4])

    for yr in range(first_year, last_year + 1):
        process_year(yr)

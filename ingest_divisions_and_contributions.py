"""
divisions_20_june_2025.py
———————————————
• Finds every debate on 20 Jun 2025
• Collects every division inside those debates
• Resolves each division to its numeric Commons-Votes ID
• Outputs: date, debate title, motion text, division-number,
           division-ID, Aye/No totals, and Hansard “context” URL
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional
import  re, sys
from typing import Optional
import pandas as pd

import requests
from slugify import slugify
import pickle

from heckle_patterns import detect_parliamentary_interactions

DATE = "2025-06-18"

HANSARD_SEARCH = "https://hansard-api.parliament.uk/search/debates.json"
DEBATE_URL     = "https://hansard-api.parliament.uk/debates/debate/{}.json"

COMMONS_VOTES_SEARCH = "https://commonsvotes-api.parliament.uk/data/divisions.json/search"
LORDS_VOTES_SEARCH = "https://lordsvotes-api.parliament.uk/data/Divisions/groupedbyparty"

sess = requests.Session()
sess.headers.update({"User-Agent": "Mozilla/5.0"})

#member data - dict where every key is a member ID, allowing us to quickly lookup info about the member.
with open("uk_parliament.pkl", "rb") as fh:
    MEMBER_LOOKUP_DATA = pickle.load(fh)

def jget(url: str, **params) -> dict:
    r = sess.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def commons_vote_details(date: str, number: str):
    payload = {"startDate": date, "endDate": date, "divisionNumber": number}
    js = jget(COMMONS_VOTES_SEARCH, **payload)
    if js:
        div_id = js[0]['DivisionId']
        date_time = js[0]['Date']
        title = js[0]['Title']
        ayes = js[0]['AyeCount']
        noes = js[0]['NoCount']
    else:
        div_id, date_time, title, ayes, noes = None, None, None, None, None


    return div_id, date_time, title, ayes, noes


def lords_vote_details(date: str, number: str):
    payload = {"startDate": date, "endDate": date, "divisionNumber": number}
    js = jget(LORDS_VOTES_SEARCH, **payload)
    if js:
        div_id = js[0]['divisionId']
        date_time = js[0]['date']
        title = js[0]['title']
        ayes = js[0]['contentCount']
        noes = js[0]['notContentCount']
    else:
        div_id, date_time, title, ayes, noes = None, None, None, None, None


    return div_id, date_time, title, ayes, noes


# ---------------------------------------------------------------------------
#  Tiny utilities
# ---------------------------------------------------------------------------

def _to_date(iso: Optional[str]) -> Optional[date]:
    """
    Accepts *anything* the Members API emits in a date-ish field:
        • "YYYY-MM-DD"
        • "YYYY-MM-DDTHH:MM:SS"
        • None / ''  (open-ended)
    Returns a datetime.date or None.
    """
    if not iso:
        return None
    return datetime.fromisoformat(iso[:10]).date()


def _active_on(target: date,
               start_iso: Optional[str],
               end_iso: Optional[str]) -> bool:
    """True ⇔ target ∈ [start, end] (open on either side if None)."""
    start, end = _to_date(start_iso), _to_date(end_iso)
    return (start is None or target >= start) and (end is None or target <= end)


def _pluck_names(rows: List[Dict[str, Any]],
                 field: str,
                 d: date) -> List[str]:
    """
    Given a list of dicts and a key whose value is a nested dict or str,
    return the *unique* names that are active on date d.
    """
    names: set[str] = set()
    for r in rows:
        if _active_on(d, r.get("startDate"), r.get("endDate")):
            val = r.get(field)
            if isinstance(val, dict):           # e.g. {"name": "..."}
                names.add(val.get("name"))
            elif isinstance(val, str):
                names.add(val)
    return sorted(names)


def _string_joiner(this_string_list: List[str]) -> str:
    return ' ___ '.join(this_string_list)

# ---------------------------------------------------------------------------
#  Public helper
# ---------------------------------------------------------------------------

def member_snapshot(
    member_id: int,
    debate_dt: date,
    rec: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Return – **for that member on that date** – a dict with:
        name, gender, age_proxy, party, constituency,
        committees, government_posts, opposition_posts
    """

    # ------------------------------------------------------------------ basic
    name   = rec["name"]
    gender = rec.get("gender")

    # age proxy = whole-number-and-decimal years since *first* House join
    first_join = min(
        (_to_date(b["startDate"])
         for b in rec["houseMemberships"]
         if b.get("startDate")),
        default=None,
    )
    age_proxy = (
        round((debate_dt - first_join).days / 365.25, 1)
        if first_join else None
    )

    # ------------------------------------------------------------------ party
    party_today = rec.get("currentParty")
    party_at_dt = next(
        (
            p["party"]
            for p in rec.get("partyAffiliations", [])
            if _active_on(debate_dt, p["startDate"], p["endDate"])
        ),
        party_today,                       # fallback – works for historical too
    )

    # ----------------------------------------------------------- constituency
    constituency = next(
        (
            r.get("name") or r.get("membershipFrom")
            for r in rec.get("representationsRaw", [])
            if _active_on(debate_dt, r.get("startDate"), r.get("endDate"))
        ),
        None,
    )

    # ------------------------------------------------------ posts & committees
    gov_posts = _pluck_names(rec.get("governmentPostsRaw", []), "name", debate_dt)
    opp_posts = _pluck_names(rec.get("oppositionPostsRaw", []), "name", debate_dt)

    # the ingestion has a *typo* in the key – cover both spellings
    cm_raw = rec.get("committeeMembershipsRaw", [])
    committees = _pluck_names(cm_raw, "committee", debate_dt)

    # ----------------------------------------------------------------- packup
    return {
        "name": name,
        "gender": gender,
        "age_proxy": age_proxy,          # e.g. 14.2  → “≈ 14 years in Parliament”
        "party": party_at_dt,
        "constituency": constituency,    # None for peers
        "government_posts": _string_joiner(gov_posts),   # str - separated by tripple underscore
        "n_government_posts" : len(gov_posts),
        "opposition_posts": _string_joiner(opp_posts),   # as above
        "n_opposition_posts" : len(opp_posts),
        "committees": _string_joiner(committees),        # as above
        "n_committees" : len(committees)
    }


def approx_word_count(text: str) -> int:
    """
    Approximate the number of individual words in a string.
    Treats words as alphabetic sequences, including internal apostrophes or hyphens.
    """
    # Match words with optional internal apostrophes/hyphens
    words = re.findall(r"\b\w+(?:['-]\w+)*\b", text)
    return len(words)


def _get_metadata(itm, latest_timecode):
    metadata = {
        'ItemId' : itm['ItemId'],
        "ExternalId" : itm["ExternalId"],
        "OrderInSection" : itm["OrderInSection"],
        'latest_timecode' : latest_timecode
    }

    return metadata


def _parse_contribution(itm, debate_date, latest_timecode, transcript_till_now):
    member_id = itm.get('MemberId')
    if not member_id:
        return None
    member_details = MEMBER_LOOKUP_DATA[member_id]
    
    snapshot = member_snapshot(member_id, _to_date(debate_date), member_details)

    word_details = {
        'value' : itm['Value'], #what they said
        'n_char' : len(itm['Value']), #number of characters
        'n_words_guess' : approx_word_count(itm['Value'])
    }

    interactions = detect_parliamentary_interactions(itm['Value'], transcript_till_now)
    snapshot['MemberId'] = member_id

    metadata = _get_metadata(itm, latest_timecode)

    return snapshot | word_details | interactions | metadata


def _parse_division(itm, debate_date, debate_id, title_slug, house, latest_timecode):
    guid   = itm["ExternalId"]
    item_id = itm["ItemId"]
    division_number = itm['Value'].split('|')[0]

    if house == "Commons":
        div_id, date_time, title, ayes, noes = commons_vote_details(debate_date, division_number)

        if div_id is None:
            print(f"[skip] unable to map Division {division_number}", file=sys.stderr)
            return None

        context_url = f"https://hansard.parliament.uk/Commons/{debate_date}/debates/{debate_id}/{title_slug}#division-{item_id}"

    else:
        div_id, date_time, title, ayes, noes = lords_vote_details(debate_date, division_number)

        if div_id is None:
            print(f"[skip] unable to map Division {division_number}", file=sys.stderr)
            return None
        context_url = f"https://hansard.parliament.uk/Lords/{debate_date}/debates/{debate_id}/{title_slug}#division-{item_id}"

    metadata = _get_metadata(itm, latest_timecode)

    parsed_division = {
            'division_number' : division_number,
            'division_id' : div_id, #best for getting full vote breakdown
            'date' : debate_date,
            'division_date_time' : date_time,
            'ayes' : ayes,
            'noes' : noes,
            'context_url' : context_url,
            'division_title' : title,
        } | metadata

    print(f'Successfully parsed division with id: {div_id}')

    return parsed_division


# STEP 0 – debates on 20 Jun 2025
debates = jget(
    HANSARD_SEARCH,
    startDate='2025-06-15',
    endDate="2025-06-20",
    take=100,
)["Results"]

division_list = []
contributions_list = []
for d in debates:
    debate_id = d["DebateSectionExtId"]
    print('*' * 80)
    print(f"Doing debate {debate_id}")
    print('---')
    debate_js = jget(DEBATE_URL.format(debate_id))
    location = debate_js['Overview']['Location']
    if location not in ["Lords Chamber", "Commons Chamber"]:
        print(f"Skipping debate {debate_id} because location appears to be a committee: {location}")
        continue
    debate_title = debate_js['Overview']["Title"]
    title_slug = slugify(debate_title)
    debate_datetime = debate_js['Overview']["Date"]
    debate_date  = debate_datetime[:10]
    transcript_till_now = []
    basic_debates_details = {
        'debate_id' : debate_id,
        'location' : location, 
        'debate_title' : debate_title,
        'title_slug' : title_slug,
        'debate_date' : debate_date
    }

    house = debate_js['Overview']["House"]
    latest_timecode = debate_datetime

    for itm in debate_js["Items"]:

        timecode = itm.get('Timecode')
        if timecode:
            latest_timecode = timecode

        item_type = itm["ItemType"]

        if item_type == 'Contribution':
            this_contribution_record = _parse_contribution(itm, debate_date, latest_timecode, transcript_till_now)
            if this_contribution_record:
                print(f'Successfully parsed contribution from {this_contribution_record["name"]}')
                contributions_list.append(this_contribution_record | basic_debates_details)
                transcript_till_now.append(itm['Value'])


        if item_type == "Division":
            
            parsed_division = _parse_division(itm, debate_date, debate_id, title_slug, house, latest_timecode)
            if not parsed_division:
                continue
            division_list.append(parsed_division | basic_debates_details)
            


division_df  = pd.DataFrame(division_list)
division_df.to_csv('division_df.csv')

contribution_df = pd.DataFrame(contributions_list)
contribution_df.to_csv('contribution.csv')





#0. Look up an arbitrary debate or debates:
'''
params = {
        'startDate' : go_back_to_str, #in the form yyyy-mm-dd
        'endDate' : current_str, #in the form yyyy-mm-dd
        'take' : 100
}

debates_url = f"https://hansard-api.parliament.uk/search/debates.json"
response = requests.get(debates_url, params = params)
'''








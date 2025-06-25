#!/usr/bin/env python3
"""
--------------------------------------------------------------------------
 UK Parliament Members – current roll   *and*   complete historical roll
--------------------------------------------------------------------------

Changes in THIS revision (June 2025)
====================================
* **ID‑sweep ceiling** restored to **5 500** (was temporarily raised).
* **Two explicit join‑date fields**:
    • `joining_date_current_house` – earliest start date in the *house they sit in today*.
    • `joining_date_past_house`    – earliest start date in the *other* house (or `None`).
* Helper `_parse_house_memberships()` expanded to return those two dates.
* Docstrings & type hints refreshed; logic elsewhere unchanged.

Each pickled record now includes – in addition to all previously supplied
keys – the two new ISO‑8601 date strings (or `None`).

--------------------------------------------------------------------------
"""

from __future__ import annotations

import pickle
import time
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests
from utils import safe_concat_dataframes

try:
    from tqdm import tqdm  # progress bar
except ImportError:  # fallback – no tqdm

    def tqdm(iterable, **kwargs):  # type: ignore[misc]
        return iterable

# ---------------------------------------------------------------------------
#  Constants & session setup
# ---------------------------------------------------------------------------

_BASE = "https://members-api.parliament.uk/api"
_SESSION = requests.Session()
_SESSION.headers.update({"Accept": "application/json"})
_ID_SWEEP_MAX = 5_500   # per user request – known upper bound June 2025

#these are rare cases where former lords were elected as MPs.
#the latestHouseMembership field for them will have details of their commons membership, so we hard-code their peerage type
LORDS_TO_COMMONS = {
    "Mr Tony Benn":          "Hereditary peer",   # Viscount Stansgate – disclaimed 1963
    "Sir Max Aitken":     "Hereditary peer",   # briefly 2nd Baron Beaverbrook in June 1964 – disclaimed after 3 days
    "Antony Lambton":     "Hereditary peer",   # 6th Earl of Durham – disclaimed Feb 1970 to stay an MP
}
# ---------------------------------------------------------------------------
#  Narrow helpers – interests & focus (as in previous version)
# ---------------------------------------------------------------------------

def _get_member_interests_payload(m_id: int) -> Dict[str, Any]:
    r = _SESSION.get(f"{_BASE}/Members/{m_id}/RegisteredInterests", timeout=(5, 60))
    r.raise_for_status()
    return r.json()


def _flatten_member_interests(payload: Dict[str, Any]) -> pd.DataFrame:
    rows: List[dict[str, Any]] = []

    def walk(node: Dict[str, Any], category: str, parent: Optional[int], chain: List[int]):
        child_ids: List[int] = []
        for child in node.get("childInterests", []):
            child_ids += walk(child, category, node["id"], chain + [node["id"]])

        rows.append(
            {
                "id": node["id"],
                "parent": parent,
                "ancestors": chain,
                "descendants": child_ids,
                "category": category,
                "interest": node["interest"],
                "createdWhen": node["createdWhen"],
                "lastAmendedWhen": node["lastAmendedWhen"],
                "deletedWhen": node["deletedWhen"],
                "isCorrection": node["isCorrection"],
            }
        )
        return [node["id"]] + child_ids

    for cat in payload.get("value", []):
        for it in cat.get("interests", []):
            walk(it, cat["name"], None, [])

    return pd.DataFrame(rows, columns = ['id', 'parent', 'ancestors', 'descendants', 'category', 'interest',
       'createdWhen', 'lastAmendedWhen', 'deletedWhen', 'isCorrection'])


def _get_member_focus_payload(m_id: int) -> Dict[str, Any]:
    r = _SESSION.get(f"{_BASE}/Members/{m_id}/Focus", timeout=(5, 60))
    if r.status_code == 404:
        return {"value": []}
    r.raise_for_status()
    return r.json()


def _normalise_focus(payload: Dict[str, Any]) -> Dict[str, List[str]]:
    return {block["category"]: block.get("focus", []) for block in payload.get("value", [])}


# ---------------------------------------------------------------------------
#  Resilient JSON fetch with back‑off
# ---------------------------------------------------------------------------

def _fetch_json(endpoint: str, params: Dict | None = None, retries: int = 5) -> Dict:
    backoff = 1.5
    for attempt in range(retries):
        try:
            r = _SESSION.get(f"{_BASE}{endpoint}", params=params, timeout=(5, 60))
            r.raise_for_status()
            return r.json()
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError) as e:
            if attempt == retries - 1:
                raise
            time.sleep(backoff * (attempt + 1))
        except requests.exceptions.HTTPError as e:
            if e.response.status_code in {500, 504} and attempt < retries - 1:
                time.sleep(backoff * (attempt + 1))
                continue
            raise


# ---------------------------------------------------------------------------
#  Member‑listing helpers
# ---------------------------------------------------------------------------

def _fetch_member_stub_by_id(m_id: int) -> Optional[Dict[str, Any]]:
    try:
        return _fetch_json(f"/Members/{m_id}").get("value")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code in {404, 500}:
            return None
        raise


def _list_all_member_stubs(max_id: int = _ID_SWEEP_MAX) -> List[Dict[str, Any]]:
    stubs: List[Dict[str, Any]] = []
    for mid in tqdm(range(1, max_id + 1), desc="Sweeping member‑ID space"):
        stub = _fetch_member_stub_by_id(mid)
        if stub:
            stubs.append(stub)
        time.sleep(0.03)  # API‑friendly
    return stubs


# ---------------------------------------------------------------------------
#  House‑membership parsing
# ---------------------------------------------------------------------------

def _parse_house_memberships(hm_blocks: List[Dict[str, Any]]) -> Tuple[int, Optional[int], str, Optional[str]]:
    """Return (current_house, past_house, join_curr, join_past)."""

    if not hm_blocks:
        return 0, None, "", None

    # Determine current_house via *open* membership (endDate == None) else latest startDate
    open_blocks = [b for b in hm_blocks if b["endDate"] is None]
    if open_blocks:
        current_block = open_blocks[0]
    else:
        current_block = max(hm_blocks, key=lambda b: b["startDate"] or "")

    current_house = current_block["house"]

    # Earliest start in current house
    joins_curr = min(
        (b["startDate"] for b in hm_blocks if b["house"] == current_house),
        default="",
    )

    # Past house detection (Commons → Lords or vice‑versa)
    other_house = 1 if current_house == 2 else 2
    past_blocks = [b for b in hm_blocks if b["house"] == other_house]
    if past_blocks:
        past_house: Optional[int] = other_house
        joins_past: Optional[str] = min(b["startDate"] for b in past_blocks)
    else:
        past_house = None
        joins_past = None

    return current_house, past_house, joins_curr, joins_past


# ---------------------------------------------------------------------------
#  Build one rich member record
# ---------------------------------------------------------------------------

def _build_member_record(stub: Dict[str, Any]) -> Tuple[Dict[str, Any], pd.DataFrame]:
    m_id = stub["id"]

    bio = _fetch_json(f"/Members/{m_id}/Biography")["value"]
    contribs = _fetch_json(f"/Members/{m_id}/ContributionSummary").get("totalResults", 0)

    try:
        # Focus + interests
        focus_dict = _normalise_focus(_get_member_focus_payload(m_id))
        interest_payload = _get_member_interests_payload(m_id)
        interest_df = _flatten_member_interests(interest_payload)
        interest_df["m_id"] = m_id
    except requests.exceptions.HTTPError as e:
        if e.response.status_code in {500, 504}:
            focus_dict = {}
            interest_df =_flatten_member_interests({})
            interest_df["m_id"] = m_id


    # House memberships
    curr_house, past_house, join_curr, join_past = _parse_house_memberships(bio.get("houseMemberships", []))

    # Posts map   {post_name: is_current_bool}
    posts_current: Dict[str, bool] = {}
    for cat in ("governmentPosts", "oppositionPosts", "otherPosts"):
        for p in bio.get(cat, []):
            posts_current[p["name"]] = p["endDate"] is None

    # Party history
    parties = [
        {"party": ph["name"], "startDate": ph["startDate"], "endDate": ph["endDate"]}
        for ph in bio.get("partyAffiliations", [])
    ]

    latest_mem = stub["latestHouseMembership"]
    constituency = latest_mem.get("membershipFrom") if latest_mem["house"] == 1 else None
    latest_party_dict = stub.get("latestParty")
    if latest_party_dict:
        latest_party = latest_party_dict.get("name")
    else:
        latest_party = None

    name = stub["nameDisplayAs"]
    if (curr_house == 2) or (name in LORDS_TO_COMMONS): #lords
        peer_type = stub["latestHouseMembership"]["membershipFrom"]
        if name in LORDS_TO_COMMONS:
            peer_type = LORDS_TO_COMMONS[name]
    else:
        peer_type = None

    record: Dict[str, Any] = {
        "name": name,
        "current_house": curr_house,
        "past_house": past_house,
        "joining_date_current_house": join_curr,
        "joining_date_past_house": join_past,
        "isCurrentMember": latest_mem["membershipEndDate"] is None,
        "constituency": constituency,
        "currentParty": latest_party,
        "partyAffiliations": parties,
        "partyList": sorted({p["party"] for p in parties}),
        "ministerialPosts": posts_current,
        "governmentPostsRaw": bio.get("governmentPosts", []),
        "oppositionPostsRaw": bio.get("oppositionPosts", []),
        "otherPostsRaw": bio.get("otherPosts", []),
        "committeeMembershipsRaw" : bio.get("committeeMemberships", []),
        "representationsRaw" : bio.get("representations", []),#history of which constituencies they have represented, and at what times.
        "gender": stub.get("gender"),
        "nContributions": contribs,
        "focus": focus_dict,
        "houseMemberships": bio.get("houseMemberships", []),
        "flattened_interest_meta": {
            "n_rows": len(interest_df),
            "categories": sorted(interest_df["category"].unique()),
        },
        "peer_type" : peer_type #for lords, tells us what type of peer they are. For people who have never been in the house of lords, it is None
    }

    return record, interest_df


# ---------------------------------------------------------------------------
#  Build & persist datasets
# ---------------------------------------------------------------------------


print("⏳  Fetching member stubs …")
stubs = _list_all_member_stubs()  # ceiling 5 500
current = [s for s in stubs if s["latestHouseMembership"]["membershipEndDate"] is None]

current_data: Dict[int, Dict[str, Any]] = {}
interest_frames: List[pd.DataFrame] = []

for s in tqdm(current, desc="Enriching CURRENT members"):

    rec, df = _build_member_record(s)
    current_data[s["id"]] = rec
    interest_frames.append(df)
    time.sleep(0.4)

historical_data: Dict[int, Dict[str, Any]] = {}

for s in tqdm(stubs, desc="Enriching HISTORICAL members"):
    if s["id"] in current_data:
        historical_data[s["id"]] = current_data[s["id"]]
        continue

    rec, _ = _build_member_record(s)
    historical_data[s["id"]] = rec
    time.sleep(0.4)

combined = {**current_data, **historical_data}

with open("./output/uk_parliament.pkl", "wb") as fh:
    pickle.dump(combined, fh)

interest_frames = [
    df for df in interest_frames
    if not df.empty and not df.isna().all(axis=None)
]
if interest_frames:
    interest_df = safe_concat_dataframes(interest_frames)
    interest_df.to_csv("./output/all_interest_df.csv", index=False)

print(f"✅  Saved {len(combined):,} member records → ./output/uk_parliament.pkl")




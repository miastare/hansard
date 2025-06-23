#!/usr/bin/env python3
"""
Download every Commons vote cast by Diane Abbott (Member ID 172) and
return them in a tidy pandas DataFrame.

Columns:
    title              – Division title
    date               – Datetime64[ns] (division date, UK time)
    vote               – 'Aye', 'No', 'Teller (Aye)', 'Teller (No)'
    division_id        – Unique ID used by the Commons Votes API
    divisionNumber     – Sequential number within the session
    numberInFavour     – Total Aye votes in the division
    numberAgainst      – Total No votes in the division
"""

import requests
import pandas as pd
from datetime import datetime, timezone, timedelta
import time

BASE_URL = "https://members-api.parliament.uk/api/Members/{id}/Voting"
MEMBER_ID = 172          # Diane Abbott
HOUSE = 1                # 1 = House of Commons, 2 = Lords
PAGE_PAUSE = 0.2         # polite delay between requests (seconds)

DIVISION_URL = "https://members-api.parliament.uk/api/data/divisions/{divisionId}.json"

def fetch_votes(member_id: int = MEMBER_ID, house: int = HOUSE) -> pd.DataFrame:
    """Return a DataFrame containing every recorded vote for the member."""
    url = BASE_URL.format(id=member_id)

    all_items = []
    page = 0
    session = requests.Session()
    headers = {"accept": "application/json"}

    while True:
        params = {"house": house, "page": page}
        resp = session.get(url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        items = data.get("items", [])
        if not items:            # empty list → no more pages
            break

        all_items.extend(items)
        page += 1
        time.sleep(PAGE_PAUSE)   # be a considerate API citizen

    # Transform to a tidy 2-D structure
    records = []
    for item in all_items:
        v = item["value"]
        # Map the boolean fields to a human-readable vote label
        if v["actedAsTeller"]:
            vote_lbl = "Teller (Aye)" if v["inAffirmativeLobby"] else "Teller (No)"
        else:
            vote_lbl = "Aye" if v["inAffirmativeLobby"] else "No"

        this_record = {
            "title": v["title"],
            # Convert ISO 8601 -> timezone-aware datetime
            "date": v["date"],
            "vote": vote_lbl,
            "division_id": v["id"],
            "divisionNumber": v["divisionNumber"],
            "numberInFavour": v["numberInFavour"],
            "numberAgainst": v["numberAgainst"],
        }
        print(this_record['title'])
        records.append(
            this_record
        )

    df = pd.DataFrame.from_records(records)
    df.sort_values("date", ascending=False, inplace=True)  # newest first
    df.reset_index(drop=True, inplace=True)
    return df


if __name__ == "__main__":
    votes_df = fetch_votes()
    print(votes_df.head())        # quick visual check
    votes_df.to_csv("diane_abbott_votes.csv", index=False)
    # Or persist with Parquet/Feather for faster I/O

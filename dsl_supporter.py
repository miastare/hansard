import pickle
import pandas as pd
from typing import Dict, Any

with open("./output/uk_parliament.pkl", "rb") as fh:
    MEMBER_LOOKUP_DATA: Dict[int, Dict[str, Any]] = pickle.load(fh)

static_cols   = ["member_id","name","gender","current_house",
                 "constituency","currentParty","isCurrentMember",
                 "nContributions"]
lookup_static = (pd
    .DataFrame.from_dict(MEMBER_LOOKUP_DATA, orient="index")
    .reset_index(names="member_id")[static_cols])

# long table for time-varying party affiliation
rows = []
for mid, blob in MEMBER_LOOKUP_DATA.items():
    for aff in blob["partyAffiliations"]:
        rows.append({
            "member_id": mid,
            "party": aff["party"],
            "start":  aff["startDate"],
            "end":    aff["endDate"] or "9999-12-31"
        })
party_affil = pd.DataFrame(rows)


dfs = {
    'interest_df' : pd.read_csv('./output/all_interest_df.csv'),
    'written_questions_df' : pd.read_csv('./output/written_questions_2024.csv'),
    'written_statements_df' : pd.read_csv('./output/written_statements_2024.csv'),
    'divisions_df' : pd.read_csv('./output/divisions_2024.csv'),
    "member_lookup": lookup_static,
    "member_party_history": party_affil,
}
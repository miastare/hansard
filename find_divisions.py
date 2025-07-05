import re
from typing import Dict, Tuple

import numpy as np
import pandas as pd
import random

# ---------------------------------------------------------------------------
# 📁  DATA SOURCES
# ---------------------------------------------------------------------------
# These two CSVs are expected to contain:
#   con_df – a flat list of contributions, at least the columns:
#            debate_id (int), value (str), name, gender, party,
#            age_proxy, constituency, context_url
#   div_df – division metadata with at least the columns:
#            debate_id (int), division_id, division_date_time,
#            division_title, ayes, noes, context_url
# ---------------------------------------------------------------------------
#con_df_raw = pd.read_csv("./output/contributions_2024.csv")
div_df = pd.read_csv("./output/divisions_2024.csv")
con_df = pd.read_csv(
    "./output/contributions_filtered_2024.csv"
)  #con_df_raw.loc[con_df_raw['debate_id'].isin(div_df['debate_id'])]

CONTRIB_COLS = [
    "debate_id",
    "value",
    "name",
    "gender",
    "party",
    "age_proxy",
    "constituency",
    "context_url",
]

DIV_COLS = [
    "division_id",
    "division_date_time",
    "division_title",
    "ayes",
    "noes",
    "context_url",
    "debate_id",
    "location"  #e.g. 'Commons Chamber'
]

empty_dicts = ({}, {})

# ---------------------------------------------------------------------------
# 🧮  DSL → BOOL SERIES
# ---------------------------------------------------------------------------


def _eval_node(node: Dict, df: pd.DataFrame) -> pd.Series:
    """Recursively evaluate *node* against *df* and return a boolean Series.

    The supported grammar is intentionally small and mirrors the behaviour of
    the fully‑featured DSL engine used elsewhere in the codebase (see
    ``dsl_engine.py``).

    Logical ops
    -----------
    - **and** / **or** expects ``args`` list of sub‑nodes
    - **not**      expects a single sub‑node under ``args`` (dict)

    Leaf ops
    --------
    - **contains** → case‑*sensitive* substring search
    - **icontains** → case‑insensitive substring search
    - **regex**   → Python regex (flags=0)

    Leaf nodes must have the structure::
        {
            "op": "contains|icontains|regex",
            "args": {"pattern": "…", "column": "value"}
        }

    Only the *value* column is permitted for now; this keeps the surface area
    small and avoids arbitrary column selection.
    """
    op = node.get("op")

    # ───────────────────── logical operators ──────────────────────
    if op in {"and", "or"}:
        if not isinstance(node.get("args"), (list, tuple)):
            raise ValueError(f"'{op}' expects a list under 'args'.")
        parts = [_eval_node(child, df) for child in node["args"]]
        return np.logical_and.reduce(
            parts) if op == "and" else np.logical_or.reduce(parts)

    if op == "not":
        return ~_eval_node(node["args"], df)

    # ──────────────────────── leaf operators ──────────────────────
    if op in {"contains", "icontains", "regex"}:
        leaf = node.get("args", {})
        pattern = leaf.get("pattern")
        column = leaf.get("column")
        if column != "value":
            raise ValueError(
                "Only 'value' column is allowed in this DSL variant.")
        if pattern is None:
            raise ValueError("Leaf DSL node missing 'pattern'.")

        series = df[column].fillna("").astype(str)
        if op == "regex":
            return series.str.contains(pattern, regex=True, na=False)
        # contains / icontains → use str.contains with or without case flag
        return series.str.contains(re.escape(pattern),
                                   case=(op == "contains"),
                                   na=False)

    raise ValueError(f"Unknown operation '{op}'.")


def get_boolean_series_from_dsl(dsl: Dict, df: pd.DataFrame) -> pd.Series:
    """Public helper that delegates to :pyfunc:`_eval_node` and ensures the
    output is a pandas boolean Series aligned with *df*."""
    mask = _eval_node(dsl, df)
    if not isinstance(mask, pd.Series):
        # Should never happen, but guard anyway.
        mask = pd.Series(mask, index=df.index)
    return mask


# ---------------------------------------------------------------------------
# 🔍  MAIN PUBLIC API
# ---------------------------------------------------------------------------


def find_divisions_from_dsl(dsl: Dict,
                            max_rows_per_debate: int = 3,
                            n_debates: int = 3) -> Tuple[dict, dict]:
    """Return divisions and sample contributions matching *dsl*.

    Parameters
    ----------
    dsl : dict
        A boolean expression tree following the grammar documented in
        :pyfunc:`_eval_node`.
    max_rows_per_debate : int, default 3
        How many contribution rows (at most) to keep for each debate.

    Returns
    -------
    divisions : dict
        Dictionary of divisions indexed by division_id.
    contribution_samples : dict
        Dictionary where each key is a debate_id and the value is a list of
        contribution row dictionaries.

    Example of what would be returned for `divs`:
    {<division_id_here>: {'division_date_time': '2024-10-21T21:59:00',
      'division_title': <string here>,
      'ayes': 105,
      'noes': 386,
      'context_url': <url here>},
      ...<more key-value pairs like this; every key is a division_id>
      }

    Example of what would be returned for contribs:
    {
    <debate_id_here> : [
    {'value': 'debate contribution here; truncated to 300 characters',
       'name': 'Amanda Martin',
       'gender': 'F',
       'party': 'Labour',
       'age_proxy': 0.2,
       'constituency': 'Portsmouth North',
       'context_url': <url here>}
        ]

    """

    def clean_text_for_http(text):
        """Clean text to ensure it's safe for HTTP responses."""
        if text is None:
            return ""
        # Convert to string and replace problematic Unicode characters
        text = str(text)
        # Replace em dash and other problematic characters
        text = text.replace('\u2014', '-')  # em dash
        text = text.replace('\u2013', '-')  # en dash
        text = text.replace('\u2018', "'")  # left single quote
        text = text.replace('\u2019', "'")  # right single quote
        text = text.replace('\u201c', '"')  # left double quote
        text = text.replace('\u201d', '"')  # right double quote
        # Encode to Latin-1 compatible characters, replacing any remaining problematic ones
        text = text.encode('ascii', 'replace').decode('ascii')
        return text

    # 1️⃣  Evaluate the DSL against *con_df*
    mask = get_boolean_series_from_dsl(dsl, con_df)
    filtered = con_df.loc[mask, CONTRIB_COLS]

    # 2️⃣  Short‑circuit if no match
    relevant_debates = filtered["debate_id"].unique()
    if len(relevant_debates) == 0:
        return empty_dicts

    relevant_debates_sample = random.sample(list(relevant_debates),
                                            k=n_debates)

    # 3️⃣  Look up divisions tied to the debates we just found
    divisions_df = (div_df.loc[
        div_df["debate_id"].isin(relevant_debates_sample),
        DIV_COLS,
    ].reset_index(drop=True))

    # Clean text fields in divisions
    for text_col in ['division_title', 'context_url']:
        if text_col in divisions_df.columns:
            divisions_df[text_col] = divisions_df[text_col].apply(
                clean_text_for_http)

    divisions = divisions_df.set_index('division_id').to_dict(orient='index')

    # 4️⃣  Pull contribution samples (≤ *max_rows_per_debate* per debate)
    contribution_samples_df = (filtered.loc[filtered['debate_id'].isin(
        list(relevant_debates_sample))].groupby(
            "debate_id",
            group_keys=False).head(max_rows_per_debate).reset_index(drop=True))

    # Clean text fields in contributions
    contribution_samples_df['value'] = contribution_samples_df['value'].apply(
        lambda x: clean_text_for_http(x)[0:300])

    for text_col in ['name', 'party', 'constituency', 'context_url']:
        if text_col in contribution_samples_df.columns:
            contribution_samples_df[text_col] = contribution_samples_df[
                text_col].apply(clean_text_for_http)

    contribution_samples = {
        debate_id: group.drop(columns="debate_id").to_dict(orient="records")
        for debate_id, group in contribution_samples_df.groupby("debate_id")
    }

    return divisions, contribution_samples


def find_division_from_id_and_house(division_id, house):
    '''
    Example of what gets returned:
    {'division_id': 1698,
     'division_date_time': '2024-01-09T16:32:00',
     'division_title': 'Opposition Day: NHS Dentistry',
     'ayes': 191,
     'noes': 299,
     'context_url': 'https://hansard.parliament.uk/Commons/2024-01-09/debates/21A6D6D0-27DD-4AD6-BA98-6176B0864827/nhs-dentistry#division-49230'
     }
    '''
    print(f"FIND_DIVISION: Looking for division_id={division_id} (type: {type(division_id)}) in house={house}")

    def clean_text_for_http(text):
        """Clean text to ensure it's safe for HTTP responses."""
        if text is None:
            return ""
        text = str(text)
        text = text.replace('\u2014', '-')  # em dash
        text = text.replace('\u2013', '-')  # en dash
        text = text.replace('\u2018', "'")  # left single quote
        text = text.replace('\u2019', "'")  # right single quote
        text = text.replace('\u201c', '"')  # left double quote
        text = text.replace('\u201d', '"')  # right double quote
        text = text.encode('ascii', 'replace').decode('ascii')
        return text

    # Convert division_id to int if it's a string
    try:
        division_id = int(division_id)
        print(f"FIND_DIVISION: Converted division_id to int: {division_id}")
    except (ValueError, TypeError):
        print(f"FIND_DIVISION ERROR: Could not convert division_id to int: {division_id}")
        return {"error": f"Invalid division_id: {division_id}"}

    if house == 1:
        filter_house = 'Commons Chamber'
    else:
        filter_house = 'Lords Chamber'
    
    print(f"FIND_DIVISION: Filtering for house='{filter_house}'")
    print(f"FIND_DIVISION: Available columns in div_df: {list(div_df.columns)}")
    print(f"FIND_DIVISION: div_df shape: {div_df.shape}")
    
    # Check if the division exists
    matching_divisions = div_df.query("division_id == @division_id and location == @filter_house")
    print(f"FIND_DIVISION: Found {len(matching_divisions)} matching divisions")
    
    if len(matching_divisions) == 0:
        print(f"FIND_DIVISION ERROR: No division found for division_id={division_id} in house='{filter_house}'")
        return {"error": f"Division {division_id} not found in {filter_house}"}
    
    found_div = matching_divisions.iloc[0]
    print(f"FIND_DIVISION: Found division: {found_div.to_dict()}")
    
    try:
        result = {
            'division_id': int(found_div['division_id']),
            'division_date_time': str(found_div['division_date_time']),
            'division_title': clean_text_for_http(found_div['division_title']),
            'ayes': int(found_div['ayes']) if pd.notna(found_div['ayes']) else 0,
            'noes': int(found_div['noes']) if pd.notna(found_div['noes']) else 0,
            'context_url': str(found_div['context_url']) if pd.notna(found_div['context_url']) else ""
        }
        print(f"FIND_DIVISION: Returning result: {result}")
        return result
    except Exception as e:
        print(f"FIND_DIVISION ERROR: Error processing division data: {str(e)}")
        return {"error": f"Error processing division data: {str(e)}"}_id & location == @filter_house")[DIV_COLS]

    result = found_div.iloc[0].to_dict()

    # Clean text fields
    for key, value in result.items():
        if isinstance(value, str):
            result[key] = clean_text_for_http(value)

    return result


# ---------------------------------------------------------------------------
# 🧪  __main__  (ad‑hoc test)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Tiny smoke test – replace with real patterns as needed.
    toy_dsl = {
        "op":
        "and",
        "args": [
            {
                "op": "contains",
                "args": {
                    "pattern": "menopause",
                    "column": "value"
                },
            },
            {
                "op": "not",
                "args": {
                    "op": "icontains",
                    "args": {
                        "pattern": "period",
                        "column": "value"
                    },
                },
            },
        ],
    }

    divs, contribs = find_divisions_from_dsl(toy_dsl)
    print("Divisions →", len(divs))
    print("Sample contributions →", len(contribs))

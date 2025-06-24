"""
Drop-in replacement for your Hansard interaction detector.
Adds chair-aware filtering and broader regex support.
    • Skip analysing turns by the Speaker / Deputy Speaker
    • Ignore any “Order!” etc. uttered by the chair when scanning ± window
    • Catch more variants of “Will the Minister give way…?”
    • Catch “I will certainly give way / I give way to …”
Each contribution dict must now carry:
    "speaker"  : <unique MP ID or name>,
    "body"     : <plain-text contribution>,
    "is_chair" : True if Speaker or Deputy Speaker, else False
"""
import re
from typing import List, Dict

# ---------------- Pattern library ---------------------------------- #
INTERRUPTION_REQUEST_PATTERNS = [
    # classical + broader “give way” formulas
    r"will (?:my |the )?(?:rt\.?|right)?\s*hon(?:ou?rable)?\.?\s*"
    r"(?:friend|gentleman|lady|member|minister)\b.*?\bgive way",
    r"will you give way",
    # points of order
    r"\bon a point of order\b",
    # editors’ stage direction when a Member rises
    r"\brose—\b",
]

ACCEPT_PATTERNS = [
    # allow up to three filler words between modal and “give way”
    r"\bi (?:will|shall|’ll|'ll|am happy to|am content to|gladly)"
    r"(?:\s+\w+){0,3}\s+give way\b",
    r"\bgive way, of course\b",
    r"\bi (?:am|’m|'m) (?:perfectly )?prepared to give way\b",
    r"\bi give way to\b",  # “I give way to the hon. Lady…”
]
DECLINE_PATTERNS = [
    r"\bi (?:will|shall|’ll|'ll) not give way\b",
    r"\bi (?:cannot|can't|won't) give way\b",
    r"\bi am not giving way\b",
    r"\bi (?:am|'m|’m) afraid i am not giving way\b",
]

HECKLE_PATTERNS = [
    r"\(.*?interruption.*?\)",
    r"\(hon\.? members?: [^\)]*?\)",
    r"\(laughter[^\)]*?\)",
    r"\(groans?[^\)]*?\)",
    # standalone “Order!” or “Order.” but not “in order to…”
    r"(?:(?<=^)|(?<=\())Order[!\.]",
    r"\bshame[!,\.]",
    r"\bresign[!,\.]",
]

APPLAUSE_PATTERNS = [
    r"\(hon\.? members?: hear, hear\.?\)",
    r"\(hear, hear\.?\)",
    r"\(cheers?[^\)]*?\)",
    r"\(applause[^\)]*?\)",
]

# Pre-compile for speed (case-insensitive, dot matches newline)
FLAGS = re.I | re.S
INTERRUPTION_REQUEST_REGEXES = [re.compile(p, FLAGS) for p in INTERRUPTION_REQUEST_PATTERNS]
ACCEPT_REGEXES = [re.compile(p, FLAGS) for p in ACCEPT_PATTERNS]
DECLINE_REGEXES = [re.compile(p, FLAGS) for p in DECLINE_PATTERNS]
HECKLE_REGEXES = [re.compile(p, FLAGS) for p in HECKLE_PATTERNS]
APPLAUSE_REGEXES = [re.compile(p, FLAGS) for p in APPLAUSE_PATTERNS]

# keys for convenience when zeroing out chair turns
_RETURN_KEYS = (
    "interrupted_other",
    "were_interrupted",
    "accepted_interruption",
    "declined_interruption",
    "was_heckled",
    "received_applause",
)


# ---------------- Core detector ------------------------------------ #
def assess_parliamentary_turn(
    contributions: List[Dict],
    idx: int,
    window: int = 5,
    chair_key: str = "is_chair",
) -> Dict[str, bool]:
    """
    Analyse a ±window slice centred on contributions[idx].
    Skips turns where contributions[*][chair_key] is True.

    Returns a dict with the six boolean flags listed in _RETURN_KEYS.
    """
    cur = contributions[idx]

    # if the current turn is the Speaker/Deputy we short-circuit
    if cur.get(chair_key):
        return {k: False for k in _RETURN_KEYS}

    cur_speaker = cur["speaker"]
    cur_body = cur["body"]

    # Collect windows, filtering out chair contributions
    start = max(0, idx - window)
    end = min(len(contributions), idx + window + 1)
    prev_cons = [
        c for c in contributions[start:idx] if not c.get(chair_key)
    ]
    next_cons = [
        c for c in contributions[idx + 1 : end] if not c.get(chair_key)
    ]

    # --- 1) Did THEY try to interrupt someone else? --------------------
    interrupted_other = any(r.search(cur_body) for r in INTERRUPTION_REQUEST_REGEXES)

    # --- 2) Were THEY interrupted by someone else? ---------------------
    were_interrupted = any(
        r.search(c["body"]) for c in prev_cons + next_cons
        if c["speaker"] != cur_speaker
        for r in INTERRUPTION_REQUEST_REGEXES
    )

    # --- 3) Acceptance / refusal of interruption -----------------------
    own_follow_ups = [
        c["body"] for c in next_cons if c["speaker"] == cur_speaker
    ][:window]
    accept_texts = [cur_body] + own_follow_ups

    accepted_interruption = any(
        r.search(txt) for txt in accept_texts for r in ACCEPT_REGEXES
    )
    declined_interruption = (
        any(r.search(txt) for txt in accept_texts for r in DECLINE_REGEXES)
        and not accepted_interruption
    )

    # --- 4) Heckling & applause inside the speech ----------------------
    was_heckled = any(r.search(cur_body) for r in HECKLE_REGEXES)
    received_applause = any(r.search(cur_body) for r in APPLAUSE_REGEXES)

    return {
        "interrupted_other": interrupted_other,
        "were_interrupted": were_interrupted,
        "accepted_interruption": accepted_interruption,
        "declined_interruption": declined_interruption,
        "was_heckled": was_heckled,
        "received_applause": received_applause,
    }
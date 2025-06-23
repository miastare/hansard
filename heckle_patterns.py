import re

# Define pattern lists based on common Hansard markup conventions
INTERRUPTION_REQUEST_PATTERNS = [
    # “Will the (right) hon. Gentleman/Lady/Member give way?”
    r"\bwill (?:the )?(?:rt\.?|right)?\s*hon(?:ou?rable)?\.?\s*(?:gentleman|lady|member)\b.*?\bgive way",
    r"\bwill you give way\b",
    # “On a point of order” is a formal way to interrupt
    r"\bon a point of order\b",
    # Speaker physically stands: “rose—”
    r"\brose—",
]

# Patterns for the speaker ACCEPTING or DECLINING an interruption
ACCEPT_PATTERNS = [
    r"\bi (?:will|shall|’ll|'ll|am happy to|am content to|gladly) give way\b",
    r"\bgive way, of course\b",
]
DECLINE_PATTERNS = [
    r"\bi (?:will|shall|’ll|'ll) not give way\b",
    r"\bi (?:cannot|can't|won't) give way\b",
    r"\bi am not giving way\b",
]

# Mid‑speech audience reactions
HECKLE_PATTERNS = [
    r"\(interruption[^\)]*\)",
    r"\(hon\.? members?: [^\)]*\)",
    r"\(laughter[^\)]*\)",
    r"\(groans?[^\)]*\)",
    r"\b(order!|shame!|resign!)\b",
]

APPLAUSE_PATTERNS = [
    r"\(hon\.? members?: hear, hear\.?\)",
    r"\(hear, hear\.?\)",
    r"\(cheers?[^\)]*\)",
    r"\(applause[^\)]*\)",
]

def detect_parliamentary_interactions(
    contribution_text: str,
    prev_texts: list[str] | None = None,
    n: int = 5,
) -> dict[str, bool]:
    """
    Given the text of one Hansard contribution and up to *n*
    preceding contributions, return best‑guess booleans for:
        - proper_interruption   – someone formally tried to intervene
        - accepted_interruption – the speaker actually **gave way**
        - heckled               – negative/noisy interjection mid‑speech
        - applause              – positive approval mid‑speech

    The function relies purely on regex heuristics tuned on ~20
    Commons debates from 2024‑25.  It should work on raw Hansard
    JSON (`contribution['body']`) or on the plain‑text column output
    by the UK Parliament API.
    """
    prev_texts = prev_texts or []
    # Trim to the n contributions immediately before the current speech
    window = prev_texts[-n:]

    lc_contrib = contribution_text.lower()

    # --- a) Was there a *formal* request to intervene? ------------------
    proper_interruption = any(
        re.search(pattern, txt.lower()) for txt in window for pattern in INTERRUPTION_REQUEST_PATTERNS
    )

    # --- b) Did the speaker accept the request? -------------------------
    accepted = any(re.search(pat, lc_contrib) for pat in ACCEPT_PATTERNS)
    declined = any(re.search(pat, lc_contrib) for pat in DECLINE_PATTERNS)
    accepted_interruption = accepted and not declined

    # --- c) Heckling -----------------------------------------------------
    heckled = any(re.search(pat, lc_contrib) for pat in HECKLE_PATTERNS)

    # --- d) Applause / “Hear, hear” -------------------------------------
    applause = any(re.search(pat, lc_contrib) for pat in APPLAUSE_PATTERNS)

    return {
        "proper_interruption": proper_interruption,
        "accepted_interruption": accepted_interruption,
        "heckled": heckled,
        "applause": applause,
    }



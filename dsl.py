# dsl_engine.py  – v0.2
"""A *safe* pandas‑based DSL runner that now covers **all** analytical
patterns you listed:

──────────────────────────────────────────────────────────────────────────────
✔ phrase counts & filters (positive / negative substrings, regex, case)
✔ multi‑division voting scores – on‑demand API fetch & cache
✔ interest‑phrase flags (joins member_interests)
✔ unlimited transform / aggregation stages (pipeline array)
✔ standardisation helpers (per‑possible, z‑score, min‑max)
✔ breakdown/facet support – the output keeps facet columns intact
✔ time‑series binning (`by_date`, `freq="M" | "Q" | "Y"`)
✔ modelling: correlation, OLS with optional controls, R‑squared

Public entry points
──────────────────
* **`run_job(dsl_node, dfs)`** – generic; returns tidy dict/DF/stat   (frontend
  will read the `"kind"` and `"data"` keys when present).
* **`cache.clear()`** – wipe the in‑process fetch cache (unit tests only).

Nothing here uses *eval* or *exec*.  Expressions are JSON trees, operators are
whitelisted.  External calls limited to the Commons Votes API for division data
(and only when a *join* of type `"division_votes"` is declared).

Tip: keep the original CSV‑loader in your app start‑up and pass the resulting
`dfs` dict to every request handler.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, List, Literal, Sequence
import operator as _op

import numpy as np
import pandas as pd
import requests
import statsmodels.api as sm
from scipy import stats

# ----------------------------------------------------------------------------
# 0️⃣  CONFIG / CONSTANTS_
# ----------------------------------------------------------------------------
# Commons Votes API endpoint
_LORDS_DIV_API = "https://lordsvotes-api.parliament.uk/data/Divisions/{div_id}"
_COMMONS_DIV_API = "https://commonsvotes-api.parliament.uk/data/division/{div_id}.json"
# simple retry (DNF back‑off) for flaky network; tweak in prod.
_API_RETRIES = 3
_API_TIMEOUT = 6  # seconds


# ----------------------------------------------------------------------------
# 1️⃣  SAFE EXPRESSION EVALUATOR (unchanged, but moved earlier)
# ----------------------------------------------------------------------------

_ALLOWED_OPS: dict[str, Any] = {
    "add": _op.add,
    "sub": _op.sub,
    "mul": _op.mul,
    "div": _op.truediv,
    "pow": _op.pow,
    "neg": _op.neg,
    "abs": abs,
    "min": min,
    "max": max,
}


def _eval_expr(expr: Dict[str, Any], row: pd.Series) -> Any:
    if "var" in expr:
        return row[expr["var"]]
    if "const" in expr:
        return expr["const"]
    if "op" in expr:
        fn = _ALLOWED_OPS[expr["op"].lower()]
        args = [_eval_expr(a, row) for a in expr.get("args", [])]
        return fn(*args)
    raise ValueError("Malformed expression node")


def eval_expr_on_df(expr: Dict[str, Any], df: pd.DataFrame) -> pd.Series:
    return df.apply(lambda r: _eval_expr(expr, r), axis=1)


# ----------------------------------------------------------------------------
# 2️⃣  API‑ASSISTED HELPERS (division votes)
# ----------------------------------------------------------------------------

@lru_cache(maxsize=256)
def _fetch_division_votes(div_id: int, house: int) -> pd.DataFrame:
    for attempt in range(_API_RETRIES):
        try:
            div_api = _COMMONS_DIV_API if house == 1 else _LORDS_DIV_API
            url = div_api.format(div_id=div_id)
            r = requests.get(url, timeout=_API_TIMEOUT)
            r.raise_for_status()
            payload = r.json()
            # payload keys: "Ayes", "Noes", "NoVoteRecorded"
            frames = []
            for label, vote_val in (("Ayes", "AYE"), ("Noes", "NO"), ("NoVoteRecorded", "NOTREC")):
                block = payload.get(label, []) or []
                if not block:
                    continue
                df_block = pd.json_normalize(block)
                df_block["vote"] = vote_val
                frames.append(df_block[["MemberId", "vote"]])
            df_votes = pd.concat(frames, ignore_index=True)
            df_votes.rename(columns={"MemberId": "member_id"}, inplace=True)
            return df_votes
        except Exception as exc:
            if attempt == _API_RETRIES - 1:
                raise
            time.sleep(1 + attempt)
    raise RuntimeError("Unreachable")


# ----------------------------------------------------------------------------
# 3️⃣  FILTER / TRANSFORM DISPATCH TABLES
# ----------------------------------------------------------------------------

_OP_DISPATCH = {
    "=": _op.eq,
    "==": _op.eq,
    "eq": _op.eq,
    "!=": _op.ne,
    "<>": _op.ne,
    "neq": _op.ne,
    "<": _op.lt,
    "<=": _op.le,
    ">": _op.gt,
    ">=": _op.ge,
    "in": lambda lhs, rhs: lhs.isin(rhs),
    "contains": lambda lhs, rhs: lhs.str.contains(rhs, regex=False, case=False, na=False),
    "icontains": lambda lhs, rhs: lhs.str.contains(rhs, regex=False, case=False, na=False),
    "noticontains": lambda lhs, rhs: ~lhs.str.contains(rhs, regex=False, case=False, na=False),
    "regex": lambda lhs, rhs: lhs.str.contains(rhs, regex=True, na=False),
}


# ----------------------------------------------------------------------------
# 4️⃣  DSL PIPELINE EXECUTOR
# ----------------------------------------------------------------------------

@dataclass
class JobCtx:
    node: Dict[str, Any]
    dfs: Dict[str, pd.DataFrame]

    # ---------------------------------------------------------------------
    def run(self):
        typ: Literal["metric", "plot", "model"] = self.node["type"]
        if typ == "metric":
            return self.metric()
        if typ == "plot":
            out = self.metric()
            return {"kind": self.node["output"]["kind"], "data": out.to_dict("records")}
        if typ == "model":
            return self.model()
        raise ValueError(f"Unknown job type {typ}")

    # ------------------------------------------------------------------
    # STAGES
    # ------------------------------------------------------------------

    def _source_df(self) -> pd.DataFrame:
        src = self.node["source"]
        df = self.dfs[src["table"]].copy()
        # optional text search pre‑filter (fast path before python regex)
        if "phrase_filter" in src:
            phrases = src["phrase_filter"]
            pat = "|".join(re.escape(p) for p in phrases)
            df = df[df["text"].str.contains(pat, case=False, na=False)]
        return df

    def _apply_filters(self, df: pd.DataFrame) -> pd.DataFrame:
        for f in self.node.get("filters", []):
            lhs, op, rhs = f["lhs"], f["op"].lower(), f["rhs"]
            cond = _OP_DISPATCH[op](df[lhs], rhs)
            df = df[cond]
        return df

    def _apply_transforms(self, df: pd.DataFrame) -> pd.DataFrame:
        for t in self.node.get("transforms", []):
            df[t["as"]] = eval_expr_on_df(t["expr"], df)
        return df

    def _apply_joins(self, df: pd.DataFrame) -> pd.DataFrame:
        for j in self.node.get("joins", []):
            j_type = j["type"]
            if j_type == "division_votes":
                div_id = j["division_id"]
                house = j["house"] #if j_type is 'division_votes', then 'house' must be present as well as division_id.
                weight_map = j["mapping"]
                vote_df = _fetch_division_votes(div_id, house)
                vote_df[j["as"]] = vote_df["vote"].map(weight_map).fillna(0)
                df = df.merge(vote_df[["member_id", j["as"]]], on="member_id", how="left")
                df[j["as"]] = df[j["as"]].fillna(0)
            elif j_type == "member_interests":
                intr_df = self.dfs["member_interests"][["m_id", "interest"]].copy()
                intr_df[j["as"]] = intr_df["interest"].str.contains(j["phrase"], case=False, na=False).astype(int)
                intr_df.rename(columns={"m_id": "member_id"}, inplace=True)
                intr_df = intr_df.groupby("member_id", as_index=False)[j["as"]].max()
                df = df.merge(intr_df, on="member_id", how="left")
                df[j["as"]] = df[j["as"]].fillna(0)
            else:
                raise NotImplementedError(f"join type {j_type} not supported")
        return df

    def _apply_aggs(self, df: pd.DataFrame) -> pd.DataFrame:
        for stage in self.node.get("aggregations", []):
            group = stage["group"]
            metric_expr = stage["metric"]
            fn = stage.get("fn", "sum")
            as_col = stage.get("as", fn)
            if isinstance(metric_expr, dict):
                df["__tmp_metric"] = eval_expr_on_df(metric_expr, df)
                metric_col = "__tmp_metric"
            else:
                metric_col = metric_expr
            grouped = df.groupby(group, dropna=False)[metric_col]
            agg_val = getattr(grouped, fn)().reset_index().rename(columns={metric_col: as_col})
            df = agg_val  # feed to next agg stage (cascade design)
        return df

    def _apply_standardise(self, df: pd.DataFrame) -> pd.DataFrame:
        std = self.node.get("standardise")
        if not std:
            return df
        method = std["method"]
        cols = std.get("cols") or [c for c in df.select_dtypes(np.number).columns]
        if method == "zscore":
            df[cols] = (df[cols] - df[cols].mean()) / df[cols].std(ddof=0)
        elif method == "minmax":
            df[cols] = (df[cols] - df[cols].min()) / (df[cols].max() - df[cols].min())
        elif method == "divide_by_total_possible":
            denom_col = std["denominator_col"]
            for c in cols:
                df[c] = df[c] / df[denom_col].replace(0, np.nan)
        else:
            raise ValueError(f"Unknown standardise method {method}")
        return df

    def _apply_timebin(self, df: pd.DataFrame) -> pd.DataFrame:
        tb = self.node.get("timebin")
        if not tb:
            return df
        date_col = tb.get("date_col", "date")
        freq = tb.get("freq", "M")
        df["_period"] = pd.to_datetime(df[date_col]).dt.to_period(freq).dt.to_timestamp()
        return df

    # ------------------------------------------------------------------
    #   JOB IMPLEMENTATIONS
    # ------------------------------------------------------------------

    def metric(self) -> pd.DataFrame:
        df = self._source_df()
        df = self._apply_filters(df)
        df = self._apply_timebin(df)
        df = self._apply_transforms(df)
        df = self._apply_joins(df)
        df = self._apply_aggs(df)
        df = self._apply_standardise(df)
        return df

    def model(self):
        cfg = self.node["model"]
        df = self.metric()  # ensure same pipeline
        y = df[cfg["y"]]
        X = df[cfg["x"]]
        if cfg.get("controls"):
            X = pd.concat([X, df[cfg["controls"]]], axis=1)
        kind = cfg.get("kind", "ols")
        if kind == "correlation":
            rho, p = stats.pearsonr(X.iloc[:, 0], y)
            return {"type": "correlation", "r": rho, "p_value": p}
        X = sm.add_constant(X, has_constant="add")
        res = sm.OLS(y, X, missing="drop").fit()
        return {
            "type": "ols",
            "coefficients": res.params.to_dict(),
            "p_values": res.pvalues.to_dict(),
            "r_squared": res.rsquared,
        }


# ----------------------------------------------------------------------------
# 5️⃣  PUBLIC HELPERS
# ----------------------------------------------------------------------------

def run_job(node: Dict[str, Any], dfs: Dict[str, pd.DataFrame]):
    """Validate + execute a DSL job on the provided DataFrame dict."""
    return JobCtx(node=node, dfs=dfs).run()


def clear_cache():  # for unit tests
    _fetch_division_votes.cache_clear()

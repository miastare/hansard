# dsl_engine.py – v1.0 **PIPELINE REVAMP**
"""A *node‑graph* DSL executor that can express virtually any pandas workflow.

Why the rewrite?  We now support analyses that require **multiple source
frames, arbitrary joins, chained transformations, custom metrics and statistical
tests**.  The old single‑blob JSON was hitting a wall.

──────────────────────────────────────────────────────────────────────────────
🏗  HOW THE NEW DSL LOOKS
──────────────────────────────────────────────────────────────────────────────

```jsonc
{
  "steps": [
    { "id": "contrib",  "op": "source", "table": "mv_debate_contrib_flat" },
    { "id": "interest", "op": "source", "table": "member_interests" },

    { "id": "f1", "op": "filter", "input": "contrib",
      "conditions": [
        {"lhs": "text", "op": "regex", "rhs": "Israel|jewish state|Tel-Aviv"}
      ]},

    { "id": "m1", "op": "mutate", "input": "f1",
      "cols": {"has_israel": {"const": 1}} },

    { "id": "agg1", "op": "aggregate", "input": "m1",
      "group": ["member_id", "gender", "current_party"],
      "metrics": {"n_mentions_israel": {"fn": "sum", "col": "has_israel"}} },

    { "id": "f2", "op": "filter", "input": "interest",
      "conditions": [{"lhs": "interest", "op": "noticontains", "rhs": "botswana"}]},

    { "id": "m2", "op": "mutate", "input": "f2",
      "cols": {"mentions_rent": {
        "op": "and", "args": [
          {"expr": {"lhs": "interest", "op": "icontains", "rhs": "rental income"}},
          {"expr": {"lhs": "category", "op": "=", "rhs": "6"}}
        ]}}},

    { "id": "agg2", "op": "aggregate", "input": "m2",
      "group": ["member_id"],
      "metrics": {"n_mentions_rent": {"fn": "sum", "col": "mentions_rent"}} },

    { "id": "votes", "op": "division_votes",
      "division_ids": [9,10], "house": 1,
      "weights": {"AYE": 1, "NO": -1, "NOTREC": 0}},

    { "id": "j", "op": "join", "how": "outer",
      "on": ["member_id"],
      "inputs": ["agg1", "agg2", "votes"]},

    { "id": "metrics", "op": "mutate", "input": "j",
      "cols": {
        "metric1": {"op": "add", "args": [
          {"var": "n_mentions_israel"}, {"var": "division_9"}]},
        "metric2": {"op": "sub", "args": [
          {"var": "division_10"}, {"var": "n_mentions_rent"}]}
      }},

    { "id": "ttest", "op": "stat_test", "test": "t",
      "input": "metrics", "group_col": "gender", "value_col": "metric1"},

    { "id": "mapdata", "op": "aggregate", "input": "metrics",
      "group": ["constituency"],
      "metrics": {"metric1": {"fn": "mean", "col": "metric1"},
                  "metric2": {"fn": "mean", "col": "metric2"}}}
  ],
  "return": ["ttest", "mapdata"]
}
```

* Every **step** produces a named DataFrame or value that later steps can use.
* The runtime executes steps top‑to‑bottom, memoising each output.
* `return` lists which artefacts to send back to the client (could be one or
  many for dashboards with several plots).

──────────────────────────────────────────────────────────────────────────────
🔑  SUPPORTED OPS
──────────────────────────────────────────────────────────────────────────────

| op              | Purpose                                                            |
|-----------------|--------------------------------------------------------------------|
| `source`        | Load a raw DataFrame from `dfs`                                    |
| `filter`        | Keep rows where **all** conditions are true                        |
| `mutate`        | Add/replace columns from expression trees                          |
| `aggregate`     | Group‑by + summarise (supports multiple metrics at once)           |
| `join`          | Merge an *array* of inputs on key cols (`how`: inner/left/outer)    |
| `division_votes`| Pull votes for 1‑n divisions -> wide DF (`division_123` columns)   |
| `stat_test`     | `t` (2‑sample), `pearson`, `ols` (via statsmodels)                 |

Everything is still *safe*: expressions use the same small arithmetic/boolean
language as before; the only external call is the votes API fetcher.

──────────────────────────────────────────────────────────────────────────────
🛠️  RUNNING THE PIPELINE
──────────────────────────────────────────────────────────────────────────────

```python
from dsl_engine import run_pipeline  # new name
out = run_pipeline(dsl_json, dfs)
```

It returns a dict keyed by the id(s) listed in `return`.  For the example
above you’d get:

```json
{
  "ttest": {"t": 2.04, "p": 0.042, "n1": 102, "n2": 134},
  "mapdata": [ {"constituency": "Hackney North…", "metric1": 1.3, "metric2": -0.2}, … ]
}
```

──────────────────────────────────────────────────────────────────────────────
💾  IMPLEMENTATION NOTES
──────────────────────────────────────────────────────────────────────────────
* Steps are executed lazily and cached in a dict `env[id]` so you can reference
  the same intermediate many times without recomputation.
* The core execution loop is ~150 lines; each `op` has its own helper.
* New ops are trivial: write a function that takes `**params` & `env` and
  returns a DataFrame or dict.

──────────────────────────────────────────────────────────────────────────────
Code (trimmed docstring ends here) – scroll down for full implementation.
"""

from __future__ import annotations

import re, time, operator as _op
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, Iterable, Literal, List

import numpy as np
import pandas as pd
import requests
import statsmodels.api as sm
from scipy import stats
from dsl_supporter import dfs

# ---------------------------------------------------------------------------
# 0️⃣  CONFIG
# ---------------------------------------------------------------------------
_COMMONS_API = "https://commonsvotes-api.parliament.uk/data/division/{id}.json"
_LORDS_API   = "https://lordsvotes-api.parliament.uk/data/Divisions/{id}"
_API_RETRIES = 3; _TIMEOUT = 6

# ---------------------------------------------------------------------------
# 1️⃣  SAFE EXPR  (data‑column arithmetic)
# ---------------------------------------------------------------------------
_ALLOWED = {
    "add": _op.add, "sub": _op.sub, "mul": _op.mul, "div": _op.truediv,
    "pow": _op.pow, "neg": _op.neg, "abs": abs, "min": min, "max": max,
    "and": lambda *a: np.logical_and.reduce(a),
    "or":  lambda *a: np.logical_or.reduce(a),
}


def _eval(node, row):
    if "var" in node:   return row[node["var"]]
    if "const" in node: return node["const"]
    if "op" in node:
        fn = _ALLOWED[node["op"]]
        return fn(*[_eval(n, row) for n in node["args"]])
    if "expr" in node:  # sub‑expr wrapper (used in mutate‑boolean)
        return _eval(node["expr"], row)
    raise ValueError("bad expr")

def eval_expr_df(expr, df):
    return df.apply(lambda r: _eval(expr, r), axis=1)

# ---------------------------------------------------------------------------
# 2️⃣  DIVISION VOTES FETCHER
# ---------------------------------------------------------------------------
@lru_cache(maxsize=256)
def _fetch_votes(div_id: int, house: int) -> pd.DataFrame:
    api = _COMMONS_API if house == 1 else _LORDS_API
    for a in range(_API_RETRIES):
        try:
            js = requests.get(api.format(id=div_id), timeout=_TIMEOUT).json()
            blocks = {"Ayes": "AYE", "Noes": "NO", "NoVoteRecorded": "NOTREC"}
            if house == 2:  # Lords payload nested
                js = js.get("Division", js)
            frames = []
            for k, lbl in blocks.items():
                block = js.get(k) or []
                if not block: continue
                df = pd.json_normalize(block)[["MemberId"]].rename(columns={"MemberId":"member_id"})
                df["vote"] = lbl; frames.append(df)
            return pd.concat(frames, ignore_index=True)
        except Exception:
            if a == _API_RETRIES-1: raise
            time.sleep(1+a)

# ---------------------------------------------------------------------------
# 2️⃣ᵇ  BOOLEAN CONDITION TREES (for complex filters)

_OP_BOOL = {
    "and": lambda *a: np.logical_and.reduce(a),
    "or":  lambda *a: np.logical_or.reduce(a),
    "not": lambda a: ~a,
}

_COMP = {
    "=": _op.eq, "==": _op.eq, "!=": _op.ne, "<": _op.lt, "<=": _op.le,
    ">": _op.gt, ">=": _op.ge,
    "icontains": lambda s, x: s.str.contains(x, case=False, na=False),
    "noticontains": lambda s, x: ~s.str.contains(x, case=False, na=False),
    "regex": lambda s, x: s.str.contains(x, regex=True, na=False),
}

def _cond_series(node: Dict[str, Any], df: pd.DataFrame) -> pd.Series:
    """Recursively evaluate a boolean expression tree on DataFrame `df` and
    return a boolean Series the same length as df."""
    if "op" in node and node["op"] in _OP_BOOL:  # logical node
        op = node["op"]
        args = [_cond_series(n, df) for n in node.get("args", [])]
        return _OP_BOOL[op](*args)
    # otherwise assume a comparison leaf
    lhs = node["lhs"]; cmp = node["op"]; rhs = node["rhs"]
    return _COMP[cmp](df[lhs], rhs)

# ---------------------------------------------------------------------------
# 3️⃣  PIPELINE EXECUTOR
# ---------------------------------------------------------------------------
@dataclass
class Runner:
    steps: List[Dict[str, Any]]
    dfs: Dict[str, pd.DataFrame]
    env: Dict[str, Any] = None

    # ------------------------------------------------ run
    def run(self, return_ids: List[str]):
        self.env = {}
        for step in self.steps:
            self.env[step["id"]] = getattr(self, f"op_{step['op']}")(step)
        return {k: self.env[k] for k in return_ids}

    # ------------------------------------------------ op impls
    def op_source(self, s):
        return self.dfs[s["table"]].copy()

    def op_filter(self, s):
        df = self.env[s["input"]]
        cond_tree = s["conditions"]
        # Back‑compat: if a list → implicit AND of list elements
        if isinstance(cond_tree, list):
            mask = np.logical_and.reduce([_cond_series(c, df) for c in cond_tree])
        else:  # dict expression tree
            mask = _cond_series(cond_tree, df)
        return df[mask].copy()

    def op_mutate(self, s):
        df = self.env[s["input"]].copy()
        for col, expr in s["cols"].items():
            df[col] = eval_expr_df(expr, df)
        return df

    def op_aggregate(self, s):
        df = self.env[s["input"]]
        by = s["group"]
        agg_dict = {}
        for name, spec in s["metrics"].items():
            fn = spec["fn"]; col = spec["col"]
            agg_dict[name] = (col, fn)
        out = df.groupby(by, dropna=False).agg(**agg_dict).reset_index()
        return out

    def op_join(self, s):
        inputs = [self.env[x] for x in s["inputs"]]
        out = inputs[0]
        for df in inputs[1:]:
            out = out.merge(df, on=s["on"], how=s.get("how", "outer"))
        return out

    def op_division_votes(self, s):
        frames = []
        for div_id in s["division_ids"]:
            votes = _fetch_votes(div_id, s["house"])
            col = f"division_{div_id}"
            votes[col] = votes["vote"].map(s["weights"]).fillna(0)
            frames.append(votes[["member_id", col]])
        out = frames[0]
        for f in frames[1:]:
            out = out.merge(f, on="member_id", how="outer")
        return out.fillna(0)

    def op_stat_test(self, s):
        df = self.env[s["input"]]
        if s["test"] == "t":
            g1, g2 = [g[s["value_col"]].values for _, g in df.groupby(df[s["group_col"]])]
            t, p = stats.ttest_ind(g1, g2, equal_var=False)
            return {"t": float(t), "p": float(p), "n1": len(g1), "n2": len(g2)}
        if s["test"] == "pearson":
            x, y = df[s["x"]], df[s["y"]]
            r, p = stats.pearsonr(x, y); return {"r": float(r), "p": float(p)}
        if s["test"] == "ols":
            y, X = df[s["y"]], sm.add_constant(df[s["X"]])
            res = sm.OLS(y, X, missing="drop").fit()
            return {"coef": res.params.to_dict(), "p": res.pvalues.to_dict(), "r2": res.rsquared}
        raise ValueError("unknown stat test")

# ---------------------------------------------------------------------------
# 4️⃣  PUBLIC ENTRY
# ---------------------------------------------------------------------------

def run_pipeline(dsl: Dict[str, Any], dfs: Dict[str, pd.DataFrame]):
    runner = Runner(steps=dsl["steps"], dfs=dfs)
    return runner.run(dsl.get("return", [dsl["steps"][-1]["id"]]))


def clear_cache():  # tests only
    _fetch_votes.cache_clear()

// DSLBuilder.js – basic CSS-only version
import React, { useState } from "react";
import classes from "./DSLBuilder.module.css";

export default function DSLBuilder() {
  const [step, setStep] = useState(1);
  const [dsl, setDsl] = useState({
    type: "plot",
    output: { kind: "bar" },
    source: { table: "mv_debate_contrib_flat" },
    filters: [],
    joins: [],
    transforms: [],
    aggregations: [],
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const updateDsl = (patch) => setDsl((old) => ({ ...old, ...patch }));

  const addFilter = () => updateDsl({ filters: [...dsl.filters, { lhs: "text", op: "icontains", rhs: "" }] });
  const addJoin = () => updateDsl({
    joins: [...dsl.joins, {
      type: "division_votes", house: 1, division_id: 0,
      mapping: { AYE: 1, NO: -1, NOTREC: 0 },
      as: `vote_${dsl.joins.length}`,
    }],
  });
  const addAgg = () => updateDsl({
    aggregations: [...dsl.aggregations, {
      group: ["member_id"], metric: "vote_0", fn: "sum", as: "score",
    }],
  });

  const submit = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dsl),
      });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      console.error(err);
      alert("Request failed – see console");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className={classes["card"]}>
      <h2>1. Data source</h2>
      <select value={dsl.source.table} onChange={e => updateDsl({ source: { ...dsl.source, table: e.target.value } })}>
        <option value="mv_debate_contrib_flat">Debate contributions</option>
        <option value="mv_division_votes">Division votes</option>
        <option value="written_questions">Written questions</option>
      </select>
      <select value={dsl.output.kind} onChange={e => updateDsl({ output: { kind: e.target.value } })}>
        <option value="bar">Bar / Box</option>
        <option value="line">Line (time)</option>
        <option value="map">Choropleth</option>
        <option value="scatter_grid">Scatter / grid</option>
      </select>
    </div>
  );

  const renderStep2 = () => (
    <div className={classes["card"]}>
      <h2>2. Phrase filters</h2>
      {dsl.filters.map((f, idx) => (
        <div className={classes["row"]} key={idx}>
          <select value={f.op} onChange={(e) => {
            const n = [...dsl.filters]; n[idx].op = e.target.value; updateDsl({ filters: n });
          }}>
            <option value="icontains">contains</option>
            <option value="noticontains">not contains</option>
          </select>
          <input
            placeholder="keyword"
            value={f.rhs}
            onChange={(e) => {
              const n = [...dsl.filters]; n[idx].rhs = e.target.value; updateDsl({ filters: n });
            }}
          />
          <button onClick={() => {
            const n = dsl.filters.filter((_, i) => i !== idx); updateDsl({ filters: n });
          }}>🗑</button>
        </div>
      ))}
      <button onClick={addFilter}>➕ Add filter</button>
    </div>
  );

  const renderStep3 = () => (
    <div className={classes["card"]}>
      <h2>3. Division vote joins</h2>
      {dsl.joins.map((j, idx) => (
        <div className={classes["row"]} key={idx}>
          <input type="number" value={j.division_id} onChange={(e) => {
            const n = [...dsl.joins]; n[idx].division_id = Number(e.target.value); updateDsl({ joins: n });
          }} />
          <select value={j.house} onChange={(e) => {
            const n = [...dsl.joins]; n[idx].house = Number(e.target.value); updateDsl({ joins: n });
          }}>
            <option value="1">Commons</option>
            <option value="2">Lords</option>
          </select>
          <button onClick={() => {
            const n = dsl.joins.filter((_, i) => i !== idx); updateDsl({ joins: n });
          }}>🗑</button>
        </div>
      ))}
      <button onClick={addJoin}>➕ Add join</button>
    </div>
  );

  const renderStep4 = () => (
    <div className={classes["card"]}>
      <h2>4. Metric & aggregations</h2>
      {dsl.aggregations.map((a, idx) => (
        <div className={classes["row"]} key={idx}>
          <input
            placeholder="group cols"
            value={a.group.join(",")}
            onChange={(e) => {
              const n = [...dsl.aggregations]; n[idx].group = e.target.value.split(/\s*,\s*/); updateDsl({ aggregations: n });
            }}
          />
          <input
            placeholder="metric"
            value={a.metric}
            onChange={(e) => {
              const n = [...dsl.aggregations]; n[idx].metric = e.target.value; updateDsl({ aggregations: n });
            }}
          />
          <select value={a.fn} onChange={(e) => {
            const n = [...dsl.aggregations]; n[idx].fn = e.target.value; updateDsl({ aggregations: n });
          }}>
            <option value="sum">sum</option>
            <option value="mean">mean</option>
            <option value="count">count</option>
          </select>
          <button onClick={() => {
            const n = dsl.aggregations.filter((_, i) => i !== idx); updateDsl({ aggregations: n });
          }}>🗑</button>
        </div>
      ))}
      <button onClick={addAgg}>➕ Add aggregation</button>
    </div>
  );

  const renderStep5 = () => (
    <div className={classes["card"]}>
      <h2>5. Review JSON & submit</h2>
      <textarea
        className={classes["codebox"]}
        value={JSON.stringify(dsl, null, 2)}
        onChange={(e) => {
          try { setDsl(JSON.parse(e.target.value)); } catch (_) {}
        }}
      />
      <button onClick={submit} disabled={loading}>
        {loading ? "Running…" : "Run analysis"}
      </button>
    </div>
  );

  const renderResult = () => result && (
    <div className={classes["card"]}>
      <h2>Result</h2>
      <pre className={classes["codebox"]}>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );

  const steps = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];
  return (
    <div className={classes["container"]}>
      {steps[step - 1]()} 
      <div className={classes["nav"]}>
        {step > 1 && <button onClick={() => setStep(step - 1)}>← Back</button>}
        {step < steps.length && <button onClick={() => setStep(step + 1)}>Next →</button>}
      </div>
      {renderResult()}
    </div>
  );
}
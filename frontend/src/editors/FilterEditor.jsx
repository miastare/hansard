import React from "react";
const CMP = ["=", "!=", "<", "<=", ">", ">=", "icontains", "noticontains"];

export default function FilterEditor({ value, onChange, cols, stepIds, currentIdx }) {
  const cond = value.conditions || { lhs: cols[0]?.name || "", op: "=", rhs: "" };
  return (
    <>
      <label>
        input&nbsp;
        <select value={value.input || ""} onChange={e => onChange({ ...value, input:e.target.value })}>
    {
     stepIds
     .filter((id, idx) => idx < currentIdx)   // ← only earlier steps
     .map(id => <option key={id}>{id}</option>)
     }
+</select>
      </label>

      <div style={{ display:"flex", gap:4 }}>
        <select value={cond.lhs} onChange={e => onChange({ ...value, conditions:{ ...cond, lhs:e.target.value }})}>
          {cols.map(c => <option key={c.name}>{c.name}</option>)}
        </select>
        <select value={cond.op} onChange={e => onChange({ ...value, conditions:{ ...cond, op:e.target.value }})}>
          {CMP.map(o => <option key={o}>{o}</option>)}
        </select>
        <input value={cond.rhs} onChange={e => onChange({ ...value, conditions:{ ...cond, rhs:e.target.value }})}/>
      </div>
    </>
  );
}

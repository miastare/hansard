
import React from "react";
import { NUM_OPS, BOOL_OPS, STR_OPS } from "../../utils/OpCatalog";

/* ------------------------------------------------------------------ helpers */
const CONST = v => ({ const: v });
const VAR   = name => ({ var: name });

/* choose "kind" of node so we know what sub-UI to render */
const kindOf = node =>
  node.var    ? "var"   :
  node.const !== undefined  ? "const" :
  node.op==="case"     ? "case"  :
  NUM_OPS.includes(node.op)  ? "num"   :
  BOOL_OPS.includes(node.op) ? "bool"  :
  STR_OPS.includes(node.op)  ? "str"   : "unknown";

/* Get the data type of an expression result */
const getExprType = (expr, cols) => {
  if (expr.var) {
    const col = cols.find(c => c.name === expr.var);
    return col ? col.dtype : "unknown";
  }
  if (expr.const !== undefined) {
    return typeof expr.const === "number" ? 
      (Number.isInteger(expr.const) ? "int64" : "float64") : 
      "object";
  }
  if (STR_OPS.includes(expr.op)) return "bool"; // string ops return boolean
  if (BOOL_OPS.includes(expr.op)) return "bool";
  if (NUM_OPS.includes(expr.op)) return "float64";
  if (expr.op === "case") return getExprType(expr.else, cols);
  return "unknown";
};

/* Get available operators based on input type */
const getAvailableOps = (inputType) => {
  if (inputType === "object" || inputType.includes("str")) return STR_OPS;
  if (inputType === "bool") return BOOL_OPS;
  if (inputType.includes("int") || inputType.includes("float")) return NUM_OPS;
  return [...NUM_OPS, ...STR_OPS, ...BOOL_OPS]; // show all for unknown types
};

/* ------------------------------------------------------------------ Expr UI */
export default function Expr({ expr, cols, onChange }) {
  const kind = kindOf(expr);

  /* leaf toggles – user can flip between VAR / CONST quickly */
  if (kind === "var")
    return (
      <div style={{ display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <select 
          value={expr.var || ""} 
          onChange={e => onChange(VAR(e.target.value))}
          style={{ minWidth: "120px" }}
        >
          <option value="">Select column</option>
          {cols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.dtype})</option>)}
        </select>
        <button 
          onClick={() => onChange(CONST(0))}
          style={{ 
            padding: "2px 6px", 
            fontSize: "12px", 
            backgroundColor: "#f0f0f0", 
            border: "1px solid #ccc", 
            borderRadius: "3px",
            cursor: "pointer"
          }}
        >
          →const
        </button>
        {expr.var && (
          <select
            onChange={e => {
              const op = e.target.value;
              const colType = getExprType(expr, cols);
              if (STR_OPS.includes(op)) {
                onChange({ op, args: [expr] });
              } else if (BOOL_OPS.includes(op) && op === "not") {
                onChange({ op, args: [expr] });
              } else {
                onChange({ op, args: [expr, CONST(0)] });
              }
            }}
            style={{ fontSize: "12px" }}
          >
            <option value="">Apply operation...</option>
            {getAvailableOps(getExprType(expr, cols)).map(op => 
              <option key={op} value={op}>{op}</option>
            )}
          </select>
        )}
      </div>
    );

  if (kind === "const")
    return (
      <div style={{ display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <input
          style={{ width: 80 }}
          type={typeof expr.const === "string" ? "text" : "number"}
          value={expr.const}
          onChange={e => onChange(CONST(typeof expr.const === "string" ? e.target.value : Number(e.target.value)))}
        />
        <button 
          onClick={() => onChange(VAR(cols[0]?.name || ""))}
          style={{ 
            padding: "2px 6px", 
            fontSize: "12px", 
            backgroundColor: "#f0f0f0", 
            border: "1px solid #ccc", 
            borderRadius: "3px",
            cursor: "pointer"
          }}
        >
          →col
        </button>
        <button 
          onClick={() => onChange(CONST(typeof expr.const === "string" ? 0 : "text"))}
          style={{ 
            padding: "2px 6px", 
            fontSize: "12px", 
            backgroundColor: "#f0f0f0", 
            border: "1px solid #ccc", 
            borderRadius: "3px",
            cursor: "pointer"
          }}
        >
          {typeof expr.const === "string" ? "→num" : "→text"}
        </button>
      </div>
    );

  /* 2-ary numeric ---------------------------------------------------------- */
  if (kind === "num")
    return (
      <div style={{ display:"inline-flex", gap:4, alignItems: "center", flexWrap: "wrap", 
                    border: "1px solid #ddd", padding: "4px", borderRadius: "4px" }}>
        <Expr expr={expr.args[0]} cols={cols}
              onChange={a => onChange({ ...expr, args:[a,expr.args[1]] })}/>
        <select value={expr.op}
                onChange={e => onChange({ ...expr, op:e.target.value })}>
          {NUM_OPS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <Expr expr={expr.args[1]} cols={cols}
              onChange={b => onChange({ ...expr, args:[expr.args[0],b] })}/>
        <button
          onClick={() => {
            const resultType = getExprType(expr, cols);
            const availableOps = getAvailableOps(resultType);
            if (availableOps.length > 0) {
              const newOp = availableOps[0];
              if (STR_OPS.includes(newOp)) {
                onChange({ op: newOp, args: [expr] });
              } else {
                onChange({ op: newOp, args: [expr, CONST(0)] });
              }
            }
          }}
          style={{ padding: "2px 6px", fontSize: "11px", backgroundColor: "#e3f2fd" }}
        >
          +op
        </button>
      </div>
    );

  /* boolean ("and/or/not") -------------------------------------------------- */
  if (kind === "bool" && expr.op !== "not")
    return (
      <div style={{ display:"inline-flex", gap:4, alignItems: "center", flexWrap: "wrap",
                    border: "1px solid #ddd", padding: "4px", borderRadius: "4px" }}>
        <Expr expr={expr.args[0]} cols={cols}
              onChange={a => onChange({ ...expr, args:[a,expr.args[1]] })}/>
        <select value={expr.op}
                onChange={e => onChange({ ...expr, op:e.target.value })}>
          {BOOL_OPS.filter(o=>o!=="not").map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <Expr expr={expr.args[1]} cols={cols}
              onChange={b => onChange({ ...expr, args:[expr.args[0],b] })}/>
      </div>
    );

  if (kind === "bool" && expr.op === "not")
    return (
      <div style={{ display:"inline-flex", gap:4, alignItems: "center", flexWrap: "wrap",
                    border: "1px solid #ddd", padding: "4px", borderRadius: "4px" }}>
        <span>NOT</span>
        <Expr expr={expr.args[0]} cols={cols}
              onChange={a => onChange({ ...expr, args:[a] })}/>
      </div>
    );

  /* string unary ops -------------------------------------------------------- */
  if (kind === "str")
    return (
      <div style={{ display:"inline-flex", gap:4, alignItems: "center", flexWrap: "wrap",
                    border: "1px solid #ddd", padding: "4px", borderRadius: "4px" }}>
        <select value={expr.op}
                onChange={e => onChange({ ...expr, op:e.target.value })}>
          {STR_OPS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        (
        <Expr expr={expr.args[0]} cols={cols}
              onChange={a => onChange({ ...expr, args:[a] })}/>
        {(expr.op === "icontains" || expr.op === "regex") && (
          <>
            ,&nbsp;
            <input
              type="text"
              placeholder="search text"
              style={{ width: 100 }}
              onChange={e => onChange({ ...expr, args: [expr.args[0], CONST(e.target.value)] })}
            />
          </>
        )}
        )
      </div>
    );

  /* CASE WHEN ladder (nested IF-ELSE) -------------------------------------- */
  if (kind === "case") {
    const set = (idx,key,val)=>
      onChange({ ...expr,
                 cases: expr.cases.map((c,i)=>(i===idx?{...c,[key]:val}:c))});
    return (
      <div style={{borderLeft:"2px solid #e2e8f0",marginLeft:8,paddingLeft:6}}>
        CASE
        {expr.cases.map((c,i)=>(
          <div key={i} style={{ margin:"2px 0" }}>
            WHEN&nbsp;
            <Expr expr={c.when} cols={cols}
                  onChange={nw=>set(i,"when",nw)}/>
            &nbsp;THEN&nbsp;
            <Expr expr={c.then} cols={cols}
                  onChange={nv=>set(i,"then",nv)}/>
          </div>
        ))}
        <button onClick={()=>onChange({
          ...expr,
          cases:[...expr.cases,{when:VAR(cols[0]?.name||""),then:CONST(0)}]
        })}>+ when</button>
        <div style={{ marginTop:2 }}>
          ELSE&nbsp;
          <Expr expr={expr.else} cols={cols}
                onChange={ne=>onChange({ ...expr, else:ne })}/>
        </div>
        END
      </div>
    );
  }

  /* fallback --------------------------------------------------------------- */
  return <span style={{ color: "#ccc" }}>…</span>;
}

/* factory used by MutateEditor when user clicks "+ column" */
export const newBlankExpr = cols => ({
  op:"add",
  args:[ VAR(cols[0]?.name||""), CONST(0) ],
});

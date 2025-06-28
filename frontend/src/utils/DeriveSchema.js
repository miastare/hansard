import { STR_OPS } from "./OpCatalog";

export default function deriveSchema(step, steps, tableSchemas) {
  if (!step) return [];                      // ← guard fixes the crash
  if (step.op === "source") return tableSchemas[step.table] || [];

  if (step.op === "filter") {
    const src = steps.find(s => s.id === step.input);
    return deriveSchema(src, steps, tableSchemas);
  }

if (step.op === "mutate") {
  const base = deriveSchema(steps.find(s => s.id === step.input), steps, tableSchemas);

  // infer dtype of each new column (cheap heuristic)
  const infer = expr => {
    if (expr.var)        return base.find(c => c.name === expr.var)?.dtype || "float64";
    if (expr.const)      return Number.isInteger(expr.const) ? "int64" : "float64";
    if (STR_OPS.includes(expr.op)) return "object";
    if (expr.op === "case")        return infer(expr.else);
    return "float64";              // default for numeric / boolean
  };

  const extra = Object.entries(step.cols || {})
    .map(([name, expr]) => ({ name, dtype: infer(expr) }));
  return [...base, ...extra];
}

  if (step.op === "aggregate") {
    const g = (step.group || []).map(n => ({ name: n, dtype: "object" }));
    const m = Object.keys(step.metrics || {}).map(n => ({ name: n, dtype: "float64" }));
    return [...g, ...m];
  }

  /* join, etc. – fallback: union of inputs */
  if (step.op === "join") {
    return (step.inputs || [])
      .flatMap(id => deriveSchema(steps.find(s => s.id === id), steps, tableSchemas))
      .reduce((acc, col) => (acc.some(c => c.name === col.name) ? acc : [...acc, col]), []);
  }
  return [];
}

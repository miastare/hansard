import React, { Fragment } from "react";
import Expr, { newBlankExpr } from "./Expr";

export default function MutateEditor({
  value, onChange, cols, stepIds, currentIdx
}) {
  const set = patch => onChange({ ...value, ...patch });

  // when adding a column, embed a stable _rowId so React keys never change
  const addCol = () => {
    const rowId = Date.now().toString(36);
    set({
      cols: {
        ...(value.cols || {}),
        [`col_${rowId}`]: { _rowId: rowId, ...newBlankExpr(cols) }
      }
    });
  };

  // convert object → array so we can attach the stable key
  const rows = Object.entries(value.cols || {}).map(([name, expr]) => ({
    key: expr._rowId || name,                // stable key
    name,
    expr
  }));

  return (
    <Fragment>
      <label>
        input&nbsp;
        <select
          value={value.input || ""}
          onChange={e => set({ input: e.target.value })}
        >
          {stepIds
            .filter((id, idx) => idx < currentIdx)  /* earlier steps only */
            .map(id => (
              <option key={id}>{id}</option>
            ))}
        </select>
      </label>

      {rows.map(({ key, name, expr }) => (
        <div
          key={key}
          style={{ display: "flex", gap: 6, margin: "4px 0" }}
        >
          <input
            value={name}
            onChange={e => {
              const { [name]: _, ...rest } = value.cols;
              // keep the same expr object so _rowId survives rename
              rest[e.target.value] = expr;
              set({ cols: rest });
            }}
          />
          =
          <Expr
            expr={expr}
            cols={cols}
            onChange={nv =>
              set({ cols: { ...value.cols, [name]: { ...nv, _rowId: key } } })
            }
          />
          <button
            onClick={() => {
              const { [name]: _, ...rest } = value.cols;
              set({ cols: rest });
            }}
          >
            🗑
          </button>
        </div>
      ))}

      <button onClick={addCol}>+ column</button>
    </Fragment>
  );
}

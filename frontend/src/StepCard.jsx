import React from "react";
import classes from "./DSLBuilder.module.css";

export default function StepCard({
  idx, step, onPatch, onMove, onDelete, toggleReturn, cols, children
}) {
  return (
    <section className={classes.card} onClick={() => onPatch({})}>
      <header className={classes.cardHeader}>
        <span>{idx + 1}. {step.op}</span>
        <div>
          {idx > 0 && <button onClick={() => onMove(-1)}>↑</button>}
          {onMove && <button onClick={() => onMove(1)}>↓</button>}
          <button onClick={onDelete}>🗑</button>
          <label>
            <input
              type="checkbox"
              checked={step._return}
              onChange={toggleReturn}
            /> return
          </label>
        </div>
      </header>

      {/* ⬇︎ Sidebar now sits *below* the header so it never blocks buttons */}
      {Array.isArray(cols) && cols.length > 0 && (
        <aside className={classes.sidebar}>
          <strong>Columns:</strong>
          {cols.map(c => (
            <div key={c.name}>
              <code>{c.name}</code>{" "}
              <small style={{ color: "#555" }}>{c.dtype}</small>
            </div>
          ))}
        </aside>
      )}

      {children}
    </section>
  );
}

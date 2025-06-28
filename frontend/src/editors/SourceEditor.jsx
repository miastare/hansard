import React from "react";
const TABLES = [
  "interest_df",
  "written_questions_df",
  "written_statements_df",
  "divisions_df",
  "member_lookup",
  "member_party_history"
];

export default function SourceEditor({ value, onChange }) {
  return (
    <select value={value.table || ""} onChange={e => onChange({ ...value, table: e.target.value })}>
      <option value="">– select table –</option>
      {TABLES.map(t => <option key={t}>{t}</option>)}
    </select>
  );
}

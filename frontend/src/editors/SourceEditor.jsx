import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Dropdown from "../components/Dropdown";
import WindowedColumnsPreview from "../components/WindowedColumnsPreview";
import styles from "./SourceEditor.module.css";

const AVAILABLE_TABLES = [
  "interest_df",
  "written_questions_df",
  "written_statements_df",
  "divisions_df",
  "member_lookup",
  "member_party_history",
];

export default function SourceEditor({
  step,
  onChange,
  tableSchemas,
  requestSchema,
}) {
  console.log(`SOURCE EDITOR: ===== RENDERING =====`);
  console.log(`SOURCE EDITOR: Rendering with step:`, step);
  console.log(`SOURCE EDITOR: requestSchema function:`, requestSchema);

  const [table, setTable] = useState(step.table || "");
  const [previewData, setPreviewData] = useState(null);
  const [hoveredTable, setHoveredTable] = useState(null);

  const updateStep = useCallback(
    (newTable) => {
      console.log(`SOURCE EDITOR: Table changed to:`, newTable);
      setTable(newTable);
      onChange({ ...step, table: newTable });
      if (newTable && requestSchema) {
        console.log(`SOURCE EDITOR: Requesting schema for:`, newTable);
        requestSchema(newTable);
      } else {
        console.log(
          `SOURCE EDITOR: Not requesting schema - table:`,
          newTable,
          `requestSchema:`,
          requestSchema,
        );
      }
    },
    [step, onChange, requestSchema],
  );

  // Fetch preview data when table changes
  useEffect(() => {
    if (table) {
      fetch(`/api/preview/${table}?n=3`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setPreviewData(data))
        .catch(() => setPreviewData(null));
    } else {
      setPreviewData(null);
    }
  }, [table]);

  // Get schema for display - prioritize selected table, fallback to hovered table
  const displayTable = table || hoveredTable?.table;
  const selectedSchema = tableSchemas?.[displayTable];
  const currentSchema = selectedSchema?.cols || selectedSchema || [];

  

  // Prepare dropdown options
  const tableOptions = AVAILABLE_TABLES.map((tableName) => ({
    value: tableName,
    label: tableName,
    icon: "📋",
  }));

  // Handle table hover for columns preview
  const handleTableHover = (option) => {
    if (option && tableSchemas) {
      const schema = tableSchemas[option.value];
      if (schema) {
        const columns = schema.cols || schema;
        setHoveredTable({
          table: option.value,
          schema: Array.isArray(columns) ? columns : [],
        });
      }
    } else {
      setHoveredTable(null);
    }
  };

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>
        Source Table
      </h4>

      {/* Table Selection Row */}
      <div className={styles.selectionRow}>
        <div className={styles.dropdownContainer}>
          <label className={styles.label}>
            📋 Select table:
          </label>
          <div className={styles.dropdownWrapper}>
            <Dropdown
              value={table}
              onChange={updateStep}
              options={tableOptions}
              placeholder="Select a table"
              onHover={handleTableHover}
            />
          </div>
        </div>

        {/* Selected Table Columns Preview - only when table is selected */}
        {(table || hoveredTable) && currentSchema.length > 0 ? (
          <div className={styles.columnsPreview}>
            <WindowedColumnsPreview
              columns={currentSchema}
              title={`Table columns`}
              isVisible={true}
              columnsPerWindow={4}
            />
          </div>
        ) : (
          <div className={styles.columnsPreview} style={{ visibility: "hidden" }}>
            {/* This div acts as a placeholder to maintain layout */}
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className={styles.scrollableContent}>
        {previewData && previewData.length > 0 && (
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              📋 Preview (first 3 rows)
            </div>
            <div className={styles.previewTable}>
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr>
                    {Object.keys(previewData[0]).map((col) => (
                      <th key={col} className={styles.tableHeader}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className={styles.tableRow}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className={styles.tableCell}>
                          {val !== null && val !== undefined
                            ? String(val)
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
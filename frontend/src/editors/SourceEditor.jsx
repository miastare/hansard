import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Dropdown from "../components/Dropdown";
import WindowedColumnsPreview from "../components/WindowedColumnsPreview";

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
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        maxHeight: "60vh",
      }}
    >
      <h4 style={{ margin: "0 0 24px 0", color: "#2d3748", fontSize: "18px" }}>
        Source Table
      </h4>

      {/* Table Selection Row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "24px",
          flexShrink: 0,
          position: "relative",
          justifyContent: "space-around",
        }}
      >
        <div style={{ flex: "0 0 300px", position: "relative" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              fontSize: "14px",
              color: "#374151",
            }}
          >
            📋 Select table:
          </label>
          <div style={{ position: "relative", zIndex: 100 }}>
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
          <WindowedColumnsPreview
            columns={currentSchema}
            title={`Table columns`}
            isVisible={true}
            columnsPerWindow={4}
          />
        ) : (
          <div
            style={{
              flex: "1",
              minWidth: "280px",
              maxWidth: "350px",
              height: "150px", // Adjust height as needed
              visibility: "hidden", // Make it invisible
            }}
          >
            {/* This div acts as a placeholder to maintain layout */}
          </div>
        )}
      </div>

      {/* Hovered Table Schema Preview - positioned outside the flex container */}
      {/* REMOVED - as requested */}

      {/* Scrollable Content Area */}
      <div
        style={{
          flex: "1",
          overflowY: "auto",
          paddingRight: "8px",
        }}
      >
        {previewData && previewData.length > 0 && (
          <div
            style={{
              marginBottom: "20px",
              border: "2px solid rgba(203, 213, 225, 0.4)",
              borderRadius: "12px",
              backgroundColor: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                background: "rgba(248, 250, 252, 0.8)",
                borderBottom: "1px solid rgba(203, 213, 225, 0.3)",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              📋 Preview (first 3 rows)
            </div>
            <div
              style={{
                padding: "20px",
                overflow: "auto",
                maxHeight: "300px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(248, 250, 252, 0.5)",
                      borderBottom: "2px solid rgba(203, 213, 225, 0.3)",
                    }}
                  >
                    {Object.keys(previewData[0]).map((col) => (
                      <th
                        key={col}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid rgba(203, 213, 225, 0.2)",
                      }}
                    >
                      {Object.values(row).map((val, j) => (
                        <td
                          key={j}
                          style={{
                            padding: "12px 16px",
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "#6b7280",
                          }}
                        >
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

import React, { useState } from "react";
import { createPortal } from "react-dom";

export default function WindowedColumnsPreview({
  columns = [],
  title = "Available columns",
  columnsPerWindow = 4,
  isVisible = true,
  filterCondition = null, // Optional filter function
}) {
  const [columnWindowStart, setColumnWindowStart] = useState(0);
  const [showAllColumnsModal, setShowAllColumnsModal] = useState(false);
  const [showWindowedColumns, setShowWindowedColumns] = useState(true);

  if (!isVisible || !columns || columns.length === 0) {
    return null;
  }

  // Apply filter if provided
  const filteredColumns = filterCondition ? columns.filter(filterCondition) : columns;

  if (filteredColumns.length === 0) {
    return null;
  }

  // Get columns for current window
  const windowedColumns = filteredColumns.slice(
    columnWindowStart,
    columnWindowStart + columnsPerWindow,
  );
  const totalWindows = Math.ceil(filteredColumns.length / columnsPerWindow);
  const currentWindow = Math.floor(columnWindowStart / columnsPerWindow) + 1;

  const getTypeColor = (dtype) => {
    return dtype === "str"
      ? "#10b981"
      : dtype === "numeric" || dtype === "int64"
        ? "#3b82f6"
        : dtype === "bool"
          ? "#f59e0b"
          : "#6b7280";
  };

  return (
    <div style={{ flex: "1", minWidth: "280px", maxWidth: "350px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontWeight: "600",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          📊 {title} ({filteredColumns.length})
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowWindowedColumns(!showWindowedColumns)}
            style={{
              padding: "4px 12px",
              background: showWindowedColumns ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
              color: showWindowedColumns ? "#ef4444" : "#22c55e",
              border: showWindowedColumns ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(34, 197, 94, 0.2)",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {showWindowedColumns ? "Hide Some" : "View Some"}
          </button>
          <button
            onClick={() => setShowAllColumnsModal(true)}
            style={{
              padding: "4px 12px",
              background: "rgba(59, 130, 246, 0.1)",
              color: "#3b82f6",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            View All
          </button>
        </div>
      </div>

      {/* Windowed Column Display */}
      <div
        style={{
          background: "rgba(248, 250, 252, 0.8)",
          border: "1px solid rgba(203, 213, 225, 0.4)",
          borderRadius: "8px",
          padding: showWindowedColumns ? "12px" : "0 12px",
          maxHeight: showWindowedColumns ? "500px" : "0",
          overflow: "hidden",
          transition: "all 0.3s ease-in-out",
          opacity: showWindowedColumns ? 1 : 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
            marginBottom: windowedColumns.length > 0 ? "12px" : "0",
          }}
        >
          {windowedColumns.map((col) => (
            <div
              key={col.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                background: "rgba(255, 255, 255, 0.8)",
                border: "1px solid rgba(203, 213, 225, 0.3)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            >
              <span style={{ fontWeight: "500", color: "#374151" }}>
                {col.name}
              </span>
              <span
                style={{
                  color: getTypeColor(col.dtype),
                  fontSize: "11px",
                }}
              >
                {col.dtype}
              </span>
            </div>
          ))}
        </div>

        {/* Navigation */}
        {totalWindows > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#6b7280",
            }}
          >
            <button
              onClick={() =>
                setColumnWindowStart(
                  Math.max(0, columnWindowStart - columnsPerWindow),
                )
              }
              disabled={columnWindowStart === 0}
              style={{
                padding: "4px 8px",
                background: columnWindowStart === 0 ? "#f3f4f6" : "#e5e7eb",
                border: "none",
                borderRadius: "4px",
                cursor: columnWindowStart === 0 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>
            <span>
              {currentWindow} of {totalWindows}
            </span>
            <button
              onClick={() =>
                setColumnWindowStart(
                  Math.min(
                    filteredColumns.length - columnsPerWindow,
                    columnWindowStart + columnsPerWindow,
                  ),
                )
              }
              disabled={columnWindowStart + columnsPerWindow >= filteredColumns.length}
              style={{
                padding: "4px 8px",
                background:
                  columnWindowStart + columnsPerWindow >= filteredColumns.length
                    ? "#f3f4f6"
                    : "#e5e7eb",
                border: "none",
                borderRadius: "4px",
                cursor:
                  columnWindowStart + columnsPerWindow >= filteredColumns.length
                    ? "not-allowed"
                    : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* All Columns Modal using React Portal */}
      {showAllColumnsModal &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
            onClick={() => setShowAllColumnsModal(false)}
          >
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "32px",
                width: "95vw",
                height: "90vh",
                maxWidth: "1200px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                  borderBottom: "2px solid rgba(229, 231, 235, 0.8)",
                  paddingBottom: "16px",
                }}
              >
                <h2 style={{ margin: 0, color: "#1f2937", fontSize: "24px" }}>
                  📊 All {title} ({filteredColumns.length})
                </h2>
                <button
                  onClick={() => setShowAllColumnsModal(false)}
                  style={{
                    padding: "12px 20px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  ✕ Close
                </button>
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  paddingRight: "8px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {filteredColumns.map((col) => (
                    <div
                      key={col.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        background: "rgba(248, 250, 252, 0.8)",
                        border: "2px solid rgba(203, 213, 225, 0.3)",
                        borderRadius: "12px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#374151",
                          fontSize: "15px",
                        }}
                      >
                        {col.name}
                      </span>
                      <span
                        style={{
                          color: getTypeColor(col.dtype),
                          fontSize: "14px",
                          fontWeight: "600",
                          padding: "4px 8px",
                          background: "rgba(255, 255, 255, 0.8)",
                          borderRadius: "6px",
                        }}
                      >
                        {col.dtype}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

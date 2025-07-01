import React, { useState, useCallback, useMemo, useRef } from "react";
import { deriveSchema } from "../utils/DeriveSchema";
import Dropdown from "../components/Dropdown";
import WindowedColumnsPreview from "../components/WindowedColumnsPreview";

// Collapsible section component - moved outside to prevent remounting
const CollapsibleSection = ({ title, isExpanded, onToggle, children }) => (
  <div style={{ marginBottom: "20px" }}>
    <button
      onClick={() => onToggle(!isExpanded)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        padding: "12px 16px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600",
        color: "#495057",
        transition: "all 0.2s ease",
      }}
      onMouseOver={(e) => (e.target.style.backgroundColor = "#e9ecef")}
      onMouseOut={(e) => (e.target.style.backgroundColor = "#f8f9fa")}
    >
      <span
        style={{
          fontSize: "12px",
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
        }}
      >
        ▶
      </span>
      <span>{title}</span>
    </button>
    {isExpanded && (
      <div
        style={{
          marginTop: "16px",
          padding: "0 8px",
        }}
      >
        {children}
      </div>
    )}
  </div>
);

export default function JoinEditor({
  step,
  onUpdate,
  onBatchUpdate,
  availableInputs,
  tableSchemas,
}) {
  console.log("🔗 JOIN EDITOR: Rendering with step:", step);

  const [inputs, setInputs] = useState(step.inputs || []);
  const [joinType, setJoinType] = useState(step.how || "inner");
  const [byColumns, setByColumns] = useState(step.on || []);
  const [suffixes, setSuffixes] = useState(
    step.suffixes || { left: "_x", right: "_y" },
  );
  const hoveredInputRef = useRef(null);

  // Collapsible section states
  const [isInputSourcesExpanded, setIsInputSourcesExpanded] = useState(true);
  const [isJoinTypeExpanded, setIsJoinTypeExpanded] = useState(true);
  const [isJoinColumnsExpanded, setIsJoinColumnsExpanded] = useState(true);
  const [isSuffixesExpanded, setIsSuffixesExpanded] = useState(true);

  // Get schemas for the selected inputs
  const getInputSchemas = () => {
    if (!inputs || inputs.length < 2)
      return { left: [], right: [], common: [] };

    const leftInput = availableInputs.find((inp) => inp.id === inputs[0]);
    const rightInput = availableInputs.find((inp) => inp.id === inputs[1]);

    const leftSchema = leftInput
      ? deriveSchema(leftInput, availableInputs, tableSchemas)
      : [];
    const rightSchema = rightInput
      ? deriveSchema(rightInput, availableInputs, tableSchemas)
      : [];

    // Find common columns that can be used for joining
    const leftColNames = leftSchema.map((col) => col.name);
    const rightColNames = rightSchema.map((col) => col.name);
    const commonColumns = leftColNames.filter((name) =>
      rightColNames.includes(name),
    );

    console.log("🔗 JOIN EDITOR: Left schema:", leftSchema);
    console.log("🔗 JOIN EDITOR: Right schema:", rightSchema);
    console.log("🔗 JOIN EDITOR: Common columns:", commonColumns);

    return { left: leftSchema, right: rightSchema, common: commonColumns };
  };

  const {
    left: leftSchema,
    right: rightSchema,
    common: commonColumns,
  } = getInputSchemas();

  const updateStep = useCallback(
    (updates) => {
      if (onBatchUpdate) {
        onBatchUpdate(updates);
      } else {
        Object.entries(updates).forEach(([key, value]) => {
          onUpdate(key, value);
        });
      }
    },
    [onUpdate, onBatchUpdate],
  );

  const updateInputs = (newInputs) => {
    setInputs(newInputs);
    // Clear by columns when inputs change since available columns might be different
    setByColumns([]);
    updateStep({ inputs: newInputs, on: [] });
  };

  const updateJoinType = (newType) => {
    setJoinType(newType);
    updateStep({ how: newType });
  };

  const updateByColumns = (newByColumns) => {
    setByColumns(newByColumns);
    updateStep({ on: newByColumns });
  };

  const updateSuffixes = (side, value) => {
    const newSuffixes = { ...suffixes, [side]: value };
    setSuffixes(newSuffixes);
    updateStep({ suffixes: newSuffixes });
  };

  const updateInput = (index, inputId) => {
    const newInputs = [...inputs];
    newInputs[index] = inputId;
    updateInputs(newInputs);
  };

  const removeInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    updateInputs(newInputs);
  };

  // Handle multi-select for join columns
  const handleJoinColumnSelect = (columnName) => {
    const newByColumns = byColumns.includes(columnName)
      ? byColumns.filter((col) => col !== columnName)
      : [...byColumns, columnName];
    updateByColumns(newByColumns);
  };

  // Prepare dropdown options (memoized to prevent unnecessary re-renders)
  const inputOptions = useMemo(
    () =>
      availableInputs?.map((input) => ({
        value: input.id,
        label: `${input.id} (${input.op})`,
        icon: input.op === "source" ? "📋" : "🔧",
      })) || [],
    [availableInputs],
  );

  const joinTypeOptions = [
    { value: "inner", label: "Inner Join", icon: "🔗" },
    { value: "left", label: "Left Join", icon: "⬅️" },
    { value: "right", label: "Right Join", icon: "➡️" },
    { value: "outer", label: "Full Outer Join", icon: "🔄" },
  ];

  // Handle input hover for columns preview
  const handleInputHover = useCallback(
    (option) => {
      if (!option) {
        hoveredInputRef.current = null;
        return;
      }

      const inputStep = availableInputs.find((s) => s.id === option.value);
      if (inputStep) {
        let schema = [];
        if (inputStep.op === "source" && inputStep.table) {
          const schemaWrapper = tableSchemas[inputStep.table];
          if (schemaWrapper) {
            schema = schemaWrapper.cols || schemaWrapper;
          }
        } else {
          schema = deriveSchema(inputStep, availableInputs, tableSchemas);
        }
        hoveredInputRef.current = {
          inputStep,
          schema: Array.isArray(schema) ? schema : [],
        };
      }
    },
    [availableInputs, tableSchemas],
  );

  

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        maxHeight: "80vh",
        overflowY: "auto",
        padding: "16px",
      }}
    >
      {/* Input Sources Section */}
      <CollapsibleSection
        title="Input Sources"
        isExpanded={isInputSourcesExpanded}
        onToggle={setIsInputSourcesExpanded}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          {/* Left Input */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#6b7280",
              }}
            >
              Left Table:
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {inputs[0] ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <span style={{ flex: 1, fontSize: "14px" }}>
                    {inputs[0]} (
                    {availableInputs.find((inp) => inp.id === inputs[0])?.op ||
                      "unknown"}
                    )
                  </span>
                  <button
                    onClick={() => removeInput(0)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <Dropdown
                  value=""
                  onChange={(value) => updateInput(0, value)}
                  options={inputOptions.filter(
                    (opt) => !inputs.includes(opt.value),
                  )}
                  placeholder="Select left input"
                  onHover={handleInputHover}
                />
              )}
            </div>
          </div>

          {/* Right Input */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#6b7280",
              }}
            >
              Right Table:
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {inputs[1] ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <span style={{ flex: 1, fontSize: "14px" }}>
                    {inputs[1]} (
                    {availableInputs.find((inp) => inp.id === inputs[1])?.op ||
                      "unknown"}
                    )
                  </span>
                  <button
                    onClick={() => removeInput(1)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <Dropdown
                  value=""
                  onChange={(value) => updateInput(1, value)}
                  options={inputOptions.filter(
                    (opt) => !inputs.includes(opt.value),
                  )}
                  placeholder="Select right input"
                  onHover={handleInputHover}
                />
              )}
            </div>
          </div>
        </div>

        {/* Column Schema Previews */}
        {inputs.length === 2 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: "20px",
            }}
          >
            <WindowedColumnsPreview
              columns={leftSchema}
              title={`Left Table (${inputs[0]})`}
              isVisible={leftSchema.length > 0}
              columnsPerWindow={4}
            />
            <WindowedColumnsPreview
              columns={rightSchema}
              title={`Right Table (${inputs[1]})`}
              isVisible={rightSchema.length > 0}
              columnsPerWindow={4}
            />
          </div>
        )}
      </CollapsibleSection>

      {/* Join Type Section */}
      <CollapsibleSection
        title="Join Type"
        isExpanded={isJoinTypeExpanded}
        onToggle={setIsJoinTypeExpanded}
      >
        <div style={{ maxWidth: "300px", margin: "0 auto" }}>
          <Dropdown
            value={joinType}
            onChange={updateJoinType}
            options={joinTypeOptions}
            placeholder="Select join type"
          />
        </div>
      </CollapsibleSection>

      {/* Join Columns Section */}
      <CollapsibleSection
        title="Join Columns"
        isExpanded={isJoinColumnsExpanded}
        onToggle={setIsJoinColumnsExpanded}
      >
        <div>
          {inputs.length === 2 && commonColumns.length > 0 ? (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "12px",
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Select columns to join on:
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "12px",
                }}
              >
                {commonColumns.map((column) => (
                  <label
                    key={column}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 14px",
                      backgroundColor: byColumns.includes(column)
                        ? "#e3f2fd"
                        : "#f8f9fa",
                      border: byColumns.includes(column)
                        ? "2px solid #2196f3"
                        : "1px solid #e9ecef",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      if (!byColumns.includes(column)) {
                        e.target.style.backgroundColor = "#e9ecef";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!byColumns.includes(column)) {
                        e.target.style.backgroundColor = "#f8f9fa";
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={byColumns.includes(column)}
                      onChange={() => handleJoinColumnSelect(column)}
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "#2196f3",
                      }}
                    />
                    <span>📊 {column}</span>
                  </label>
                ))}
              </div>
              {byColumns.length > 0 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    backgroundColor: "#e8f5e8",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#2e7d32",
                  }}
                >
                  Selected: {byColumns.join(", ")}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
                fontSize: "14px",
                color: "#6c757d",
              }}
            >
              {inputs.length < 2
                ? "Please select exactly 2 input sources to configure join columns"
                : "No common columns available for joining"}
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Column Name Suffixes Section */}
      <CollapsibleSection
        title="Column Name Suffixes"
        isExpanded={isSuffixesExpanded}
        onToggle={setIsSuffixesExpanded}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#6b7280",
              }}
            >
              Left Table Suffix:
            </label>
            <input
              type="text"
              value={suffixes.left}
              onChange={(e) => updateSuffixes("left", e.target.value)}
              placeholder="e.g. _x"
              style={{
                padding: "10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "#fff",
                transition: "all 0.2s ease",
                outline: "none",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "13px",
                fontWeight: "500",
                color: "#6b7280",
              }}
            >
              Right Table Suffix:
            </label>
            <input
              type="text"
              value={suffixes.right}
              onChange={(e) => updateSuffixes("right", e.target.value)}
              placeholder="e.g. _y"
              style={{
                padding: "10px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "#fff",
                transition: "all 0.2s ease",
                outline: "none",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
                e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
              }}
            />
          </div>
        </div>
        {suffixes.left === suffixes.right && suffixes.left !== "" && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#856404",
              textAlign: "center",
            }}
          >
            ⚠️ Left and right suffixes should be different
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

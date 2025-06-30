import React, { useState, useCallback } from "react";
import { deriveSchema } from "../utils/DeriveSchema";
import Dropdown from "../components/Dropdown";
import ColumnsPreview from "../components/ColumnsPreview";

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
  const [hoveredInput, setHoveredInput] = useState(null);

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

  const addByColumn = () => {
    if (commonColumns.length > 0) {
      const newByColumns = [...byColumns, commonColumns[0]];
      updateByColumns(newByColumns);
    }
  };

  const updateByColumn = (index, value) => {
    const newByColumns = [...byColumns];
    newByColumns[index] = value;
    updateByColumns(newByColumns);
  };

  const removeByColumn = (index) => {
    const newByColumns = byColumns.filter((_, i) => i !== index);
    updateByColumns(newByColumns);
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

  // Prepare dropdown options
  const inputOptions =
    availableInputs?.map((input) => ({
      value: input.id,
      label: `${input.id} (${input.op})`,
      icon: input.op === "source" ? "📋" : "🔧",
    })) || [];

  const joinTypeOptions = [
    { value: "inner", label: "Inner Join", icon: "🔗" },
    { value: "left", label: "Left Join", icon: "⬅️" },
    { value: "right", label: "Right Join", icon: "➡️" },
    { value: "outer", label: "Full Outer Join", icon: "🔄" },
  ];

  const byColumnOptions = commonColumns.map((col) => ({
    value: col,
    label: col,
    icon: "📊",
  }));

  // Handle input hover for columns preview
  const handleInputHover = (option) => {
    if (option && availableInputs) {
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
        setHoveredInput({
          inputStep,
          schema: Array.isArray(schema) ? schema : [],
        });
      }
    } else {
      setHoveredInput(null);
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
        Join Step
      </h4>

      {/* Input Sources Section - Side by Side Layout */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "12px",
            fontWeight: "bold",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          Input Sources:
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {/* Left Input */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
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
                    padding: "8px 12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
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
                marginBottom: "6px",
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
                    padding: "8px 12px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "6px",
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
      </div>

      {/* Join Type Section */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          Join Type:
        </label>
        <div style={{ maxWidth: "300px" }}>
          <Dropdown
            value={joinType}
            onChange={updateJoinType}
            options={joinTypeOptions}
            placeholder="Select join type"
          />
        </div>
      </div>

      {/* Column Schema Previews */}
      {inputs.length === 2 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <ColumnsPreview
            columns={leftSchema}
            title={`Left Table (${inputs[0]})`}
            isVisible={leftSchema.length > 0}
          />
          <ColumnsPreview
            columns={rightSchema}
            title={`Right Table (${inputs[1]})`}
            isVisible={rightSchema.length > 0}
          />
        </div>
      )}

      {/* Available Common Columns Info */}
      {inputs.length === 2 && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <strong style={{ fontSize: "14px", color: "#495057" }}>
            Available join columns:
          </strong>
          <div style={{ marginTop: "8px", fontSize: "13px", color: "#666" }}>
            {commonColumns.length > 0 ? (
              commonColumns.map((col) => (
                <span
                  key={col}
                  style={{
                    display: "inline-block",
                    margin: "3px 6px 3px 0",
                    padding: "4px 8px",
                    backgroundColor: "#e9ecef",
                    borderRadius: "4px",
                    fontSize: "12px",
                    border: "1px solid #dee2e6",
                  }}
                >
                  {col}
                </span>
              ))
            ) : (
              <em>No common columns found between the selected inputs</em>
            )}
          </div>
        </div>
      )}

      {/* By Columns Section */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          Join By Columns:
        </label>

        {byColumns.map((column, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <div style={{ flex: 1, maxWidth: "300px" }}>
              <Dropdown
                value={column}
                onChange={(value) => updateByColumn(index, value)}
                options={byColumnOptions}
                placeholder="Select column"
              />
            </div>
            <button
              onClick={() => removeByColumn(index)}
              style={{
                padding: "8px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          onClick={addByColumn}
          disabled={inputs.length < 2 || commonColumns.length === 0}
          style={{
            padding: "10px 20px",
            backgroundColor:
              inputs.length === 2 && commonColumns.length > 0
                ? "#007bff"
                : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor:
              inputs.length === 2 && commonColumns.length > 0
                ? "pointer"
                : "not-allowed",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          Add Join Column
        </button>

        {(inputs.length < 2 || commonColumns.length === 0) && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "13px",
              color: "#6c757d",
              fontStyle: "italic",
            }}
          >
            {inputs.length < 2
              ? "Please select exactly 2 input sources before adding join columns"
              : "No common columns available for joining"}
          </div>
        )}
      </div>

      {/* Suffixes Section - Side by Side */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          Column Name Suffixes:
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            maxWidth: "500px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
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
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "#fff",
                transition: "border-color 0.2s ease",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
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
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "#fff",
                transition: "border-color 0.2s ease",
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>
        </div>
        {suffixes.left === suffixes.right && suffixes.left !== "" && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "13px",
              color: "#dc3545",
              fontStyle: "italic",
            }}
          >
            ⚠️ Left and right suffixes should be different
          </div>
        )}
      </div>
    </div>
  );
}

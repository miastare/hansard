import React, { useState, useCallback } from "react";
import { deriveSchema } from "../utils/DeriveSchema";
import Dropdown from "../components/Dropdown";
import ColumnsPreview from "../components/ColumnsPreview";

export default function FilterEditor({
  step,
  onUpdate,
  availableInputs,
  tableSchemas,
  onBatchUpdate,
}) {
  const [conditions, setConditions] = useState(step.conditions || []);

  // Get schema for the selected input (similar to MutateEditor logic)
  const getInputSchema = () => {
    // If step has a specific input, use that
    if (step.input && step.input !== "" && availableInputs) {
      const inputStep = availableInputs.find(
        (s) => String(s.id) === String(step.input),
      );

      if (inputStep) {
        if (inputStep.op === "source" && inputStep.table) {
          const schemaWrapper = tableSchemas[inputStep.table];

          if (schemaWrapper) {
            // Handle both wrapper format {cols: [...]} and direct array format
            const schema = schemaWrapper.cols || schemaWrapper;

            if (Array.isArray(schema)) {
              return schema;
            } else {
              return [];
            }
          } else {
            return [];
          }
        } else {
          // For non-source steps (like mutate steps), derive the schema
          const derivedSchema = deriveSchema(
            inputStep,
            availableInputs,
            tableSchemas,
          );

          if (Array.isArray(derivedSchema)) {
            return derivedSchema;
          } else {
            return [];
          }
        }
      } else {
        return [];
      }
    }

    return [];
  };

  const currentSchema = getInputSchema();

  const updateStep = useCallback(
    (newConditions) => {
      setConditions(newConditions);
      onUpdate("conditions", newConditions);
    },
    [onUpdate],
  );

  const updateInput = useCallback(
    (newInput) => {
      // Clear conditions when input changes since schema might be different
      setConditions([]);

      // Update both input and conditions atomically to prevent race condition
      if (onBatchUpdate) {
        onBatchUpdate({ input: newInput, conditions: [] });
      } else {
        // Fallback to individual updates
        onUpdate("input", newInput);
        onUpdate("conditions", []);
      }
    },
    [onUpdate, onBatchUpdate],
  );

  const addCondition = () => {
    const newConditions = [...conditions, { column: "" }];
    updateStep(newConditions);
  };

  const updateCondition = (index, field, value) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    updateStep(newConditions);
  };

  const removeCondition = (index) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    updateStep(newConditions);
  };

  const [hoveredInput, setHoveredInput] = useState(null);

  // Prepare dropdown options
  const inputOptions =
    availableInputs?.map((input) => ({
      value: input.id,
      label: `${input.id} (${input.op})`,
      icon: input.op === "source" ? "📋" : "🔧",
    })) || [];

  // Handle input hover for columns preview
  const handleInputHover = (option) => {
    if (option && availableInputs) {
      const inputStep = availableInputs.find((s) => s.id === option.value);
      if (inputStep) {
        // Get schema for hovered input
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
        Filter Conditions
      </h4>

      {/* Input Selection Row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "24px",
          flexShrink: 0,
          justifyContent: "space-around",
        }}
      >
        <div style={{ flex: "0 0 300px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              fontSize: "14px",
              color: "#374151",
            }}
          >
            🔗 Input step:
          </label>
          <Dropdown
            value={step.input || ""}
            onChange={updateInput}
            options={inputOptions}
            placeholder="Select input step"
            onHover={handleInputHover}
          />
        </div>

        {/* Available Boolean Columns Preview */}
        {currentSchema.length > 0 && (
          <ColumnsPreview
            columns={currentSchema.filter((col) => col.dtype === "bool")}
            title="Available boolean columns"
            isVisible={true}
          />
        )}
      </div>

      {/* Scrollable Conditions Container */}
      <div
        style={{
          flex: "1",
          overflowY: "auto",
          marginBottom: "20px",
          paddingRight: "8px",
        }}
      >
        {conditions.map((condition, index) => (
          <div
            key={index}
            style={{
              marginBottom: "20px",
              border: "2px solid rgba(102, 126, 234, 0.1)",
              padding: "20px",
              borderRadius: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "15px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1", minWidth: "250px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    color: "#374151",
                  }}
                >
                  🔍 Boolean Column:
                </label>
                <select
                  value={condition.column || ""}
                  onChange={(e) =>
                    updateCondition(index, "column", e.target.value)
                  }
                  style={{
                    padding: "12px 16px",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    width: "100%",
                    fontSize: "14px",
                    background: "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  <option value="">Select boolean column</option>
                  {currentSchema
                    ?.filter((col) => col.dtype === "bool")
                    .map((col) => (
                      <option key={col.name} value={col.name}>
                        {col.name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ flex: "0 0 auto" }}>
                <button
                  onClick={() => removeCondition(index)}
                  style={{
                    padding: "12px 16px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed Footer with Add Condition Button */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid rgba(203, 213, 225, 0.3)",
          paddingTop: "6px",
          marginBottom: "10px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          onClick={addCondition}
          disabled={!step.input}
          style={{
            padding: "12px 24px",
            background: step.input
              ? "linear-gradient(135deg, #667eea, #764ba2)"
              : "#cbd5e1",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: step.input ? "pointer" : "not-allowed",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: step.input
              ? "0 4px 12px rgba(102, 126, 234, 0.3)"
              : "none",
          }}
        >
          ➕ Add Condition
        </button>

        {!step.input && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              backgroundColor: "rgba(251, 211, 141, 0.1)",
              border: "1px solid rgba(251, 211, 141, 0.3)",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            ⚠️ Please select an input step before adding conditions
          </div>
        )}
      </div>
    </div>
  );
}

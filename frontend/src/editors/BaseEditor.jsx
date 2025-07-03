import React from "react";
import Dropdown from "../components/Dropdown";
import { deriveSchema } from "../utils/DeriveSchema";

/**
 * Base editor component providing common functionality for all editors
 */
export default function BaseEditor({
  title,
  children,
  step,
  availableInputs,
  tableSchemas,
  showInputSelector = true,
  onInputChange,
  onInputHover,
  renderPreview,
  className = "",
}) {
  // Common logic for getting input schema
  const getInputSchema = () => {
    if (step.input && step.input !== "" && availableInputs) {
      const inputStep = availableInputs.find(
        (s) => String(s.id) === String(step.input),
      );

      if (inputStep) {
        if (inputStep.op === "source" && inputStep.table) {
          const schemaWrapper = tableSchemas[inputStep.table];
          if (schemaWrapper) {
            const schema = schemaWrapper.cols || schemaWrapper;
            return Array.isArray(schema) ? schema : [];
          }
        } else {
          const derivedSchema = deriveSchema(
            inputStep,
            availableInputs,
            tableSchemas,
          );
          return Array.isArray(derivedSchema) ? derivedSchema : [];
        }
      }
    }
    return [];
  };

  const currentSchema = getInputSchema();

  // Prepare dropdown options
  const inputOptions =
    availableInputs?.map((input) => ({
      value: input.id,
      label: `${input.id} (${input.op})`,
      icon: input.op === "source" ? "📋" : "🔧",
    })) || [];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        maxHeight: "60vh",
      }}
      className={className}
    >
      {/* Header */}
      <h4 style={{ margin: "0 0 24px 0", color: "#2d3748", fontSize: "18px" }}>
        {title}
      </h4>

      {/* Input Selection Row */}
      {showInputSelector && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "24px",
            flexShrink: 0,
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
              onChange={onInputChange}
              options={inputOptions}
              placeholder="Select input step"
              onHover={onInputHover}
            />
          </div>

          {/* Render custom preview if provided */}
          {renderPreview && renderPreview(currentSchema)}
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          flex: "1",
          overflowY: "auto",
          paddingRight: "8px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

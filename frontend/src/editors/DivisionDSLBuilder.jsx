import React, { useState } from "react";
import Modal from "../components/Modal";

// DSL grammar for division finding - only these operations are allowed
const LOGICAL_OPS = ["and", "or", "not"];
const LEAF_OPS = ["contains", "icontains", "regex"];

export default function DivisionDSLBuilder({ isOpen, onClose, onDSLComplete }) {
  const [dsl, setDsl] = useState({
    op: "contains",
    args: { pattern: "", column: "value" },
  });

  const handleComplete = () => {
    console.log("Generated DSL:", JSON.stringify(dsl, null, 2));
    onDSLComplete?.(dsl);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        style={{
          padding: "32px",
          minWidth: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
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
            🔍 Build Division Search Query
          </h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleComplete}
              style={{
                padding: "12px 20px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              ✓ Use This Query
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "12px 20px",
                background: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        <div
          style={{
            marginBottom: "20px",
            padding: "16px",
            backgroundColor: "#f0f9ff",
            border: "1px solid #0ea5e9",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#0c4a6e",
          }}
        >
          <strong>How it works:</strong> Build a query to search through
          parliamentary debate contributions. You can search for specific text
          patterns and combine multiple conditions using AND/OR logic.
        </div>

        <DSLExpressionBuilder expr={dsl} onChange={setDsl} modalDepth={0} />
      </div>
    </Modal>
  );
}

function DSLExpressionBuilder({
  expr,
  onChange,
  parentOperator = null,
  argIndex = null,
  modalDepth = 0,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingArgIndex, setEditingArgIndex] = useState(null);

  const handleTypeChange = (newOp) => {
    if (LEAF_OPS.includes(newOp)) {
      onChange({
        op: newOp,
        args: { pattern: "", column: "value" },
      });
    } else if (newOp === "and" || newOp === "or") {
      onChange({
        op: newOp,
        args: [
          { op: "contains", args: { pattern: "", column: "value" } },
          { op: "contains", args: { pattern: "", column: "value" } },
        ],
      });
    } else if (newOp === "not") {
      onChange({
        op: "not",
        args: { op: "contains", args: { pattern: "", column: "value" } },
      });
    }
  };

  const handlePatternChange = (newPattern) => {
    onChange({
      ...expr,
      args: { ...expr.args, pattern: newPattern },
    });
  };

  const handleArgChange = (index, newArg) => {
    if (expr.op === "not") {
      onChange({ ...expr, args: newArg });
    } else {
      const newArgs = [...expr.args];
      newArgs[index] = newArg;
      onChange({ ...expr, args: newArgs });
    }
  };

  const addArgument = () => {
    if (expr.op === "and" || expr.op === "or") {
      const newArgs = [
        ...expr.args,
        { op: "contains", args: { pattern: "", column: "value" } },
      ];
      onChange({ ...expr, args: newArgs });
    }
  };

  const removeArgument = (index) => {
    if ((expr.op === "and" || expr.op === "or") && expr.args.length > 2) {
      const newArgs = expr.args.filter((_, i) => i !== index);
      onChange({ ...expr, args: newArgs });
    }
  };

  const openArgModal = (index) => {
    setEditingArgIndex(index);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingArgIndex(null);
  };

  const getExpressionSummary = (expr) => {
    if (!expr || typeof expr !== "object") {
      return "Invalid expression";
    }

    if (LEAF_OPS.includes(expr.op)) {
      const pattern = expr.args?.pattern || "";
      return `${expr.op}("${pattern}")`;
    } else if (expr.op === "not") {
      return `not(${getExpressionSummary(expr.args)})`;
    } else if (expr.op === "and" || expr.op === "or") {
      if (!expr.args || !Array.isArray(expr.args)) {
        return `${expr.op}(no args)`;
      }
      const argSummaries = expr.args
        .map((arg) => getExpressionSummary(arg))
        .join(`, `);
      return `${expr.op}(${argSummaries})`;
    }
    return "Unknown operation";
  };

  const truncate = (text, maxLength = 50) => {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "2px solid #3b82f6",
        borderRadius: "10px",
        backgroundColor: "#f8f9ff",
      }}
    >
      <div style={{ marginBottom: "15px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Operation Type:
        </label>
        <select
          value={expr.op || ""}
          onChange={(e) => handleTypeChange(e.target.value)}
          style={{
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            minWidth: "150px",
          }}
        >
          <optgroup label="Text Search">
            <option value="contains">Contains (case-sensitive)</option>
            <option value="icontains">Contains (case-insensitive)</option>
            <option value="regex">Regex Pattern</option>
          </optgroup>
          <optgroup label="Logic Operations">
            <option value="and">AND (all conditions must be true)</option>
            <option value="or">OR (any condition can be true)</option>
            <option value="not">NOT (invert condition)</option>
          </optgroup>
        </select>
      </div>

      {/* Leaf operations (text search) */}
      {LEAF_OPS.includes(expr.op) && (
        <div>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            Search Pattern:
          </label>
          <input
            type="text"
            value={expr.args?.pattern || ""}
            onChange={(e) => handlePatternChange(e.target.value)}
            placeholder={
              expr.op === "regex"
                ? "Enter regex pattern (e.g., \\b\\w+tion\\b)"
                : "Enter text to search for"
            }
            style={{
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
              width: "100%",
              marginBottom: "8px",
            }}
          />
          <div style={{ fontSize: "12px", color: "#666" }}>
            {expr.op === "contains" && "Exact text match (case-sensitive)"}
            {expr.op === "icontains" && "Text match (case-insensitive)"}
            {expr.op === "regex" &&
              "Python regex pattern - use \\b for word boundaries"}
          </div>
        </div>
      )}

      {/* NOT operation */}
      {expr.op === "not" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <label style={{ fontWeight: "bold", fontSize: "14px" }}>
              Condition to negate:
            </label>
            <button
              onClick={() => openArgModal(0)}
              style={{
                padding: "4px 8px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Edit Condition
            </button>
          </div>
          <div
            style={{
              padding: "8px",
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#495057",
              border: "1px solid #e9ecef",
            }}
          >
            {truncate(getExpressionSummary(expr.args))}
          </div>
        </div>
      )}

      {/* AND/OR operations */}
      {(expr.op === "and" || expr.op === "or") && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <label style={{ fontWeight: "bold", fontSize: "14px" }}>
              Conditions (
              {expr.op === "and" ? "ALL must be true" : "ANY can be true"}):
            </label>
            <button
              onClick={addArgument}
              style={{
                padding: "4px 8px",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              + Add Condition
            </button>
          </div>

          {expr.args &&
            expr.args.map((arg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "10px",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  backgroundColor: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "13px" }}>
                    Condition {index + 1}:
                  </span>
                  <div>
                    <button
                      onClick={() => openArgModal(index)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "11px",
                        marginRight: "5px",
                      }}
                    >
                      Edit
                    </button>
                    {expr.args.length > 2 && (
                      <button
                        onClick={() => removeArgument(index)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#495057",
                    border: "1px solid #e9ecef",
                  }}
                >
                  {truncate(getExpressionSummary(arg))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal for editing nested expressions */}
      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <div style={{ padding: "20px", minWidth: "500px" }}>
            <h3 style={{ marginBottom: "20px" }}>
              Edit{" "}
              {expr.op === "not"
                ? "Condition"
                : `Condition ${editingArgIndex + 1}`}
              <span
                style={{
                  fontSize: "14px",
                  color: "#666",
                  fontWeight: "normal",
                }}
              >
                {expr.op === "not" ? " to negate" : ` for ${expr.op} operation`}
              </span>
            </h3>
            <DSLExpressionBuilder
              expr={expr.op === "not" ? expr.args : expr.args[editingArgIndex]}
              onChange={(newArg) => {
                if (expr.op === "not") {
                  handleArgChange(0, newArg);
                } else {
                  handleArgChange(editingArgIndex, newArg);
                }
              }}
              parentOperator={expr.op}
              argIndex={editingArgIndex}
              modalDepth={modalDepth + 1}
            />
            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

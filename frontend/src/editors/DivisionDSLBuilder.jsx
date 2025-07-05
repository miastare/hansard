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
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState(null);
  const [contributions, setContributions] = useState(null);
  const [error, setError] = useState(null);
  console.log("divisions", divisions);
  console.log("contributions", contributions);
  const handleComplete = () => {
    console.log("Generated DSL:", JSON.stringify(dsl, null, 2));
    onDSLComplete?.(dsl);
    onClose();
  };

  const isValidDSL = (dslNode) => {
    if (!dslNode || !dslNode.op) return false;

    if (LEAF_OPS.includes(dslNode.op)) {
      return dslNode.args?.pattern && dslNode.args.pattern.trim() !== "";
    }

    if (dslNode.op === "not") {
      return isValidDSL(dslNode.args);
    }

    if (dslNode.op === "and" || dslNode.op === "or") {
      return (
        Array.isArray(dslNode.args) &&
        dslNode.args.length >= 2 &&
        dslNode.args.every((arg) => isValidDSL(arg))
      );
    }

    return false;
  };

  const handleRetrieveDivisions = async () => {
    setLoading(true);
    setError(null);
    setDivisions(null);
    setContributions(null);

    try {
      const response = await fetch("/api/divisions_from_dsl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dsl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);
      console.log("Backend response type:", typeof data);
      console.log("Backend response is array:", Array.isArray(data));
      console.log("Backend response length:", data?.length);

      // Check if response is an error object
      if (data && typeof data === "object" && data.error) {
        console.error("Backend error:", data.error);
        setError(`Backend error: ${data.error}`);
        return;
      }

      // data is expected to be [divisions_dict, contributions_dict]
      if (Array.isArray(data) && data.length === 2) {
        const divisionsData = data[0];
        const contributionsData = data[1];
        console.log("Divisions data:", divisionsData);
        console.log("Divisions data type:", typeof divisionsData);
        console.log("Contributions data:", contributionsData);
        console.log("Contributions data type:", typeof contributionsData);

        if (
          typeof divisionsData === "object" &&
          typeof contributionsData === "object"
        ) {
          setDivisions(divisionsData);
          setContributions(contributionsData);
        } else {
          console.error(
            "Invalid data types - divisions:",
            typeof divisionsData,
            "contributions:",
            typeof contributionsData,
          );
          setError("Invalid data types returned from server");
        }
      } else {
        console.error("Unexpected data format:", data);
        console.error(
          "Expected array of length 2, got:",
          typeof data,
          Array.isArray(data) ? `length ${data.length}` : "not an array",
        );
        setError(
          `Unexpected response format from server. Expected array of length 2, got ${typeof data} ${Array.isArray(data) ? `with length ${data.length}` : "not an array"}`,
        );
      }
    } catch (err) {
      console.error("Error fetching divisions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
              onClick={handleRetrieveDivisions}
              disabled={!isValidDSL(dsl) || loading}
              style={{
                padding: "12px 20px",
                background: isValidDSL(dsl) && !loading ? "#3b82f6" : "#9ca3af",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isValidDSL(dsl) && !loading ? "pointer" : "not-allowed",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {loading ? "🔄 Searching..." : "🔍 Retrieve Matching Divisions"}
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

        {/* Error Display */}
        {error && (
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Display */}
        {(divisions || contributions) && (
          <div
            style={{
              marginTop: "24px",
              borderTop: "2px solid rgba(229, 231, 235, 0.8)",
              paddingTop: "24px",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                color: "#1f2937",
                fontSize: "20px",
              }}
            >
              📊 Search Results
            </h3>

            {divisions && Object.keys(divisions).length > 0 ? (
              <div>
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "12px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #10b981",
                    borderRadius: "6px",
                    fontSize: "14px",
                    color: "#047857",
                  }}
                >
                  Found <strong>{Object.keys(divisions).length}</strong>{" "}
                  matching divisions
                </div>

                <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {Object.entries(divisions).map(([divisionId, division]) => (
                    <div
                      key={divisionId}
                      style={{
                        marginBottom: "20px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      {/* Division Header */}
                      <div
                        style={{
                          padding: "16px",
                          backgroundColor: "#f9fafb",
                          borderBottom: "1px solid #e5e7eb",
                          borderRadius: "8px 8px 0 0",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 8px 0",
                            color: "#111827",
                            fontSize: "16px",
                          }}
                        >
                          {division.division_title}
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#6b7280",
                              marginBottom: "8px",
                            }}
                          >
                            📅{" "}
                            {new Date(
                              division.division_date_time,
                            ).toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#6b7280",
                              marginBottom: "8px",
                            }}
                          >
                            ✅ Ayes: <strong>{division.ayes}</strong> | ❌ Noes:{" "}
                            <strong>{division.noes}</strong>
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#6b7280",
                              marginBottom: "8px",
                            }}
                          >
                            🆔 Division ID: <strong>{divisionId}</strong>
                          </div>
                          <a
                            href={division.context_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "14px",
                              color: "#3b82f6",
                              textDecoration: "none",
                            }}
                          >
                            🔗 View in Hansard
                          </a>
                        </div>
                      </div>

                      {/* Associated Contributions */}
                      {contributions &&
                      contributions[division.debate_id] &&
                      contributions[division.debate_id].length > 0 ? (
                        <div style={{ padding: "16px" }}>
                          <h5
                            style={{
                              margin: "0 0 12px 0",
                              color: "#374151",
                              fontSize: "14px",
                            }}
                          >
                            💬 Related Contributions (
                            {contributions[division.debate_id].length})
                          </h5>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                            }}
                          >
                            {contributions[division.debate_id].map(
                              (contribution, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: "12px",
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    fontSize: "14px",
                                    maxWidth: "500px",
                                    marginLeft: "auto",
                                    marginRight: "auto",
                                  }}
                                >
                                  <div
                                    style={{
                                      marginBottom: "8px",
                                      fontStyle: "italic",
                                      color: "#475569",
                                      lineHeight: "1.4",
                                    }}
                                  >
                                    "{contribution.value}"
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "12px",
                                      fontSize: "12px",
                                      color: "#64748b",
                                    }}
                                  >
                                    <span>
                                      <strong>👤 {contribution.name}</strong>
                                    </span>
                                    <span>🏛️ {contribution.party}</span>
                                    <span>📍 {contribution.constituency}</span>
                                    {contribution.context_url && (
                                      <a
                                        href={contribution.context_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "#3b82f6",
                                          textDecoration: "none",
                                        }}
                                      >
                                        🔗 Source
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "16px" }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "14px",
                              color: "#6b7280",
                              fontStyle: "italic",
                            }}
                          >
                            No matching contributions found for this division.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : divisions && Object.keys(divisions).length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  backgroundColor: "#fffbeb",
                  border: "1px solid #f59e0b",
                  borderRadius: "8px",
                  textAlign: "center",
                  color: "#92400e",
                }}
              >
                <strong>No matching divisions found</strong>
                <br />
                <span style={{ fontSize: "14px" }}>
                  Try adjusting your search criteria or using different terms.
                </span>
              </div>
            ) : null}
          </div>
        )}
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

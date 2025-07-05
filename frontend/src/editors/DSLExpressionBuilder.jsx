
import React, { useState } from "react";
import Modal from "../components/Modal";
import styles from "./DSLExpressionBuilder.module.css";

// DSL grammar for division finding - only these operations are allowed
const LOGICAL_OPS = ["and", "or", "not"];
const LEAF_OPS = ["contains", "icontains", "regex"];

export default function DSLExpressionBuilder({
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
    <div className={styles.container}>
      <div className={styles.operationType}>
        <label className={styles.label}>
          Operation Type:
        </label>
        <select
          value={expr.op || ""}
          onChange={(e) => handleTypeChange(e.target.value)}
          className={styles.select}
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
          <label className={styles.label}>
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
            className={styles.input}
          />
          <div className={styles.hint}>
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
          <div className={styles.conditionHeader}>
            <label className={styles.label}>
              Condition to negate:
            </label>
            <button
              onClick={() => openArgModal(0)}
              className={styles.editButton}
            >
              Edit Condition
            </button>
          </div>
          <div className={styles.summary}>
            {truncate(getExpressionSummary(expr.args))}
          </div>
        </div>
      )}

      {/* AND/OR operations */}
      {(expr.op === "and" || expr.op === "or") && (
        <div>
          <div className={styles.conditionHeader}>
            <label className={styles.label}>
              Conditions (
              {expr.op === "and" ? "ALL must be true" : "ANY can be true"}):
            </label>
            <button
              onClick={addArgument}
              className={styles.addButton}
            >
              + Add Condition
            </button>
          </div>

          {expr.args &&
            expr.args.map((arg, index) => (
              <div
                key={index}
                className={styles.condition}
              >
                <div className={styles.conditionItemHeader}>
                  <span className={styles.conditionTitle}>
                    Condition {index + 1}:
                  </span>
                  <div>
                    <button
                      onClick={() => openArgModal(index)}
                      className={styles.editButton}
                    >
                      Edit
                    </button>
                    {expr.args.length > 2 && (
                      <button
                        onClick={() => removeArgument(index)}
                        className={styles.removeButton}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.summary}>
                  {truncate(getExpressionSummary(arg))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal for editing nested expressions */}
      {showModal && (
        <Modal isOpen={showModal} onClose={closeModal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>
              Edit{" "}
              {expr.op === "not"
                ? "Condition"
                : `Condition ${editingArgIndex + 1}`}
              <span className={styles.modalSubtitle}>
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
            <div className={styles.modalFooter}>
              <button
                onClick={closeModal}
                className={styles.doneButton}
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

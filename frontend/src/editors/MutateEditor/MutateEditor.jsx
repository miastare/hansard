import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import ExpressionBuilder from "./ExpressionBuilder";
import { deriveSchema } from "../../utils/DeriveSchema";
import generateId from "../../utils/GenerateId";
import Dropdown from "../../components/Dropdown";
import ColumnsPreview from "../../components/ColumnsPreview";

export default function MutateEditor({
  step,
  onChange,
  availableInputs,
  tableSchemas,
  inputSchema,
}) {
  console.log(`🔄 MUTATE EDITOR [${step.id}]: === RENDERING ===`);
  console.log(`🔄 MUTATE EDITOR [${step.id}]: step:`, step);
  console.log(
    `🔄 MUTATE EDITOR [${step.id}]: availableInputs:`,
    availableInputs?.map((i) => ({ id: i.id, op: i.op })),
  );
  console.log(`🔄 MUTATE EDITOR [${step.id}]: inputSchema prop:`, inputSchema);

  // Convert legacy cols format to new format with stable IDs
  const initializeColumnsWithIds = (cols) => {
    if (!cols) return {};

    // Check if cols already has the new format (with _id properties)
    const hasIds = Object.values(cols).some(
      (col) => col && typeof col === "object" && col._id,
    );

    if (hasIds) return cols;

    // Convert legacy format to new format
    const newCols = {};
    Object.entries(cols).forEach(([name, expr]) => {
      const id = generateId("col");
      newCols[name] = {
        _id: id,
        expr: expr,
      };
    });
    return newCols;
  };

  const [cols, setCols] = useState(() => initializeColumnsWithIds(step.cols));
  const [validationErrors, setValidationErrors] = useState({});
  const [hoveredInput, setHoveredInput] = useState(null);
  const [columnWindowStart, setColumnWindowStart] = useState(0);
  const [showAllColumnsModal, setShowAllColumnsModal] = useState(false);
  const [editingExpressionId, setEditingExpressionId] = useState(null); // Track which expression is being edited in modal
  const validationTimeouts = useRef({});

  const COLUMNS_PER_WINDOW = 4;

  // Get schema for the selected input
  const getInputSchema = () => {
    console.log(`📊 SCHEMA [${step.id}]: === getInputSchema called ===`);
    console.log(`📊 SCHEMA [${step.id}]: step.input:`, step.input);
    console.log(`📊 SCHEMA [${step.id}]: step.input type:`, typeof step.input);
    console.log(
      `📊 SCHEMA [${step.id}]: step.input is empty string:`,
      step.input === "",
    );
    console.log(
      `📊 SCHEMA [${step.id}]: step.input is null:`,
      step.input === null,
    );
    console.log(
      `📊 SCHEMA [${step.id}]: step.input is undefined:`,
      step.input === undefined,
    );
    console.log(`📊 SCHEMA [${step.id}]: availableInputs:`, availableInputs);
    console.log(
      `📊 SCHEMA [${step.id}]: availableInputs mapped:`,
      availableInputs?.map((i) => ({ id: i.id, op: i.op, table: i.table })),
    );
    console.log(`📊 SCHEMA [${step.id}]: tableSchemas:`, tableSchemas);
    console.log(
      `📊 SCHEMA [${step.id}]: tableSchemas keys:`,
      Object.keys(tableSchemas || {}),
    );

    // If step has a specific input, use that
    if (step.input && step.input !== "" && availableInputs) {
      console.log(
        `📊 SCHEMA [${step.id}]: Looking for input step with ID: ${step.input}`,
      );
      const inputStep = availableInputs.find((s) => s.id === step.input);
      console.log(`📊 SCHEMA [${step.id}]: Found inputStep:`, inputStep);

      if (inputStep) {
        console.log(
          `📊 SCHEMA [${step.id}]: Processing inputStep - op: ${inputStep.op}, table: ${inputStep.table}`,
        );

        if (inputStep.op === "source" && inputStep.table) {
          console.log(
            `📊 SCHEMA [${step.id}]: Input is source step, getting table schema for: ${inputStep.table}`,
          );
          const schemaWrapper = tableSchemas[inputStep.table];
          console.log(`📊 SCHEMA [${step.id}]: Schema wrapper:`, schemaWrapper);

          if (schemaWrapper) {
            // Handle both wrapper format {cols: [...]} and direct array format
            const schema = schemaWrapper.cols || schemaWrapper;
            console.log(`📊 SCHEMA [${step.id}]: Extracted schema:`, schema);
            console.log(
              `📊 SCHEMA [${step.id}]: Schema is array:`,
              Array.isArray(schema),
            );
            console.log(
              `📊 SCHEMA [${step.id}]: Schema length:`,
              schema?.length,
            );

            if (Array.isArray(schema)) {
              console.log(
                `📊 SCHEMA [${step.id}]: ✅ Returning source schema with ${schema.length} columns`,
              );
              return schema;
            } else {
              console.log(
                `📊 SCHEMA [${step.id}]: ❌ Schema is not an array:`,
                typeof schema,
              );
              return [];
            }
          } else {
            console.log(
              `📊 SCHEMA [${step.id}]: ❌ No schema found for table: ${inputStep.table}`,
            );
            console.log(
              `📊 SCHEMA [${step.id}]: Available tables:`,
              Object.keys(tableSchemas || {}),
            );
            return [];
          }
        } else {
          // For non-source steps (like other mutate steps), derive the schema
          console.log(
            `📊 SCHEMA [${step.id}]: Input is ${inputStep.op} step, deriving schema`,
          );
          console.log(
            `📊 SCHEMA [${step.id}]: Calling deriveSchema with inputStep:`,
            inputStep,
          );

          const derivedSchema = deriveSchema(
            inputStep,
            availableInputs,
            tableSchemas,
          );
          console.log(
            `📊 SCHEMA [${step.id}]: deriveSchema returned:`,
            derivedSchema,
          );
          console.log(
            `📊 SCHEMA [${step.id}]: Derived schema is array:`,
            Array.isArray(derivedSchema),
          );
          console.log(
            `📊 SCHEMA [${step.id}]: Derived schema length:`,
            derivedSchema?.length,
          );

          if (Array.isArray(derivedSchema)) {
            console.log(
              `📊 SCHEMA [${step.id}]: ✅ Returning derived schema with ${derivedSchema.length} columns`,
            );
            return derivedSchema;
          } else {
            console.log(
              `📊 SCHEMA [${step.id}]: ❌ Derived schema is not an array, returning empty`,
            );
            return [];
          }
        }
      } else {
        console.log(
          `📊 SCHEMA [${step.id}]: ❌ No input step found with ID: ${step.input}`,
        );
        console.log(
          `📊 SCHEMA [${step.id}]: Available step IDs:`,
          availableInputs?.map((s) => s.id),
        );
        return [];
      }
    }

    console.log(
      `📊 SCHEMA [${step.id}]: ❌ No valid input found - step.input: ${step.input}, availableInputs exists: ${!!availableInputs}`,
    );
    return [];
  };

  const computedSchema = getInputSchema();
  const schema = inputSchema || computedSchema;
  const currentSchema = schema || [];

  console.log(
    `🎯 FINAL SCHEMA [${step.id}]: Using ${inputSchema ? "prop" : "computed"} schema`,
  );
  console.log(`🎯 FINAL SCHEMA [${step.id}]: currentSchema:`, currentSchema);
  console.log(
    `🎯 FINAL SCHEMA [${step.id}]: currentSchema length:`,
    currentSchema.length,
  );

  const updateStep = useCallback(
    (newCols) => {
      setCols(newCols);
      // Convert back to legacy format for the step
      const legacyCols = {};
      Object.entries(newCols).forEach(([name, colData]) => {
        legacyCols[name] = colData.expr;
      });
      onChange({ ...step, cols: legacyCols });
    },
    [step, onChange],
  );

  const updateInput = useCallback(
    (newInput) => {
      console.log(
        `🔄 INPUT CHANGE [${step.id}]: Input changed from ${step.input} to ${newInput}`,
      );
      console.log(`🔄 INPUT CHANGE [${step.id}]: New step object:`, {
        ...step,
        input: newInput,
      });
      onChange({ ...step, input: newInput });
    },
    [step, onChange],
  );

  const addColumn = () => {
    const existingInputColumns = currentSchema.map((col) => col.name);
    let newName = `new_col_${Object.keys(cols).length + 1}`;

    // Ensure the generated name doesn't conflict with input columns
    let counter = Object.keys(cols).length + 1;
    while (existingInputColumns.includes(newName)) {
      counter++;
      newName = `new_col_${counter}`;
    }

    const defaultExpr = { type: "constant", valueType: "int64", value: 0 };
    const id = generateId("col");
    const newCols = {
      ...cols,
      [newName]: {
        _id: id,
        expr: defaultExpr,
      },
    };
    updateStep(newCols);
  };

  const updateColumnName = useCallback(
    (oldName, newName) => {
      if (oldName === newName) return;

      const stableId = cols[oldName]?._id;

      // Clear any existing timeout for this column
      if (validationTimeouts.current[stableId]) {
        clearTimeout(validationTimeouts.current[stableId]);
      }

      // Clear existing error immediately when typing
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[stableId];
        return newErrors;
      });

      if (newName === "") {
        // Always update the step even for empty names
        const newCols = { ...cols };
        newCols[newName] = newCols[oldName];
        delete newCols[oldName];
        updateStep(newCols);
        return;
      }

      // Always update the step first (allow typing)
      const newCols = { ...cols };
      newCols[newName] = newCols[oldName];
      delete newCols[oldName];
      updateStep(newCols);

      // Check for conflicts after a delay
      const existingInputColumns = currentSchema.map((col) => col.name);
      if (existingInputColumns.includes(newName)) {
        validationTimeouts.current[stableId] = setTimeout(() => {
          setValidationErrors((prev) => ({
            ...prev,
            [stableId]: `Column name "${newName}" already exists in input schema`,
          }));
        }, 200);
      }
    },
    [cols, updateStep, currentSchema],
  );

  const updateColumnExpr = (name, expr) => {
    const newCols = {
      ...cols,
      [name]: {
        ...cols[name],
        expr: expr,
      },
    };
    updateStep(newCols);
  };

  const removeColumn = (name) => {
    const stableId = cols[name]?._id;

    // Clear timeout and error for this column
    if (stableId && validationTimeouts.current[stableId]) {
      clearTimeout(validationTimeouts.current[stableId]);
      delete validationTimeouts.current[stableId];
    }
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[stableId];
      return newErrors;
    });

    // Clear modal state if this expression was being edited
    if (editingExpressionId === stableId) {
      setEditingExpressionId(null);
    }

    const newCols = { ...cols };
    delete newCols[name];
    updateStep(newCols);
  };

  const openExpressionModal = (id) => {
    setEditingExpressionId(id);
  };

  const closeExpressionModal = () => {
    setEditingExpressionId(null);
  };

  // Prepare dropdown options
  const inputOptions =
    availableInputs?.map((input) => ({
      value: input.id,
      label: `${input.id} (${input.op})`,
      icon: input.op === "source" ? "📋" : "🔧",
    })) || [];

  // Get columns for current window
  const windowedColumns = currentSchema.slice(
    columnWindowStart,
    columnWindowStart + COLUMNS_PER_WINDOW,
  );
  const totalWindows = Math.ceil(currentSchema.length / COLUMNS_PER_WINDOW);
  const currentWindow = Math.floor(columnWindowStart / COLUMNS_PER_WINDOW) + 1;

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeouts.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
    };
  }, []);

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
        Mutate Columns
      </h4>

      {/* Input Selection Row */}
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
            🔗 Input step:
          </label>
          <div style={{ position: "relative", zIndex: 100 }}>
            <Dropdown
              value={step.input || ""}
              onChange={updateInput}
              options={inputOptions}
              placeholder="Select input step"
              onHover={handleInputHover}
            />
          </div>
        </div>

        {/* Available Columns Preview - only when input is selected */}
        {(step.input || hoveredInput) && currentSchema.length > 0 ? (
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
                📊 Available columns ({currentSchema.length})
              </span>
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

            {/* Windowed Column Display */}
            <div
              style={{
                background: "rgba(248, 250, 252, 0.8)",
                border: "1px solid rgba(203, 213, 225, 0.4)",
                borderRadius: "8px",
                padding: "12px",
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
                        color:
                          col.dtype === "str"
                            ? "#10b981"
                            : col.dtype === "numeric" || col.dtype === "int64"
                              ? "#3b82f6"
                              : col.dtype === "bool"
                                ? "#f59e0b"
                                : "#6b7280",
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
                        Math.max(0, columnWindowStart - COLUMNS_PER_WINDOW),
                      )
                    }
                    disabled={columnWindowStart === 0}
                    style={{
                      padding: "4px 8px",
                      background:
                        columnWindowStart === 0 ? "#f3f4f6" : "#e5e7eb",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        columnWindowStart === 0 ? "not-allowed" : "pointer",
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
                          currentSchema.length - COLUMNS_PER_WINDOW,
                          columnWindowStart + COLUMNS_PER_WINDOW,
                        ),
                      )
                    }
                    disabled={
                      columnWindowStart + COLUMNS_PER_WINDOW >=
                      currentSchema.length
                    }
                    style={{
                      padding: "4px 8px",
                      background:
                        columnWindowStart + COLUMNS_PER_WINDOW >=
                        currentSchema.length
                          ? "#f3f4f6"
                          : "#e5e7eb",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        columnWindowStart + COLUMNS_PER_WINDOW >=
                        currentSchema.length
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
          </div>
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

      {/* Scrollable Column Definitions Container */}
      <div
        style={{
          flex: "1",
          overflowY: "auto",
          marginBottom: "20px",
          paddingRight: "8px",
        }}
      >
        {Object.entries(cols).map(([name, colData]) => {
          const stableId = colData._id;
          const expr = colData.expr;
          const hasError = validationErrors[stableId];

          // Helper function to get expression summary
          const getExpressionSummary = (expr) => {
            if (!expr || typeof expr !== 'object') {
              return 'Invalid expression';
            }

            if (expr.type === 'constant') {
              return `${expr.value} (${expr.valueType})`;
            } else if (expr.type === 'column') {
              return `Column: ${expr.columnName || 'unnamed'}`;
            } else if (expr.type === 'dynamic') {
              if (!expr.args || !Array.isArray(expr.args)) {
                return `${expr.operator || 'unknown'}(no args)`;
              }
              const argSummaries = expr.args.map(arg => getExpressionSummary(arg)).join(', ');
              return `${expr.operator || 'unknown'}(${argSummaries})`;
            } else {
              return 'Unknown expression type';
            }
          };

          const truncate = (text, maxLength = 60) => {
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
          };

          return (
            <div
              key={`column-${stableId}`}
              style={{
                marginBottom: "16px",
                border: hasError
                  ? "2px solid #ef4444"
                  : "2px solid rgba(203, 213, 225, 0.4)",
                borderRadius: "12px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                padding: "20px",
              }}
            >
              {/* LHS = RHS Row */}
              {!hasError ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "8px",
                  }}
                >
                  {/* LHS Input */}
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updateColumnName(name, e.target.value)}
                    placeholder="column_name"
                    style={{
                      padding: "12px 16px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      background: "rgba(255, 255, 255, 0.8)",
                      minWidth: "120px",
                      maxWidth: "200px",
                      width: `${Math.max(120, Math.min(200, name.length * 8 + 32))}px`,
                    }}
                  />
                  
                  {/* Equals Sign */}
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#374151",
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    =
                  </span>
                  
                  {/* RHS Expression */}
                  <div
                    onClick={() => openExpressionModal(stableId)}
                    style={{
                      flex: "1",
                      padding: "12px 16px",
                      border: "2px solid #e2e8f0",
                      borderRadius: "8px",
                      backgroundColor: "#f9fafb",
                      cursor: "pointer",
                      fontSize: "14px",
                      color: "#6b7280",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      minWidth: "200px",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = "#3b82f6";
                      e.target.style.backgroundColor = "#eff6ff";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.backgroundColor = "#f9fafb";
                    }}
                  >
                    <span>
                      {truncate(getExpressionSummary(expr))}
                    </span>
                    <span style={{ color: "#3b82f6", fontSize: "12px" }}>
                      Click to edit →
                    </span>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => removeColumn(name)}
                    style={{
                      padding: "12px 16px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                    }}
                  >
                    🗑️ Remove
                  </button>
                </div>
              ) : (
                /* Error state - keep original layout for errors */
                <div>
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "600",
                        fontSize: "14px",
                        color: "#ef4444",
                      }}
                    >
                      Column name (LHS):
                    </label>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updateColumnName(name, e.target.value)}
                        placeholder="Enter column name"
                        style={{
                          padding: "12px 16px",
                          border: "2px solid #ef4444",
                          borderRadius: "8px",
                          flex: "1",
                          fontSize: "14px",
                          background: "rgba(255, 255, 255, 0.8)",
                        }}
                      />
                      <button
                        onClick={() => removeColumn(name)}
                        style={{
                          padding: "12px 16px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Message */}
              {hasError && (
                <div
                  style={{
                    marginTop: "8px",
                    color: "#ef4444",
                    fontSize: "12px",
                    fontWeight: "500",
                  }}
                >
                  {hasError}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed Footer with Add Column Button */}
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
          onClick={addColumn}
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
          ➕ Add Column
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
            ⚠️ Please select an input step before adding columns
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
                  📊 All Available Columns ({currentSchema.length})
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
                  {currentSchema.map((col) => (
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
                          color:
                            col.dtype === "str"
                              ? "#10b981"
                              : col.dtype === "numeric" || col.dtype === "int64"
                                ? "#3b82f6"
                                : col.dtype === "bool"
                                  ? "#f59e0b"
                                  : "#6b7280",
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

      {/* Expression Editing Modal using React Portal */}
      {editingExpressionId &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000, // Higher than columns modal
              padding: "20px",
            }}
            onClick={closeExpressionModal}
          >
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "32px",
                width: "95vw",
                height: "90vh",
                maxWidth: "1400px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                // Find the column being edited
                const columnEntry = Object.entries(cols).find(([name, colData]) => 
                  colData._id === editingExpressionId
                );
                
                if (!columnEntry) return null;
                
                const [columnName, colData] = columnEntry;
                const expr = colData.expr;

                return (
                  <>
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
                        🔧 Edit Expression for "{columnName}"
                      </h2>
                      <button
                        onClick={closeExpressionModal}
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
                        ✓ Done
                      </button>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        overflow: "auto",
                        paddingRight: "8px",
                      }}
                    >
                      <ExpressionBuilder
                        expr={expr}
                        onChange={(newExpr) => updateColumnExpr(columnName, newExpr)}
                        availableColumns={currentSchema || []}
                        modalDepth={1}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

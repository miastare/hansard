import React, { useState } from "react";
import {
  SourceEditor,
  FilterEditor,
  MutateEditor,
  AggregateEditor,
  JoinEditor,
  DivisionVotesEditor,
  BaseEditor,
} from "./editors";
import styles from "./DSLBuilder.module.css";

export default function StepCard({
  step,
  onUpdate,
  onDelete,
  availableInputs,
  tableSchemas,
  requestSchema,
  stepIndex,
  totalSteps,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate z-index: earlier steps get higher z-index
  // Base z-index of 1000, with each earlier step getting +10
  const dynamicZIndex = 1000 + (totalSteps - stepIndex) * 10;

  const handleUpdate = (field, value) => {
    console.log(
      `STEP CARD: Updating step ${step.id} field ${field} to:`,
      value,
    );
    const updatedStep = { ...step, [field]: value };
    console.log(`STEP CARD: Updated step object:`, updatedStep);
    onUpdate(updatedStep);
  };

  const handleBatchUpdate = (updates) => {
    console.log(`STEP CARD: Batch updating step ${step.id} with:`, updates);
    const updatedStep = { ...step, ...updates };
    console.log(`STEP CARD: Batch updated step object:`, updatedStep);
    onUpdate(updatedStep);
  };

  const renderEditor = () => {
    switch (step.op) {
      case "source":
        return (
          <SourceEditor
            step={step}
            onChange={onUpdate}
            tableSchemas={tableSchemas || {}}
            requestSchema={requestSchema}
          />
        );
      case "filter":
        return (
          <FilterEditor
            step={step}
            onUpdate={handleUpdate}
            onBatchUpdate={handleBatchUpdate}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
          />
        );
      case "mutate":
        const updateStep = (updatedStep) => {
          console.log(`MUTATE STEP CARD: Received updated step:`, updatedStep);
          onUpdate(updatedStep);
        };

        return (
          <MutateEditor
            step={step}
            onChange={updateStep}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
            inputSchema={null}
          />
        );
      case "aggregate":
        return (
          <AggregateEditor
            step={step}
            onUpdate={handleUpdate}
            onBatchUpdate={handleBatchUpdate}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
          />
        );
      case "join":
        return (
          <JoinEditor
            step={step}
            onUpdate={handleUpdate}
            onBatchUpdate={handleBatchUpdate}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
          />
        );
      case "division_votes":
        return <DivisionVotesEditor step={step} onUpdate={onUpdate} />;
      default:
        return (
          <BaseEditor
            step={step}
            onUpdate={onUpdate}
            availableInputs={availableInputs}
            tableSchemas={tableSchemas}
            requestSchema={requestSchema}
          />
        );
    }
  };

  return (
    <div
      className={`${styles.card} ${styles.stepCard}`}
      style={{ zIndex: dynamicZIndex }}
    >
      <div
        className={styles.cardHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.stepInfo}>
          <h3 className={styles.stepTitle}>
            Step {step.id}: {step.op.charAt(0).toUpperCase() + step.op.slice(1)}
          </h3>
          {step.op === "source" && step.table && (
            <span className={styles.stepSubtitle}>Table: {step.table}</span>
          )}
          {step.op !== "source" && step.input && (
            <span className={styles.stepSubtitle}>Input: {step.input}</span>
          )}
        </div>
        <div className={styles.cardActions}>
          <button
            className={styles.toggleButton}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(step.id);
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      <div
        className={styles.cardContent}
        style={{
          maxHeight: isExpanded ? "1000px" : "0",
          opacity: isExpanded ? 1 : 0,
          padding: isExpanded ? "0 24px 24px 24px" : "0 24px 0 24px",
          pointerEvents: isExpanded ? "auto" : "none",
        }}
      >
        {renderEditor()}
      </div>
    </div>
  );
}

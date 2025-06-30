
import React, { useState } from 'react';
import SourceEditor from './editors/SourceEditor';
import FilterEditor from './editors/FilterEditor';
import MutateEditor from './editors/MutateEditor/MutateEditor';
import AggregateEditor from './editors/AggregateEditor';
import JoinEditor from './editors/JoinEditor';
import styles from './DSLBuilder.module.css';

const StepCard = ({ 
  step, 
  index, 
  onUpdate, 
  onRemove, 
  availableInputs, 
  tableSchemas, 
  requestSchema,
  isExpanded,
  isInFocus,
  onToggleExpansion 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!step || !step.op) {
    return (
      <div className={`${styles.stepCard} ${styles.errorCard}`}>
        <p>Invalid step configuration</p>
        <button onClick={() => onRemove(index)} className={styles.dangerButton}>
          🗑️ Remove
        </button>
      </div>
    );
  }

  const handleUpdate = (field, value) => {
    const updatedStep = { ...step, [field]: value };
    onUpdate(index, updatedStep);
  };

  const handleBatchUpdate = (updates) => {
    const updatedStep = { ...step, ...updates };
    onUpdate(index, updatedStep);
  };

  const getOperationIcon = (op) => {
    const icons = {
      source: '📋',
      filter: '🔍',
      mutate: '🔧',
      aggregate: '📊',
      join: '🔗',
      division_votes: '🗳️'
    };
    return icons[op] || '❓';
  };

  const getOperationSummary = () => {
    switch (step.op) {
      case 'source':
        return step.table ? `Table: ${step.table}` : 'No table selected';
      case 'filter':
        const conditionCount = step.conditions?.length || 0;
        return `${conditionCount} condition${conditionCount !== 1 ? 's' : ''}`;
      case 'mutate':
        const colCount = Object.keys(step.cols || {}).length;
        const colNames = Object.keys(step.cols || {}).slice(0, 2).join(', ');
        return colCount > 0 
          ? `${colCount} column${colCount !== 1 ? 's' : ''}: ${colNames}${colCount > 2 ? '...' : ''}`
          : 'No columns defined';
      case 'aggregate':
        const groupCount = step.group?.length || 0;
        const metricCount = Object.keys(step.metrics || {}).length;
        return `Group by ${groupCount}, ${metricCount} metric${metricCount !== 1 ? 's' : ''}`;
      case 'join':
        const inputCount = step.inputs?.length || 0;
        const joinType = step.how || 'outer';
        return `${joinType} join of ${inputCount} table${inputCount !== 1 ? 's' : ''}`;
      case 'division_votes':
        const divisionCount = step.division_ids?.length || 0;
        return `${divisionCount} division${divisionCount !== 1 ? 's' : ''}`;
      default:
        return 'Unknown operation';
    }
  };

  const renderEditor = () => {
    switch (step.op) {
      case 'source':
        return (
          <SourceEditor
            step={step}
            onChange={(updatedStep) => onUpdate(index, updatedStep)}
            requestSchema={requestSchema}
            showAdvanced={showAdvanced}
          />
        );
      case 'filter':
        return (
          <FilterEditor
            step={step}
            onUpdate={handleUpdate}
            onBatchUpdate={handleBatchUpdate}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
            showAdvanced={showAdvanced}
          />
        );
      case 'mutate':
        const updateStep = (updatedStep) => {
          onUpdate(index, updatedStep);
        };

        return (
          <MutateEditor 
            step={step} 
            onChange={updateStep} 
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
            inputSchema={null}
            showAdvanced={showAdvanced}
          />
        );
      case 'aggregate':
        return (
          <AggregateEditor
            step={step}
            onUpdate={handleUpdate}
            onBatchUpdate={handleBatchUpdate}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
            showAdvanced={showAdvanced}
          />
        );
      case 'join':
        return (
          <JoinEditor
            step={step}
            onUpdate={handleUpdate}
            onBatchUpdate={handleBatchUpdate}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
            showAdvanced={showAdvanced}
          />
        );
      case 'division_votes':
        return (
          <div className={styles.editorContent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span className={styles.labelText}>Division IDs:</span>
                <input 
                  type="text" 
                  value={(step.division_ids || []).join(', ')} 
                  onChange={(e) => handleUpdate('division_ids', e.target.value.split(', ').map(Number).filter(Boolean))}
                  placeholder="Enter comma-separated division IDs"
                  className={styles.input}
                />
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span className={styles.labelText}>House:</span>
                <select 
                  value={step.house || 1} 
                  onChange={(e) => handleUpdate('house', Number(e.target.value))}
                  className={styles.select}
                >
                  <option value={1}>Commons</option>
                  <option value={2}>Lords</option>
                </select>
              </label>
            </div>
          </div>
        );
      default:
        return <div>Unsupported operation: {step.op}</div>;
    }
  };

  return (
    <div className={`
      ${styles.stepCard} 
      ${isInFocus ? styles.focusCard : ''} 
      ${isExpanded ? styles.expandedCard : styles.collapsedCard}
    `}>
      <div className={styles.cardHeader} onClick={onToggleExpansion}>
        <div className={styles.cardHeaderMain}>
          <div className={styles.stepIcon}>
            {getOperationIcon(step.op)}
          </div>
          <div className={styles.stepInfo}>
            <h3 className={styles.stepTitle}>
              Step {index + 1}: {step.op}
            </h3>
            <p className={styles.stepSummary}>
              {getOperationSummary()}
            </p>
          </div>
        </div>
        <div className={styles.cardHeaderActions}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }} 
            className={styles.removeButton}
            title="Remove step"
          >
            🗑️
          </button>
          <button className={styles.expandButton} title={isExpanded ? "Collapse" : "Expand"}>
            {isExpanded ? '🔼' : '🔽'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.cardBody}>
          <div className={styles.editorHeader}>
            <h4 className={styles.editorTitle}>
              Configure {step.op} operation
            </h4>
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={styles.toggleAdvanced}
            >
              {showAdvanced ? '🔼' : '🔽'} {showAdvanced ? 'Hide' : 'Show'} Advanced
            </button>
          </div>
          <div className={styles.editorWrapper}>
            {renderEditor()}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepCard;

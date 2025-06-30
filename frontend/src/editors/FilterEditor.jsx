import React, { useState, useCallback } from 'react';
import { deriveSchema } from '../utils/DeriveSchema';

export default function FilterEditor({ step, onUpdate, availableInputs, tableSchemas, onBatchUpdate }) {
  const [conditions, setConditions] = useState(step.conditions || []);

  // Get schema for the selected input (similar to MutateEditor logic)
  const getInputSchema = () => {
    // If step has a specific input, use that
    if (step.input && step.input !== '' && availableInputs) {
      const inputStep = availableInputs.find(s => String(s.id) === String(step.input));

      if (inputStep) {
        if (inputStep.op === 'source' && inputStep.table) {
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
          const derivedSchema = deriveSchema(inputStep, availableInputs, tableSchemas);

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

  const updateStep = useCallback((newConditions) => {
    setConditions(newConditions);
    onUpdate('conditions', newConditions);
  }, [onUpdate]);

  const updateInput = useCallback((newInput) => {
    // Clear conditions when input changes since schema might be different
    setConditions([]);

    // Update both input and conditions atomically to prevent race condition
    if (onBatchUpdate) {
      onBatchUpdate({ input: newInput, conditions: [] });
    } else {
      // Fallback to individual updates
      onUpdate('input', newInput);
      onUpdate('conditions', []);
    }
  }, [onUpdate, onBatchUpdate]);

  const addCondition = () => {
    const newConditions = [...conditions, { column: '' }];
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

  return (
    <div className="editorContent">
      <div className="formGroup">
        <label className="label">
          <span className="labelText">🔗 Input step:</span>
          <select 
            value={step.input || ''} 
            onChange={(e) => {
              updateInput(e.target.value);
            }}
            className="select"
          >
            <option value="">Select input step</option>
            {availableInputs?.map(input => (
              <option key={input.id} value={input.id}>
                {input.id} ({input.op})
              </option>
            ))}
          </select>
        </label>
      </div>

      

      {conditions.map((condition, index) => (
        <div key={index} style={{ 
          marginBottom: '20px', 
          border: '2px solid rgba(102, 126, 234, 0.1)', 
          padding: '20px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <label className="label">
                <span className="labelText">🔍 Boolean Column:</span>
                <select
                  value={condition.column || ''}
                  onChange={(e) => updateCondition(index, 'column', e.target.value)}
                  className="select"
                >
                  <option value="">Select boolean column</option>
                  {currentSchema?.filter(col => col.dtype === 'bool').map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <button 
                onClick={() => removeCondition(index)}
                className="dangerButton"
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      <button 
        onClick={addCondition}
        disabled={!step.input}
        className="button"
        style={{
          background: step.input ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#cbd5e1',
          cursor: step.input ? 'pointer' : 'not-allowed',
        }}
      >
        ➕ Add Condition
      </button>

      {!step.input && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: 'rgba(251, 211, 141, 0.2)', 
          border: '1px solid rgba(251, 211, 141, 0.3)',
          borderRadius: '8px',
          fontSize: '14px', 
          color: '#92400e', 
          fontStyle: 'italic',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ Please select an input step before adding conditions
        </div>
      )}
    </div>
  );
}
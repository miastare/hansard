import React, { useState, useCallback } from 'react';
import ExpressionBuilder from './ExpressionBuilder';
import { deriveSchema } from '../../utils/DeriveSchema';

export default function MutateEditor({ step, onChange, availableInputs, tableSchemas, inputSchema }) {
  console.log('MUTATE EDITOR: === RENDERING ===');
  console.log('MUTATE EDITOR: step:', step);
  console.log('MUTATE EDITOR: availableInputs:', availableInputs);
  console.log('MUTATE EDITOR: tableSchemas:', tableSchemas);
  console.log('MUTATE EDITOR: inputSchema prop:', inputSchema);

  const [cols, setCols] = useState(step.cols || {});

  // Get schema for the selected input
  const getInputSchema = useCallback(() => {
    console.log('MUTATE EDITOR: === getInputSchema called ===');
    console.log('MUTATE EDITOR: step.input:', step.input);
    console.log('MUTATE EDITOR: availableInputs length:', availableInputs?.length);
    console.log('MUTATE EDITOR: availableInputs:', availableInputs);
    console.log('MUTATE EDITOR: tableSchemas keys:', Object.keys(tableSchemas || {}));

    // If no input is selected but there are available inputs, try to use the first/last one
    if (!step.input && availableInputs && availableInputs.length > 0) {
      console.log('MUTATE EDITOR: No step.input but availableInputs exist - using last available input');
      const lastInput = availableInputs[availableInputs.length - 1];
      console.log('MUTATE EDITOR: Using lastInput:', lastInput);

      if (lastInput) {
        const schema = deriveSchema(lastInput, availableInputs, tableSchemas);
        console.log('MUTATE EDITOR: Derived schema from lastInput:', schema);
        return schema;
      }
    }

    if (step.input) {
      console.log('MUTATE EDITOR: Using step.input:', step.input);
      const inputStep = availableInputs?.find(s => s.id === step.input);
      console.log('MUTATE EDITOR: Found inputStep:', inputStep);
      if (inputStep) {
        const schema = deriveSchema(inputStep, [...availableInputs, step], tableSchemas);
        console.log('MUTATE EDITOR: Derived schema from inputStep:', schema);
        return schema;
      }
    }

    console.log('MUTATE EDITOR: No schema found - returning empty array');
    return [];
  }, [step, availableInputs, tableSchemas]);

  console.log(`MUTATE EDITOR: === SCHEMA COMPUTATION ===`);
  console.log(`MUTATE EDITOR: inputSchema prop:`, inputSchema);
  console.log(`MUTATE EDITOR: inputSchema prop type:`, typeof inputSchema);
  console.log(`MUTATE EDITOR: inputSchema prop Array.isArray:`, Array.isArray(inputSchema));

  const computedSchema = getInputSchema();
  console.log(`MUTATE EDITOR: computedSchema:`, computedSchema);
  console.log(`MUTATE EDITOR: computedSchema type:`, typeof computedSchema);
  console.log(`MUTATE EDITOR: computedSchema Array.isArray:`, Array.isArray(computedSchema));

  const schema = inputSchema || computedSchema;
  console.log(`MUTATE EDITOR: Final selected schema:`, schema);
  console.log('MUTATE EDITOR: Final schema type:', typeof schema);
  console.log('MUTATE EDITOR: Final schema Array.isArray:', Array.isArray(schema));

  const currentSchema = schema || [];
  console.log('MUTATE EDITOR: currentSchema after fallback:', currentSchema);
  console.log('MUTATE EDITOR: currentSchema length:', currentSchema.length);
  console.log('MUTATE EDITOR: currentSchema contents:', JSON.stringify(currentSchema, null, 2));

  console.log('MUTATE EDITOR: step.input:', step.input);
  console.log('MUTATE EDITOR: step.cols:', step.cols);

  const updateStep = useCallback((newCols) => {
    setCols(newCols);
    onChange({ ...step, cols: newCols });
  }, [step, onChange]);

  const updateInput = useCallback((newInput) => {
    console.log(`MUTATE EDITOR: Input changed to:`, newInput);
    onChange({ ...step, input: newInput });
  }, [step, onChange]);

  const addColumn = () => {
    const newName = `new_col_${Object.keys(cols).length + 1}`;
    const defaultExpr = { type: 'constant', valueType: 'int64', value: 0 };
    const newCols = { ...cols, [newName]: defaultExpr };
    updateStep(newCols);
  };

  const updateColumnName = (oldName, newName) => {
    if (oldName === newName) return;
    const newCols = { ...cols };
    newCols[newName] = newCols[oldName];
    delete newCols[oldName];
    updateStep(newCols);
  };

  const updateColumnExpr = (name, expr) => {
    const newCols = { ...cols, [name]: expr };
    updateStep(newCols);
  };

  const removeColumn = (name) => {
    const newCols = { ...cols };
    delete newCols[name];
    updateStep(newCols);
  };

  return (
    <div>
      <h4>Mutate Columns</h4>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Input step:
        </label>
        <select 
          value={step.input || ''} 
          onChange={(e) => updateInput(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">Select input</option>
          {availableInputs?.map(input => (
            <option key={input.id} value={input.id}>
              {input.id} ({input.op})
            </option>
          ))}
        </select>
      </div>

      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <strong style={{ fontSize: '14px', color: '#495057' }}>Available columns:</strong>
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
          {currentSchema && currentSchema.length > 0 ? (
            currentSchema.map(col => (
              <span key={col.name} style={{ 
                display: 'inline-block', 
                margin: '3px 8px 3px 0', 
                padding: '4px 8px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid #dee2e6'
              }}>
                {col.name} ({col.dtype})
              </span>
            ))
          ) : (
            <em>No schema available</em>
          )}
        </div>
      </div>

      {Object.entries(cols).map(([name, expr]) => (
        <div key={name} style={{ 
          marginBottom: '25px', 
          border: '2px solid #e9ecef', 
          padding: '20px',
          borderRadius: '10px',
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#495057'
            }}>
              Column name (LHS):
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => updateColumnName(name, e.target.value)}
              placeholder="Enter column name"
              style={{ 
                padding: '10px', 
                border: '2px solid #ddd', 
                borderRadius: '6px',
                width: '250px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#495057'
            }}>
              Expression (RHS):
            </label>
            <ExpressionBuilder 
              expr={expr} 
              onChange={(newExpr) => {
                console.log('MUTATE EDITOR: updateColumnExpr called with:', name, newExpr);
                updateColumnExpr(name, newExpr);
              }}
              availableColumns={currentSchema || []}
            />
          </div>

          <button 
            onClick={() => removeColumn(name)} 
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Remove Column
          </button>
        </div>
      ))}

      <button 
        onClick={addColumn}
        style={{
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: '500'
        }}
      >
        Add Column
      </button>
    </div>
  );
}
import React, { useState, useCallback } from 'react';
import Expr from './Expr';

export default function MutateEditor({ step, onChange, schema, availableInputs }) {
  const [cols, setCols] = useState(step.cols || {});

  const updateStep = useCallback((newCols) => {
    setCols(newCols);
    onChange({ ...step, cols: newCols });
  }, [step, onChange]);

  const updateInput = useCallback((newInput) => {
    onChange({ ...step, input: newInput });
  }, [step, onChange]);

  const addColumn = () => {
    const newName = `new_col_${Object.keys(cols).length + 1}`;
    // Create a proper default expression
    const defaultExpr = schema && schema.length > 0 
      ? { op: "add", args: [{ var: schema[0].name }, { const: 0 }] }
      : { var: schema && schema.length > 0 ? schema[0].name : "" };
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
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Input step:
        </label>
        <select 
          value={step.input || ''} 
          onChange={(e) => updateInput(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ccc', 
            borderRadius: '4px' 
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

      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <strong>Available columns:</strong>
        <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
          {schema && schema.length > 0 ? (
            schema.map(col => (
              <span key={col.name} style={{ 
                display: 'inline-block', 
                margin: '2px 8px 2px 0', 
                padding: '2px 6px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '3px',
                fontSize: '0.85em'
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
          marginBottom: '15px', 
          border: '1px solid #ddd', 
          padding: '15px',
          borderRadius: '6px',
          backgroundColor: '#fff'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Column name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => updateColumnName(name, e.target.value)}
              placeholder="Column name"
              style={{ 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                width: '200px'
              }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Expression:
            </label>
            <Expr 
              expr={expr} 
              onChange={(newExpr) => updateColumnExpr(name, newExpr)}
              cols={schema || []}
            />
          </div>

          <button 
            onClick={() => removeColumn(name)} 
            style={{ 
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Remove Column
          </button>
        </div>
      ))}

      <button 
        onClick={addColumn}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Add Column
      </button>
    </div>
  );
}
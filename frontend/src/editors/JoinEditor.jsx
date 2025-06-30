
import React, { useState, useCallback } from 'react';
import { deriveSchema } from '../utils/DeriveSchema';

export default function JoinEditor({ step, onUpdate, onBatchUpdate, availableInputs, tableSchemas }) {
  console.log('🔗 JOIN EDITOR: Rendering with step:', step);
  
  const [inputs, setInputs] = useState(step.inputs || []);
  const [joinType, setJoinType] = useState(step.how || 'inner');
  const [byColumns, setByColumns] = useState(step.on || []);
  const [suffixes, setSuffixes] = useState(step.suffixes || { left: '_x', right: '_y' });

  // Get schemas for the selected inputs
  const getInputSchemas = () => {
    if (!inputs || inputs.length < 2) return { left: [], right: [], common: [] };
    
    const leftInput = availableInputs.find(inp => inp.id === inputs[0]);
    const rightInput = availableInputs.find(inp => inp.id === inputs[1]);
    
    const leftSchema = leftInput ? deriveSchema(leftInput, availableInputs, tableSchemas) : [];
    const rightSchema = rightInput ? deriveSchema(rightInput, availableInputs, tableSchemas) : [];
    
    // Find common columns that can be used for joining
    const leftColNames = leftSchema.map(col => col.name);
    const rightColNames = rightSchema.map(col => col.name);
    const commonColumns = leftColNames.filter(name => rightColNames.includes(name));
    
    console.log('🔗 JOIN EDITOR: Left schema:', leftSchema);
    console.log('🔗 JOIN EDITOR: Right schema:', rightSchema);
    console.log('🔗 JOIN EDITOR: Common columns:', commonColumns);
    
    return { left: leftSchema, right: rightSchema, common: commonColumns };
  };

  const { left: leftSchema, right: rightSchema, common: commonColumns } = getInputSchemas();

  const updateStep = useCallback((updates) => {
    if (onBatchUpdate) {
      onBatchUpdate(updates);
    } else {
      Object.entries(updates).forEach(([key, value]) => {
        onUpdate(key, value);
      });
    }
  }, [onUpdate, onBatchUpdate]);

  const updateInputs = (newInputs) => {
    setInputs(newInputs);
    // Clear by columns when inputs change since available columns might be different
    setByColumns([]);
    updateStep({ inputs: newInputs, on: [] });
  };

  const updateJoinType = (newType) => {
    setJoinType(newType);
    updateStep({ how: newType });
  };

  const updateByColumns = (newByColumns) => {
    setByColumns(newByColumns);
    updateStep({ on: newByColumns });
  };

  const updateSuffixes = (side, value) => {
    const newSuffixes = { ...suffixes, [side]: value };
    setSuffixes(newSuffixes);
    updateStep({ suffixes: newSuffixes });
  };

  const addByColumn = () => {
    if (commonColumns.length > 0) {
      const newByColumns = [...byColumns, commonColumns[0]];
      updateByColumns(newByColumns);
    }
  };

  const updateByColumn = (index, value) => {
    const newByColumns = [...byColumns];
    newByColumns[index] = value;
    updateByColumns(newByColumns);
  };

  const removeByColumn = (index) => {
    const newByColumns = byColumns.filter((_, i) => i !== index);
    updateByColumns(newByColumns);
  };

  const addInput = (inputId) => {
    if (inputs.length < 2 && !inputs.includes(inputId)) {
      const newInputs = [...inputs, inputId];
      updateInputs(newInputs);
    }
  };

  const removeInput = (index) => {
    const newInputs = inputs.filter((_, i) => i !== index);
    updateInputs(newInputs);
  };

  return (
    <div>
      <h4>Join Step</h4>

      {/* Input Sources Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Input Sources (select exactly 2):
        </label>
        
        {inputs.map((inputId, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <span style={{ fontWeight: 'bold', minWidth: '50px' }}>
              {index === 0 ? 'Left:' : 'Right:'}
            </span>
            <span style={{ flex: 1, padding: '5px 10px', backgroundColor: '#fff', borderRadius: '4px' }}>
              {inputId} ({availableInputs.find(inp => inp.id === inputId)?.op || 'unknown'})
            </span>
            <button
              onClick={() => removeInput(index)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove
            </button>
          </div>
        ))}

        {inputs.length < 2 && (
          <div style={{ marginTop: '10px' }}>
            <select 
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  addInput(e.target.value);
                }
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select input to add</option>
              {availableInputs?.filter(input => !inputs.includes(input.id)).map(input => (
                <option key={input.id} value={input.id}>
                  {input.id} ({input.op})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Join Type Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Join Type:
        </label>
        <select
          value={joinType}
          onChange={(e) => updateJoinType(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          <option value="inner">Inner Join</option>
          <option value="left">Left Join</option>
          <option value="right">Right Join</option>
          <option value="outer">Full Outer Join</option>
        </select>
      </div>

      {/* Available Common Columns Info */}
      {inputs.length === 2 && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <strong style={{ fontSize: '14px', color: '#495057' }}>Available join columns:</strong>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
            {commonColumns.length > 0 ? (
              commonColumns.map(col => (
                <span key={col} style={{ 
                  display: 'inline-block', 
                  margin: '3px 8px 3px 0', 
                  padding: '4px 8px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: '1px solid #dee2e6'
                }}>
                  {col}
                </span>
              ))
            ) : (
              <em>No common columns found between the selected inputs</em>
            )}
          </div>
        </div>
      )}

      {/* By Columns Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Join By Columns:
        </label>
        
        {byColumns.map((column, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '2px solid #e9ecef'
          }}>
            <select
              value={column}
              onChange={(e) => updateByColumn(index, e.target.value)}
              style={{ 
                flex: 1,
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select column</option>
              {commonColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <button
              onClick={() => removeByColumn(index)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Remove
            </button>
          </div>
        ))}

        <button 
          onClick={addByColumn}
          disabled={inputs.length < 2 || commonColumns.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: (inputs.length === 2 && commonColumns.length > 0) ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (inputs.length === 2 && commonColumns.length > 0) ? 'pointer' : 'not-allowed',
            fontSize: '15px',
            fontWeight: '500'
          }}
        >
          Add Join Column
        </button>

        {(inputs.length < 2 || commonColumns.length === 0) && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d', fontStyle: 'italic' }}>
            {inputs.length < 2 
              ? 'Please select exactly 2 input sources before adding join columns'
              : 'No common columns available for joining'
            }
          </div>
        )}
      </div>

      {/* Suffixes Section */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Column Name Suffixes (for conflicting column names):
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
              Left Table Suffix:
            </label>
            <input
              type="text"
              value={suffixes.left}
              onChange={(e) => updateSuffixes('left', e.target.value)}
              placeholder="e.g. _x"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
              Right Table Suffix:
            </label>
            <input
              type="text"
              value={suffixes.right}
              onChange={(e) => updateSuffixes('right', e.target.value)}
              placeholder="e.g. _y"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
        {suffixes.left === suffixes.right && suffixes.left !== '' && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#dc3545', fontStyle: 'italic' }}>
            ⚠️ Left and right suffixes should be different
          </div>
        )}
      </div>
    </div>
  );
}

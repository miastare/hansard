import React, { useState, useCallback } from 'react';

export default function FilterEditor({ step, onChange, schema }) {
  const [conditions, setConditions] = useState(step.conditions || []);

  const updateStep = useCallback((newConditions) => {
    setConditions(newConditions);
    onChange({ ...step, conditions: newConditions });
  }, [step, onChange]);

  const addCondition = () => {
    const newConditions = [...conditions, { lhs: '', op: '=', rhs: '' }];
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
    <div>
      <h4>Filter Conditions</h4>

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

      {conditions.map((condition, index) => (
        <div key={index} style={{ 
          marginBottom: '15px', 
          border: '1px solid #ddd', 
          padding: '15px',
          borderRadius: '6px',
          backgroundColor: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={condition.lhs}
              onChange={(e) => updateCondition(index, 'lhs', e.target.value)}
              style={{ 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                minWidth: '150px'
              }}
            >
              <option value="">Select column</option>
              {schema?.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>

            <select
              value={condition.op}
              onChange={(e) => updateCondition(index, 'op', e.target.value)}
              style={{ 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                minWidth: '120px'
              }}
            >
              <option value="=">=</option>
              <option value="!=">!=</option>
              <option value="<">&lt;</option>
              <option value="<=">&lt;=</option>
              <option value=">">&gt;</option>
              <option value=">=">&gt;=</option>
              <option value="icontains">contains (case-insensitive)</option>
              <option value="noticontains">does not contain</option>
              <option value="regex">regex</option>
            </select>

            <input
              type="text"
              value={condition.rhs}
              onChange={(e) => updateCondition(index, 'rhs', e.target.value)}
              placeholder="Value"
              style={{ 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                minWidth: '150px'
              }}
            />

            <button 
              onClick={() => removeCondition(index)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button 
        onClick={addCondition}
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
        Add Condition
      </button>
    </div>
  );
}
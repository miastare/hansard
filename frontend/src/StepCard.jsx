import React from 'react';
import SourceEditor from './editors/SourceEditor';
import FilterEditor from './editors/FilterEditor';
import MutateEditor from './editors/MutateEditor/MutateEditor';

export default function StepCard({ 
  step, 
  index, 
  schema, 
  tableSchemas,
  requestSchema,
  availableInputs,
  onUpdate, 
  onRemove,
  onMoveUp,
  onMoveDown
}) {
  const renderEditor = () => {
    switch (step.op) {
      case 'source':
        return <SourceEditor step={step} onChange={onUpdate} tableSchemas={tableSchemas} requestSchema={requestSchema} />;
      case 'filter':
        return <FilterEditor step={step} onChange={onUpdate} schema={schema} />;
      case 'mutate':
        return <MutateEditor step={step} onChange={onUpdate} schema={schema} />;
      case 'aggregate':
        return (
          <div>
            <h4>Aggregate (Basic Implementation)</h4>
            <div style={{ marginBottom: '10px' }}>
              <label>Input step:</label>
              <select 
                value={step.input || ''} 
                onChange={(e) => onUpdate({...step, input: e.target.value})}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="">Select input</option>
                {availableInputs?.map(input => (
                  <option key={input.id} value={input.id}>{input.id} ({input.op})</option>
                ))}
              </select>
            </div>
            <p><em>Full aggregate editor coming soon...</em></p>
          </div>
        );
      case 'join':
        return (
          <div>
            <h4>Join (Basic Implementation)</h4>
            <p><em>Join editor coming soon...</em></p>
          </div>
        );
      case 'division_votes':
        return (
          <div>
            <h4>Division Votes (Basic Implementation)</h4>
            <p><em>Division votes editor coming soon...</em></p>
          </div>
        );
      default:
        return <div>Unknown operation: {step.op}</div>;
    }
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      margin: '15px 0', 
      padding: '20px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>
          Step {index + 1}: {step.op} 
          <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '10px' }}>
            ({step.id})
          </span>
        </h3>

        <div style={{ display: 'flex', gap: '5px' }}>
          {onMoveUp && (
            <button 
              onClick={onMoveUp}
              style={{
                padding: '5px 8px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Move up"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button 
              onClick={onMoveDown}
              style={{
                padding: '5px 8px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
              title="Move down"
            >
              ↓
            </button>
          )}
          <button 
            onClick={onRemove}
            style={{
              padding: '5px 10px',
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

      {renderEditor()}

      {schema && schema.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          <strong style={{ color: '#495057' }}>Output Schema ({schema.length} columns):</strong>
          <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
            {schema.map(col => (
              <span key={col.name} style={{ 
                display: 'inline-block', 
                margin: '3px 6px 3px 0', 
                padding: '4px 8px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '4px',
                fontSize: '0.85em',
                border: '1px solid #dee2e6'
              }}>
                {col.name} <span style={{ color: '#6c757d' }}>({col.dtype})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
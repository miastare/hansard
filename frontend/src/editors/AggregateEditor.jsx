
import React from 'react';
import { deriveSchema } from '../utils/DeriveSchema';

const AggregateEditor = ({ step, onUpdate, onBatchUpdate, availableInputs, tableSchemas }) => {
  console.log('🔢 AGGREGATE EDITOR: Rendering with step:', step);
  console.log('🔢 AGGREGATE EDITOR: Available inputs:', availableInputs);

  const handleInputChange = (value) => {
    console.log('🔢 AGGREGATE EDITOR: Input changed to:', value);
    onUpdate('input', value);
  };

  const handleGroupChange = (value) => {
    const groupColumns = value.split(',').map(col => col.trim()).filter(col => col);
    console.log('🔢 AGGREGATE EDITOR: Group columns changed to:', groupColumns);
    onUpdate('group', groupColumns);
  };

  const handleMetricAdd = () => {
    const newMetricName = `metric_${Object.keys(step.metrics || {}).length + 1}`;
    const newMetrics = {
      ...(step.metrics || {}),
      [newMetricName]: { fn: 'count', col: '*' }
    };
    console.log('🔢 AGGREGATE EDITOR: Adding new metric:', newMetricName);
    onUpdate('metrics', newMetrics);
  };

  const handleMetricChange = (metricName, field, value) => {
    const newMetrics = {
      ...(step.metrics || {}),
      [metricName]: {
        ...(step.metrics?.[metricName] || {}),
        [field]: value
      }
    };
    console.log('🔢 AGGREGATE EDITOR: Updating metric', metricName, field, '=', value);
    onUpdate('metrics', newMetrics);
  };

  const handleMetricNameChange = (oldName, newName) => {
    if (oldName === newName || !newName.trim()) return;
    
    const newMetrics = { ...(step.metrics || {}) };
    newMetrics[newName] = newMetrics[oldName];
    delete newMetrics[oldName];
    console.log('🔢 AGGREGATE EDITOR: Renaming metric from', oldName, 'to', newName);
    onUpdate('metrics', newMetrics);
  };

  const handleMetricRemove = (metricName) => {
    const newMetrics = { ...(step.metrics || {}) };
    delete newMetrics[metricName];
    console.log('🔢 AGGREGATE EDITOR: Removing metric:', metricName);
    onUpdate('metrics', newMetrics);
  };

  // Get available columns for the selected input
  const getAvailableColumns = () => {
    if (!step.input) return [];
    
    const inputStep = availableInputs.find(inp => inp.id === step.input);
    if (!inputStep) return [];

    // Use schema derivation for all step types
    const derivedSchema = deriveSchema(inputStep, availableInputs, tableSchemas);
    console.log('🔢 AGGREGATE EDITOR: Derived schema for input step:', derivedSchema);
    
    return Array.isArray(derivedSchema) ? derivedSchema : [];
  };

  const availableColumns = getAvailableColumns();
  const aggregationFunctions = ['count', 'sum', 'avg', 'min', 'max', 'std', 'var'];

  return (
    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h4>Aggregate Configuration</h4>
      
      {/* Input Selection */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Input Step:
        </label>
        <select 
          value={step.input || ''} 
          onChange={(e) => handleInputChange(e.target.value)}
          style={{ width: '100%', padding: '4px' }}
        >
          <option value="">Select input step</option>
          {availableInputs.map(input => (
            <option key={input.id} value={input.id}>
              {input.id} ({input.op})
            </option>
          ))}
        </select>
      </div>

      {/* Group By Columns */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
          Group By Columns (comma-separated):
        </label>
        <input
          type="text"
          value={(step.group || []).join(', ')}
          onChange={(e) => handleGroupChange(e.target.value)}
          placeholder="e.g., member_id, gender"
          style={{ width: '100%', padding: '4px' }}
        />
        {availableColumns.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Available columns: {availableColumns.map(col => col.name).join(', ')}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontWeight: 'bold' }}>Metrics:</label>
          <button 
            onClick={handleMetricAdd}
            style={{ 
              padding: '4px 8px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Add Metric
          </button>
        </div>

        {Object.entries(step.metrics || {}).map(([metricName, metric]) => (
          <div key={metricName} style={{ 
            border: '1px solid #eee', 
            padding: '8px', 
            marginBottom: '8px', 
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="text"
                value={metricName}
                onChange={(e) => handleMetricNameChange(metricName, e.target.value)}
                style={{ 
                  padding: '4px', 
                  marginRight: '8px', 
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}
              />
              <button
                onClick={() => handleMetricRemove(metricName)}
                style={{ 
                  padding: '4px 8px', 
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
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={metric.fn || 'count'}
                onChange={(e) => handleMetricChange(metricName, 'fn', e.target.value)}
                style={{ padding: '4px' }}
              >
                {aggregationFunctions.map(fn => (
                  <option key={fn} value={fn}>{fn}</option>
                ))}
              </select>
              
              <span>of</span>
              
              <select
                value={metric.col || '*'}
                onChange={(e) => handleMetricChange(metricName, 'col', e.target.value)}
                style={{ padding: '4px', flex: 1 }}
                disabled={metric.fn === 'count'}
              >
                <option value="*">* (all rows)</option>
                {availableColumns.map(col => (
                  <option key={col.name} value={col.name}>
                    {col.name} ({col.dtype})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {Object.keys(step.metrics || {}).length === 0 && (
          <div style={{ 
            padding: '16px', 
            textAlign: 'center', 
            color: '#666',
            border: '1px dashed #ddd',
            borderRadius: '4px'
          }}>
            No metrics defined. Click "Add Metric" to create aggregations.
          </div>
        )}
      </div>

      {/* Preview/Summary */}
      {step.input && (step.group?.length > 0 || Object.keys(step.metrics || {}).length > 0) && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#f0f8ff', 
          border: '1px solid #b3d9ff',
          borderRadius: '4px'
        }}>
          <strong>Summary:</strong>
          <div style={{ fontSize: '14px', marginTop: '4px' }}>
            {step.group?.length > 0 && (
              <div>Group by: {step.group.join(', ')}</div>
            )}
            {Object.keys(step.metrics || {}).length > 0 && (
              <div>
                Metrics: {Object.entries(step.metrics).map(([name, metric]) => 
                  `${name} = ${metric.fn}(${metric.col || '*'})`
                ).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AggregateEditor;

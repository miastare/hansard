import React, { useState } from 'react';
import { deriveSchema } from '../utils/DeriveSchema';
import { createPortal } from 'react-dom';

const AggregateEditor = ({ step, onUpdate, onBatchUpdate, availableInputs, tableSchemas }) => {
  const [showGroupingModal, setShowGroupingModal] = useState(false);
  
  console.log('🔢 AGGREGATE EDITOR: Rendering with step:', step);
  console.log('🔢 AGGREGATE EDITOR: Available inputs:', availableInputs);

  const handleInputChange = (value) => {
    console.log('🔢 AGGREGATE EDITOR: Input changed to:', value);
    // Reset group and metrics when input changes
    onBatchUpdate({
      input: value,
      group: [],
      metrics: {}
    });
  };

  const handleGroupToggle = (columnName) => {
    const currentGroup = step.group || [];
    const newGroup = currentGroup.includes(columnName)
      ? currentGroup.filter(col => col !== columnName)
      : [...currentGroup, columnName];
    console.log('🔢 AGGREGATE EDITOR: Group columns changed to:', newGroup);
    onUpdate('group', newGroup);
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

  // Get columns that are compatible with a specific aggregation function
  const getCompatibleColumnsForFunction = (fn) => {
    const availableColumns = getAvailableColumns();

    if (fn === 'count') {
      // Count can work on any column or *
      return [{ name: '*', dtype: 'any' }, ...availableColumns];
    }

    // Mathematical aggregations (sum, avg, min, max, std, var) need numeric columns
    const mathFunctions = ['sum', 'avg', 'min', 'max', 'std', 'var'];
    if (mathFunctions.includes(fn)) {
      return availableColumns.filter(col => col.dtype === 'numeric');
    }

    // Default: return all columns for unknown functions
    return availableColumns;
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
      {step.input && availableColumns.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Group By Columns:
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
            <button
              onClick={() => setShowGroupingModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {(step.group || []).length >= 1 ? 'Edit grouping columns' : 'Add grouping columns'}
            </button>
            <div style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f9f9f9',
              fontSize: '14px',
              color: (step.group || []).length === 0 ? '#666' : '#333',
              fontStyle: (step.group || []).length === 0 ? 'italic' : 'normal',
              display: 'flex',
              alignItems: 'center'
            }}>
              {(step.group || []).length === 0 
                ? 'No grouping columns selected'
                : (step.group || []).join(', ')
              }
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      {step.input && (
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

          {Object.entries(step.metrics || {}).map(([metricName, metric]) => {
            const compatibleColumns = getCompatibleColumnsForFunction(metric.fn || 'count');

            return (
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
                    onChange={(e) => {
                      const newFn = e.target.value;
                      // Reset column selection when function changes to ensure compatibility
                      const newCompatibleColumns = getCompatibleColumnsForFunction(newFn);
                      const newCol = newCompatibleColumns.length > 0 ? newCompatibleColumns[0].name : '*';

                      // Update both function and column atomically to avoid race conditions
                      const newMetrics = {
                        ...(step.metrics || {}),
                        [metricName]: {
                          ...(step.metrics?.[metricName] || {}),
                          fn: newFn,
                          col: newCol
                        }
                      };
                      console.log('🔢 AGGREGATE EDITOR: Updating metric function and column atomically:', metricName, 'fn =', newFn, 'col =', newCol);
                      onUpdate('metrics', newMetrics);
                    }}
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
                  >
                    {compatibleColumns.map(col => (
                      <option key={col.name} value={col.name}>
                        {col.name === '*' ? '* (all rows)' : `${col.name} (${col.dtype})`}
                      </option>
                    ))}
                  </select>
                </div>

                {compatibleColumns.length === 0 && metric.fn !== 'count' && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#dc3545', 
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    No compatible columns available for {metric.fn}() function
                  </div>
                )}
              </div>
            );
          })}

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
      )}

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

      {/* Grouping Columns Modal */}
      {showGroupingModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowGroupingModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              maxHeight: '80vh',
              maxWidth: '600px',
              width: '90vw',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>
                Select Grouping Columns
              </h3>
              <button
                onClick={() => setShowGroupingModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '5px'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1
            }}>
              <div style={{
                display: 'grid',
                gap: '8px'
              }}>
                {availableColumns.map(col => (
                  <div
                    key={col.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: (step.group || []).includes(col.name) ? '#e3f2fd' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleGroupToggle(col.name)}
                  >
                    <input
                      type="checkbox"
                      checked={(step.group || []).includes(col.name)}
                      onChange={() => handleGroupToggle(col.name)}
                      style={{ marginRight: '12px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#333'
                      }}>
                        {col.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '2px'
                      }}>
                        Type: {col.dtype}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {(step.group || []).length > 0 && (
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  backgroundColor: '#f0f8ff',
                  border: '1px solid #b3d9ff',
                  borderRadius: '6px'
                }}>
                  <strong style={{ fontSize: '14px', color: '#333' }}>
                    Selected ({(step.group || []).length}):
                  </strong>
                  <div style={{ fontSize: '14px', marginTop: '4px', color: '#666' }}>
                    {(step.group || []).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #eee',
              textAlign: 'right'
            }}>
              <button
                onClick={() => setShowGroupingModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AggregateEditor;
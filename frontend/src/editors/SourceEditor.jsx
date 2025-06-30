import React, { useState, useCallback, useEffect } from 'react';
import Dropdown from '../components/Dropdown';

const AVAILABLE_TABLES = [
  'interest_df',
  'written_questions_df', 
  'written_statements_df',
  'divisions_df',
  'member_lookup',
  'member_party_history'
];

export default function SourceEditor({ step, onChange, tableSchemas, requestSchema }) {
  console.log(`SOURCE EDITOR: ===== RENDERING =====`);
  console.log(`SOURCE EDITOR: Rendering with step:`, step);
  console.log(`SOURCE EDITOR: requestSchema function:`, requestSchema);

  const [table, setTable] = useState(step.table || '');
  const [previewData, setPreviewData] = useState(null);
  const [columnWindowStart, setColumnWindowStart] = useState(0);
  const [showAllColumnsModal, setShowAllColumnsModal] = useState(false);
  const [hoveredTable, setHoveredTable] = useState(null);

  const COLUMNS_PER_WINDOW = 4;

  const updateStep = useCallback((newTable) => {
    console.log(`SOURCE EDITOR: Table changed to:`, newTable);
    setTable(newTable);
    onChange({ ...step, table: newTable });
    if (newTable && requestSchema) {
      console.log(`SOURCE EDITOR: Requesting schema for:`, newTable);
      requestSchema(newTable);
    } else {
      console.log(`SOURCE EDITOR: Not requesting schema - table:`, newTable, `requestSchema:`, requestSchema);
    }
  }, [step, onChange, requestSchema]);

  // Fetch preview data when table changes
  useEffect(() => {
    if (table) {
      fetch(`/api/preview/${table}?n=3`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setPreviewData(data))
        .catch(() => setPreviewData(null));
    } else {
      setPreviewData(null);
    }
  }, [table]);

  const selectedSchema = tableSchemas?.[table];
  const currentSchema = selectedSchema?.cols || selectedSchema || [];

  // Get columns for current window
  const windowedColumns = currentSchema.slice(columnWindowStart, columnWindowStart + COLUMNS_PER_WINDOW);
  const totalWindows = Math.ceil(currentSchema.length / COLUMNS_PER_WINDOW);
  const currentWindow = Math.floor(columnWindowStart / COLUMNS_PER_WINDOW) + 1;

  // Prepare dropdown options
  const tableOptions = AVAILABLE_TABLES.map(tableName => ({
    value: tableName,
    label: tableName,
    icon: '📋'
  }));

  // Handle table hover for columns preview
  const handleTableHover = (option) => {
    if (option && tableSchemas) {
      const schema = tableSchemas[option.value];
      if (schema) {
        const columns = schema.cols || schema;
        setHoveredTable({ table: option.value, schema: Array.isArray(columns) ? columns : [] });
      }
    } else {
      setHoveredTable(null);
    }
  };

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      maxHeight: '60vh'
    }}>
      <h4 style={{ margin: '0 0 24px 0', color: '#2d3748', fontSize: '18px' }}>Source Table</h4>

      {/* Table Selection Row */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '20px', 
        marginBottom: '24px',
        flexShrink: 0,
        position: 'relative'
      }}>
        <div style={{ flex: '0 0 300px', position: 'relative' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600', 
            fontSize: '14px',
            color: '#374151'
          }}>
            📋 Select table:
          </label>
          <div style={{ position: 'relative', zIndex: 100 }}>
            <Dropdown
              value={table}
              onChange={updateStep}
              options={tableOptions}
              placeholder="Select a table"
              onHover={handleTableHover}
            />
          </div>
        </div>

        {/* Selected Table Columns Preview - only when table is selected */}
        {table && currentSchema.length > 0 && (
          <div style={{ flex: '1', minWidth: '280px', maxWidth: '350px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '8px' 
            }}>
              <span style={{ 
                fontWeight: '600', 
                fontSize: '14px', 
                color: '#374151' 
              }}>
                📊 Table columns ({currentSchema.length})
              </span>
              <button
                onClick={() => setShowAllColumnsModal(true)}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                View All
              </button>
            </div>

            {/* Windowed Column Display */}
            <div style={{
              background: 'rgba(248, 250, 252, 0.8)',
              border: '1px solid rgba(203, 213, 225, 0.4)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '8px',
                marginBottom: windowedColumns.length > 0 ? '12px' : '0'
              }}>
                {windowedColumns.map(col => (
                  <div key={col.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(203, 213, 225, 0.3)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>{col.name}</span>
                    <span style={{ 
                      color: col.dtype === 'str' ? '#10b981' : 
                             col.dtype === 'numeric' || col.dtype === 'int64' ? '#3b82f6' : 
                             col.dtype === 'bool' ? '#f59e0b' : '#6b7280',
                      fontSize: '11px'
                    }}>
                      {col.dtype}
                    </span>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              {totalWindows > 1 && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <button
                    onClick={() => setColumnWindowStart(Math.max(0, columnWindowStart - COLUMNS_PER_WINDOW))}
                    disabled={columnWindowStart === 0}
                    style={{
                      padding: '4px 8px',
                      background: columnWindowStart === 0 ? '#f3f4f6' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: columnWindowStart === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    ← Prev
                  </button>
                  <span>
                    {currentWindow} of {totalWindows}
                  </span>
                  <button
                    onClick={() => setColumnWindowStart(Math.min(currentSchema.length - COLUMNS_PER_WINDOW, columnWindowStart + COLUMNS_PER_WINDOW))}
                    disabled={columnWindowStart + COLUMNS_PER_WINDOW >= currentSchema.length}
                    style={{
                      padding: '4px 8px',
                      background: columnWindowStart + COLUMNS_PER_WINDOW >= currentSchema.length ? '#f3f4f6' : '#e5e7eb',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: columnWindowStart + COLUMNS_PER_WINDOW >= currentSchema.length ? 'not-allowed' : 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hovered Table Schema Preview - positioned outside the flex container */}
      {hoveredTable && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: '20px',
          transform: 'translateY(-50%)',
          zIndex: 1001,
          background: 'rgba(248, 250, 252, 0.95)',
          border: '2px solid rgba(203, 213, 225, 0.6)',
          borderRadius: '12px',
          padding: '16px',
          backdropFilter: 'blur(15px)',
          maxWidth: '320px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '14px', 
            color: '#374151',
            marginBottom: '12px'
          }}>
            📊 {hoveredTable.table} ({hoveredTable.schema.length} columns)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '4px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {hoveredTable.schema.slice(0, 15).map(col => (
              <div key={col.name} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '6px',
                fontSize: '12px',
                border: '1px solid rgba(203, 213, 225, 0.3)'
              }}>
                <span style={{ fontWeight: '500', color: '#374151' }}>{col.name}</span>
                <span style={{ 
                  color: col.dtype === 'str' ? '#10b981' : 
                         col.dtype === 'numeric' || col.dtype === 'int64' ? '#3b82f6' : 
                         col.dtype === 'bool' ? '#f59e0b' : '#6b7280',
                  fontSize: '11px'
                }}>
                  {col.dtype}
                </span>
              </div>
            ))}
            {hoveredTable.schema.length > 15 && (
              <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center', fontStyle: 'italic', padding: '4px' }}>
                ... and {hoveredTable.schema.length - 15} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div style={{ 
        flex: '1', 
        overflowY: 'auto', 
        paddingRight: '8px'
      }}>

      {previewData && previewData.length > 0 && (
          <div style={{ 
            marginBottom: '20px',
            border: '2px solid rgba(203, 213, 225, 0.4)', 
            borderRadius: '12px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              background: 'rgba(248, 250, 252, 0.8)',
              borderBottom: '1px solid rgba(203, 213, 225, 0.3)',
              fontWeight: '600',
              color: '#374151'
            }}>
              📋 Preview (first 3 rows)
            </div>
            <div style={{ 
              padding: '20px',
              overflow: 'auto', 
              maxHeight: '300px'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse', 
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{ 
                    background: 'rgba(248, 250, 252, 0.5)',
                    borderBottom: '2px solid rgba(203, 213, 225, 0.3)'
                  }}>
                    {Object.keys(previewData[0]).map(col => (
                      <th key={col} style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left',
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} style={{
                      borderBottom: '1px solid rgba(203, 213, 225, 0.2)'
                    }}>
                      {Object.values(row).map((val, j) => (
                        <td key={j} style={{ 
                          padding: '12px 16px',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#6b7280'
                        }}>
                          {val !== null && val !== undefined ? String(val) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* All Columns Modal */}
      {showAllColumnsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80%',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#374151' }}>
                All Table Columns ({currentSchema.length})
              </h3>
              <button
                onClick={() => setShowAllColumnsModal(false)}
                style={{
                  padding: '8px 12px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {currentSchema.map(col => (
                <div key={col.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid rgba(203, 213, 225, 0.3)',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>{col.name}</span>
                  <span style={{ 
                    color: col.dtype === 'str' ? '#10b981' : 
                           col.dtype === 'numeric' || col.dtype === 'int64' ? '#3b82f6' : 
                           col.dtype === 'bool' ? '#f59e0b' : '#6b7280',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {col.dtype}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
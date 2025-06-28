import React, { useState, useCallback, useEffect } from 'react';

const AVAILABLE_TABLES = [
  'interest_df',
  'written_questions_df', 
  'written_statements_df',
  'divisions_df',
  'member_lookup',
  'member_party_history'
];

export default function SourceEditor({ step, onChange, tableSchemas }) {
  const [table, setTable] = useState(step.table || '');
  const [previewData, setPreviewData] = useState(null);

  const updateStep = useCallback((newTable) => {
    setTable(newTable);
    onChange({ ...step, table: newTable });
  }, [step, onChange]);

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

  return (
    <div>
      <h4>Source Table</h4>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Select table:
        </label>
        <select
          value={table}
          onChange={(e) => updateStep(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          <option value="">Select a table</option>
          {AVAILABLE_TABLES.map(tableName => (
            <option key={tableName} value={tableName}>{tableName}</option>
          ))}
        </select>
      </div>

      {selectedSchema && (
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <strong>Schema ({selectedSchema.length} columns):</strong>
          <div style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
            {selectedSchema.map(col => (
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
            ))}
          </div>
        </div>
      )}

      {previewData && previewData.length > 0 && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
          <strong>Preview (first 3 rows):</strong>
          <div style={{ overflow: 'auto', maxHeight: '200px', marginTop: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  {Object.keys(previewData[0]).map(col => (
                    <th key={col} style={{ 
                      padding: '6px', 
                      border: '1px solid #ddd', 
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ 
                        padding: '6px', 
                        border: '1px solid #ddd',
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
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
  );
}
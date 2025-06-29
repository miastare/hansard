import React, { useState } from 'react';
import Modal from './Modal';
import { getOperatorInfo, getCompatibleOperators, getTypeFromValue } from '../../utils/ExpressionUtils';

export default function ExpressionBuilder({ expr, onChange, availableColumns }) {
  // Ensure availableColumns is always an array
  const safeAvailableColumns = availableColumns || [];
  
  console.log('EXPRESSION BUILDER: === RENDERING ===');
  console.log('EXPRESSION BUILDER: availableColumns length:', availableColumns?.length);
  console.log('EXPRESSION BUILDER: safeAvailableColumns length:', safeAvailableColumns?.length);
  if (safeAvailableColumns && Array.isArray(safeAvailableColumns) && safeAvailableColumns.length > 0) {
    console.log('EXPRESSION BUILDER: Column names available:', safeAvailableColumns.map(col => col?.name));
  } else {
    console.log('EXPRESSION BUILDER: NO VALID COLUMNS AVAILABLE!');
  }

  // Filter columns based on current context
  const getFilteredColumns = (operator = null) => {
    console.log('=== EXPRESSION BUILDER: getFilteredColumns ENTRY ===');
    console.log('EXPRESSION BUILDER: operator:', operator);
    console.log('EXPRESSION BUILDER: availableColumns original prop:', availableColumns);
    console.log('EXPRESSION BUILDER: availableColumns type:', typeof availableColumns);
    console.log('EXPRESSION BUILDER: availableColumns isArray:', Array.isArray(availableColumns));
    console.log('EXPRESSION BUILDER: availableColumns length:', availableColumns?.length);
    console.log('EXPRESSION BUILDER: safeAvailableColumns:', safeAvailableColumns);
    console.log('EXPRESSION BUILDER: safeAvailableColumns type:', typeof safeAvailableColumns);
    console.log('EXPRESSION BUILDER: safeAvailableColumns isArray:', Array.isArray(safeAvailableColumns));
    console.log('EXPRESSION BUILDER: safeAvailableColumns length:', safeAvailableColumns?.length);
    
    // Triple-check we have a valid array - use original prop as fallback
    const workingColumns = safeAvailableColumns || availableColumns || [];
    console.log('EXPRESSION BUILDER: workingColumns after fallback:', workingColumns);
    console.log('EXPRESSION BUILDER: workingColumns type:', typeof workingColumns);
    console.log('EXPRESSION BUILDER: workingColumns isArray:', Array.isArray(workingColumns));
    console.log('EXPRESSION BUILDER: workingColumns length:', workingColumns?.length);
    
    if (!workingColumns || !Array.isArray(workingColumns)) {
      console.log('EXPRESSION BUILDER: CRITICAL ERROR - No valid columns array available!');
      console.log('EXPRESSION BUILDER: Returning empty array to prevent crash');
      return [];
    }
    
    if (workingColumns.length === 0) {
      console.log('EXPRESSION BUILDER: WARNING - workingColumns is empty array');
      return [];
    }
    
    if (!operator) {
      console.log('EXPRESSION BUILDER: No operator - returning all workingColumns');
      return workingColumns;
    }

    const opInfo = getOperatorInfo(operator);
    console.log('EXPRESSION BUILDER: opInfo for', operator, ':', opInfo);
    
    const filteredColumns = workingColumns.filter(col => {
      // Defensive check for column structure
      if (!col || typeof col !== 'object') {
        console.log('EXPRESSION BUILDER: Invalid column structure (not object):', col);
        return false;
      }
      
      if (!col.dtype || !col.name) {
        console.log('EXPRESSION BUILDER: Invalid column structure (missing dtype/name):', col);
        return false;
      }
      
      const colType = col.dtype === 'object' ? 'str' : col.dtype; // Convert object to str
      const isCompatible = opInfo.inputTypes.some(inputType => {
        if (inputType === 'int64' || inputType === 'float64') {
          return colType === 'int64' || colType === 'float64';
        }
        if (inputType === 'str') {
          return colType === 'str' || colType === 'object';
        }
        return colType === inputType;
      });
      console.log('EXPRESSION BUILDER: Column', col.name, 'type', colType, 'compatible with', operator, ':', isCompatible);
      return isCompatible;
    });
    
    console.log('EXPRESSION BUILDER: Final filtered columns for', operator, ':', filteredColumns);
    console.log('EXPRESSION BUILDER: Final filtered columns length:', filteredColumns.length);
    return filteredColumns;
  };

  const [showModal, setShowModal] = useState(false);
  const [editingArgIndex, setEditingArgIndex] = useState(null);

  const handleTypeChange = (newType) => {
    if (newType === 'constant') {
      onChange({ type: 'constant', valueType: 'int64', value: 0 });
    } else if (newType === 'column') {
      const firstColumn = safeAvailableColumns && safeAvailableColumns.length > 0 ? safeAvailableColumns[0] : null;
      onChange({ 
        type: 'column', 
        columnName: firstColumn ? firstColumn.name : '' 
      });
    } else {
      onChange({ type: 'dynamic', operator: 'add', args: [
        { type: 'constant', valueType: 'int64', value: 0 },
        { type: 'constant', valueType: 'int64', value: 0 }
      ]});
    }
  };

  const handleConstantChange = (field, value) => {
    if (field === 'valueType') {
      const defaultValue = value === 'int64' ? 0 : value === 'float64' ? 0.0 : value === 'bool' ? false : '';
      onChange({ ...expr, valueType: value, value: defaultValue });
    } else {
      onChange({ ...expr, [field]: value });
    }
  };

  const handleOperatorChange = (newOperator) => {
    const opInfo = getOperatorInfo(newOperator);
    const newArgs = [];

    for (let i = 0; i < opInfo.minArgs; i++) {
      newArgs.push({ type: 'constant', valueType: 'int64', value: 0 });
    }

    onChange({ ...expr, operator: newOperator, args: newArgs });
  };

  const handleArgChange = (index, newArg) => {
    const newArgs = [...expr.args];
    newArgs[index] = newArg;
    onChange({ ...expr, args: newArgs });
  };

  const addArgument = () => {
    const opInfo = getOperatorInfo(expr.operator);
    if (expr.args.length < opInfo.maxArgs) {
      const newArgs = [...expr.args, { type: 'constant', valueType: 'int64', value: 0 }];
      onChange({ ...expr, args: newArgs });
    }
  };

  const removeArgument = (index) => {
    const opInfo = getOperatorInfo(expr.operator);
    if (expr.args.length > opInfo.minArgs) {
      const newArgs = expr.args.filter((_, i) => i !== index);
      onChange({ ...expr, args: newArgs });
    }
  };

  const openArgModal = (index) => {
    setEditingArgIndex(index);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingArgIndex(null);
  };

  const getExpressionSummary = (expr) => {
    if (expr.type === 'constant') {
      return `${expr.value} (${expr.valueType})`;
    } else {
      const argSummaries = expr.args.map(arg => getExpressionSummary(arg)).join(', ');
      return `${expr.operator}(${argSummaries})`;
    }
  };

  const truncate = (text, maxLength = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const setExprType = (type) => {
    if (type === 'constant') {
      onChange({ type: 'constant', valueType: 'int64', value: 0 });
    } else if (type === 'column') {
      const firstColumn = safeAvailableColumns && safeAvailableColumns.length > 0 ? safeAvailableColumns[0] : null;
      onChange({ 
        type: 'column', 
        columnName: firstColumn ? firstColumn.name : '' 
      });
    } else if (type === 'dynamic') {
      setShowModal(true);
    }
  };

  if (!expr) {
    return (
        <div style={{ padding: '20px', border: '2px dashed #ddd', borderRadius: '8px', textAlign: 'center' }}>
          <button 
            onClick={() => setExprType('constant')}
            style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Add Constant
          </button>
          <button 
            onClick={() => setExprType('column')}
            style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Existing Column
          </button>
          <button 
            onClick={() => setExprType('dynamic')}
            style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Add Dynamic Expression
          </button>
        </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #007bff', 
      borderRadius: '10px',
      backgroundColor: '#f8f9ff'
    }}>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          Expression Type:
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              checked={expr.type === 'constant'}
              onChange={() => handleTypeChange('constant')}
            />
            Constant
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>
              (Fixed value)
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              checked={expr.type === 'column'}
              onChange={() => handleTypeChange('column')}
            />
            Existing Column
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>
              (Reference column)
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="radio"
              checked={expr.type === 'dynamic'}
              onChange={() => handleTypeChange('dynamic')}
            />
            Dynamic
            <span style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>
              (Based on columns & operations)
            </span>
          </label>
        </div>
      </div>

      {expr.type === 'column' ? (
        <div style={{ padding: '15px', border: '2px solid #6c757d', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#495057' }}>
            Column Reference
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              Column:
            </label>
            <select 
              value={expr.columnName || ''} 
              onChange={(e) => {
                console.log('EXPRESSION BUILDER: Column dropdown changed to:', e.target.value);
                onChange({ ...expr, columnName: e.target.value })
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select column</option>
              {(() => {
                console.log('=== EXPRESSION BUILDER: COLUMN DROPDOWN RENDERING ===');
                console.log('EXPRESSION BUILDER: About to call getFilteredColumns()');
                
                let filteredCols;
                try {
                  filteredCols = getFilteredColumns();
                  console.log('EXPRESSION BUILDER: getFilteredColumns() returned:', filteredCols);
                } catch (error) {
                  console.error('EXPRESSION BUILDER: ERROR calling getFilteredColumns():', error);
                  return <option value="">Error loading columns</option>;
                }
                
                console.log('EXPRESSION BUILDER: filteredCols type:', typeof filteredCols);
                console.log('EXPRESSION BUILDER: filteredCols Array.isArray:', Array.isArray(filteredCols));
                console.log('EXPRESSION BUILDER: filteredCols length:', filteredCols?.length);
                
                if (!filteredCols) {
                  console.log('EXPRESSION BUILDER: filteredCols is null/undefined');
                  return <option value="">No columns available (null)</option>;
                }
                
                if (!Array.isArray(filteredCols)) {
                  console.log('EXPRESSION BUILDER: filteredCols is not an array, type:', typeof filteredCols);
                  return <option value="">No columns available (not array)</option>;
                }
                
                if (filteredCols.length === 0) {
                  console.log('EXPRESSION BUILDER: filteredCols is empty array');
                  return <option value="">No columns available (empty)</option>;
                }
                
                console.log('EXPRESSION BUILDER: About to map over', filteredCols.length, 'columns');
                
                const options = filteredCols.map((col, index) => {
                  console.log('EXPRESSION BUILDER: Mapping column', index, ':', col);
                  if (!col || typeof col !== 'object') {
                    console.log('EXPRESSION BUILDER: Invalid column at index', index, ':', col);
                    return <option key={`invalid-${index}`} value="">Invalid column</option>;
                  }
                  if (!col.name) {
                    console.log('EXPRESSION BUILDER: Column missing name at index', index, ':', col);
                    return <option key={`noname-${index}`} value="">Unnamed column</option>;
                  }
                  return (
                    <option key={col.name} value={col.name}>{col.name} ({col.dtype || 'unknown'})</option>
                  );
                });
                
                console.log('EXPRESSION BUILDER: Generated', options.length, 'options');
                return options;
              })()}
            </select>
          </div>
          <button 
            onClick={() => onChange(null)}
            style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
          >
            Remove
          </button>
        </div>
      ) : expr.type === 'constant' ? (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Data Type:
            </label>
            <select
              value={expr.valueType}
              onChange={(e) => handleConstantChange('valueType', e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '150px'
              }}
            >
              <option value="int64">Integer</option>
              <option value="float64">Float</option>
              <option value="bool">Boolean</option>
              <option value="str">String</option>
            </select>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {expr.valueType === 'int64' && 'Whole numbers (e.g., 1, 42, -10)'}
              {expr.valueType === 'float64' && 'Decimal numbers (e.g., 3.14, -2.5)'}
              {expr.valueType === 'bool' && 'True or False values'}
              {expr.valueType === 'str' && 'Text values (e.g., "hello", "world")'}
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Value:
            </label>
            {expr.valueType === 'bool' ? (
              <select
                value={expr.value.toString()}
                onChange={(e) => handleConstantChange('value', e.target.value === 'true')}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : (
              <input
                type={expr.valueType === 'str' ? 'text' : 'number'}
                step={expr.valueType === 'float64' ? 'any' : '1'}
                value={expr.value}
                onChange={(e) => {
                  let value = e.target.value;
                  if (expr.valueType === 'int64') value = parseInt(value) || 0;
                  if (expr.valueType === 'float64') value = parseFloat(value) || 0.0;
                  handleConstantChange('value', value);
                }}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              />
            )}
          </div>
        </div>
      ) : null}



      {expr.type === 'dynamic' && (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              Operator:
            </label>
            <select
              value={expr.operator}
              onChange={(e) => handleOperatorChange(e.target.value)}
              style={{
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '150px'
              }}
            >
              {getCompatibleOperators(safeAvailableColumns).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
                Arguments:
              </label>
              <div>
                {getOperatorInfo(expr.operator).maxArgs > expr.args.length && (
                  <button
                    onClick={addArgument}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginRight: '5px'
                    }}
                  >
                    + Add Arg
                  </button>
                )}
              </div>
            </div>

            {expr.args.map((arg, index) => {
              console.log('EXPRESSION BUILDER: Rendering arg', index, 'for operator', expr.operator);
              const operatorFilteredColumns = getFilteredColumns(expr.operator);
              console.log('EXPRESSION BUILDER: Operator-filtered columns for arg', index, ':', operatorFilteredColumns);
              
              return (
                <div key={index} style={{ 
                  marginBottom: '10px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: '#fff'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      Argument {index + 1}:
                    </span>
                    <div>
                      <button
                        onClick={() => {
                          console.log('EXPRESSION BUILDER: Opening modal for arg', index, 'with columns:', operatorFilteredColumns);
                          openArgModal(index);
                        }}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          marginRight: '5px'
                        }}
                      >
                        Edit
                      </button>
                      {expr.args.length > getOperatorInfo(expr.operator).minArgs && (
                        <button
                          onClick={() => removeArgument(index)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#495057',
                    border: '1px solid #e9ecef'
                  }}>
                    {truncate(getExpressionSummary(arg))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <Modal onClose={closeModal}>
          <div style={{ padding: '20px', minWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px' }}>
              Edit Argument {editingArgIndex + 1}
              {expr.type === 'dynamic' && (
                <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
                  {' '}for {expr.operator} operation
                </span>
              )}
            </h3>
            <ExpressionBuilder
              expr={expr.args[editingArgIndex]}
              onChange={(newArg) => {
                console.log('EXPRESSION BUILDER: Modal onChange for arg', editingArgIndex, ':', newArg);
                handleArgChange(editingArgIndex, newArg);
              }}
              availableColumns={(() => {
                console.log('=== EXPRESSION BUILDER: MODAL COLUMNS PROP PREPARATION ===');
                console.log('EXPRESSION BUILDER: Original availableColumns prop:', availableColumns);
                console.log('EXPRESSION BUILDER: Original availableColumns type:', typeof availableColumns);
                console.log('EXPRESSION BUILDER: Original availableColumns isArray:', Array.isArray(availableColumns));
                console.log('EXPRESSION BUILDER: Original availableColumns length:', availableColumns?.length);
                console.log('EXPRESSION BUILDER: safeAvailableColumns:', safeAvailableColumns);
                console.log('EXPRESSION BUILDER: safeAvailableColumns type:', typeof safeAvailableColumns);
                console.log('EXPRESSION BUILDER: safeAvailableColumns isArray:', Array.isArray(safeAvailableColumns));
                console.log('EXPRESSION BUILDER: safeAvailableColumns length:', safeAvailableColumns?.length);
                
                // Use the original prop if safeAvailableColumns is somehow corrupted
                const columnsToPass = (safeAvailableColumns && Array.isArray(safeAvailableColumns) && safeAvailableColumns.length > 0) 
                  ? safeAvailableColumns 
                  : (availableColumns && Array.isArray(availableColumns) ? availableColumns : []);
                
                console.log('EXPRESSION BUILDER: Final columnsToPass:', columnsToPass);
                console.log('EXPRESSION BUILDER: Final columnsToPass type:', typeof columnsToPass);
                console.log('EXPRESSION BUILDER: Final columnsToPass isArray:', Array.isArray(columnsToPass));
                console.log('EXPRESSION BUILDER: Final columnsToPass length:', columnsToPass?.length);
                if (columnsToPass.length > 0) {
                  console.log('EXPRESSION BUILDER: First column sample:', columnsToPass[0]);
                }
                
                return columnsToPass;
              })()}
            />
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
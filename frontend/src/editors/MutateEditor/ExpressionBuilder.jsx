import React, { useState } from 'react';
import Modal from './Modal';
import { getOperatorInfo, getCompatibleOperators, getTypeFromValue, getRequiredTypeForArgument, getExpressionType } from '../../utils/ExpressionUtils';

const createDefaultExpression = (type = 'constant', valueType = 'str') => {
    switch (type) {
      case 'constant':
        const defaultValue = valueType === 'bool' ? false : 
                           valueType === 'int64' ? 0 :
                           valueType === 'float64' ? 0.0 : '';
        return { type: 'constant', value: defaultValue, valueType };
      case 'column':
        return { type: 'column', columnName: '' };
      case 'dynamic':
        return { type: 'dynamic', operator: 'add', args: [] };
      default:
        return { type: 'constant', value: '', valueType: 'str' };
    }
  };

export default function ExpressionBuilder({ 
  expr, 
  onChange, 
  availableColumns, 
  parentOperator = null,
  parentContext = null,
  argIndex = null
}) {
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

  // Filter columns based on current context and argument position
  const getFilteredColumns = (argIndex, operator, parentContext = null) => {
    console.log('EXPRESSION BUILDER: getFilteredColumns called');
    console.log('EXPRESSION BUILDER: availableColumns:', availableColumns);
    console.log('EXPRESSION BUILDER: operator:', operator, 'argIndex:', argIndex);
    console.log('EXPRESSION BUILDER: parentContext:', parentContext);

    const workingColumns = availableColumns || [];
    console.log('EXPRESSION BUILDER: Working with columns:', workingColumns.length);

    // Get required types for this specific argument position
    const requiredTypes = getRequiredTypeForArgument(operator, argIndex, parentContext);
    console.log('EXPRESSION BUILDER: Required types for', operator, 'arg', argIndex, ':', requiredTypes);

    const filteredColumns = workingColumns.filter(col => {
      // Defensive check for column structure
      if (!col || typeof col !== 'object' || !col.dtype || !col.name) {
        return false;
      }

      const colType = col.dtype === 'object' ? 'str' : col.dtype; // Convert object to str
      const isCompatible = requiredTypes.some(requiredType => {
        if (requiredType === 'any') return true;
        if (requiredType === 'int64' || requiredType === 'float64') {
          return colType === 'int64' || colType === 'float64';
        }
        if (requiredType === 'str') {
          return colType === 'str' || colType === 'object';
        }
        return colType === requiredType;
      });

      return isCompatible;
    });

    console.log('EXPRESSION BUILDER: Final filtered columns:', filteredColumns.length);
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

  // Get allowed types for constants based on parent operator context
  const getAllowedConstantTypes = (operatorContext = parentOperator) => {
    if (!parentOperator) {
      // If no parent operator, allow all types
      return ['int64', 'float64', 'bool', 'str'];
    }

    const opInfo = getOperatorInfo(parentOperator);
    const allowedTypes = [];

    // Map operator input types to constant types
    opInfo.inputTypes.forEach(inputType => {
      if (inputType === 'int64' || inputType === 'float64') {
        if (!allowedTypes.includes('int64')) allowedTypes.push('int64');
        if (!allowedTypes.includes('float64')) allowedTypes.push('float64');
      } else if (inputType === 'str') {
        if (!allowedTypes.includes('str')) allowedTypes.push('str');
      } else if (inputType === 'bool') {
        if (!allowedTypes.includes('bool')) allowedTypes.push('bool');
      }
    });

    return allowedTypes.length > 0 ? allowedTypes : ['int64', 'float64', 'bool', 'str'];
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
    if (!expr || typeof expr !== 'object') {
      return 'Invalid expression';
    }

    if (expr.type === 'constant') {
      return `${expr.value} (${expr.valueType})`;
    } else if (expr.type === 'column') {
      return `Column: ${expr.columnName || 'unnamed'}`;
    } else if (expr.type === 'dynamic') {
      if (!expr.args || !Array.isArray(expr.args)) {
        return `${expr.operator || 'unknown'}(no args)`;
      }
      const argSummaries = expr.args.map(arg => getExpressionSummary(arg)).join(', ');
      return `${expr.operator || 'unknown'}(${argSummaries})`;
    } else {
      return 'Unknown expression type';
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

  const handleAddArgument = () => {
    // Determine what type the new argument should be based on operator requirements
    const newArgIndex = (expr.args || []).length;
    const requiredTypes = getRequiredTypeForArgument(expr.operator, newArgIndex, parentContext);

    // Create appropriate default based on required types
    let defaultExpr;
    if (requiredTypes.includes('bool')) {
      defaultExpr = createDefaultExpression('constant', 'bool');
    } else if (requiredTypes.includes('int64') || requiredTypes.includes('float64')) {
      defaultExpr = createDefaultExpression('constant', 'int64');
    } else if (requiredTypes.includes('str')) {
      defaultExpr = createDefaultExpression('constant', 'str');
    } else {
      defaultExpr = createDefaultExpression('constant');
    }

    const newArgs = [...(expr.args || []), defaultExpr];
    onChange({
      ...expr,
      args: newArgs
    });
  };

  const updateArgument = (index, newArg) => {
    const newArgs = [...expr.args];
    newArgs[index] = newArg;
    onChange({
      ...expr,
      args: newArgs
    });
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
                console.log('EXPRESSION BUILDER: About to call getFilteredColumns with parent context');

                let filteredCols;
                try {
                  filteredCols = getFilteredColumns(argIndex, expr.operator, parentContext);
                  console.log('EXPRESSION BUILDER: getFilteredColumns() returned:', filteredCols);
                } catch (error) {
                  console.error('EXPRESSION BUILDER: ERROR calling getFilteredColumns():', error);
                  return [<option key="error" value="">Error loading columns</option>];
                }

                console.log('EXPRESSION BUILDER: filteredCols type:', typeof filteredCols);
                console.log('EXPRESSION BUILDER: filteredCols Array.isArray:', Array.isArray(filteredCols));
                console.log('EXPRESSION BUILDER: filteredCols length:', filteredCols?.length);

                if (!filteredCols) {
                  console.log('EXPRESSION BUILDER: filteredCols is null/undefined');
                  return [<option key="null" value="">No columns available (null)</option>];
                }

                if (!Array.isArray(filteredCols)) {
                  console.log('EXPRESSION BUILDER: filteredCols is not an array, type:', typeof filteredCols);
                  return [<option key="notarray" value="">No columns available (not array)</option>];
                }

                if (filteredCols.length === 0) {
                  console.log('EXPRESSION BUILDER: filteredCols is empty array');
                  return [<option key="empty" value="">No columns available (empty)</option>];
                }

                console.log('EXPRESSION BUILDER: About to map over', filteredCols.length, 'columns');

                try {
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
                } catch (mapError) {
                  console.error('EXPRESSION BUILDER: ERROR during mapping:', mapError);
                  return [<option key="maperror" value="">Error mapping columns</option>];
                }
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
              {(() => {
                const allowedTypes = getAllowedConstantTypes();
                console.log('EXPRESSION BUILDER: Allowed constant types for parent operator', parentOperator, ':', allowedTypes);

                // Auto-correct if current type is not allowed
                if (!allowedTypes.includes(expr.valueType) && allowedTypes.length > 0) {
                  console.log('EXPRESSION BUILDER: Current type', expr.valueType, 'not allowed, switching to', allowedTypes[0]);
                  setTimeout(() => {
                    handleConstantChange('valueType', allowedTypes[0]);
                  }, 0);
                }

                const typeOptions = [];
                if (allowedTypes.includes('int64')) {
                  typeOptions.push(<option key="int64" value="int64">Integer</option>);
                }
                if (allowedTypes.includes('float64')) {
                  typeOptions.push(<option key="float64" value="float64">Float</option>);
                }
                if (allowedTypes.includes('bool')) {
                  typeOptions.push(<option key="bool" value="bool">Boolean</option>);
                }
                if (allowedTypes.includes('str')) {
                  typeOptions.push(<option key="str" value="str">String</option>);
                }

                return typeOptions;
              })()}
            </select>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {expr.valueType === 'int64' && 'Whole numbers (e.g., 1, 42, -10)'}
              {expr.valueType === 'float64' && 'Decimal numbers (e.g., 3.14, -2.5)'}
              {expr.valueType === 'bool' && 'True or False values'}
              {expr.valueType === 'str' && 'Text values (e.g., "hello", "world")'}
              {parentOperator && (
                <div style={{ fontSize: '11px', color: '#007bff', marginTop: '2px' }}>
                  ℹ️ Types limited by {parentOperator} operator requirements
                </div>
              )}
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
                    onClick={handleAddArgument}
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

            {expr.args?.map((arg, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '8px',
              gap: '10px'
            }}>
              <span style={{ 
                fontWeight: 'bold',
                minWidth: '80px',
                fontSize: '13px',
                color: '#495057'
              }}>
                Arg {index + 1}:
              </span>
              <button
                onClick={() => removeArgument(index)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
            <ArgumentEditor
              argIndex={index}
              operator={expr.operator}
              value={arg}
              onChange={(newArg) => updateArgument(index, newArg)}
              parentOperator={expr.operator}
            />
          </div>
        ))}
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
              parentOperator={expr.type === 'dynamic' ? expr.operator : null}
              argIndex={editingArgIndex}
              parentContext={(() => {
                // Create context for the argument being edited
                if (expr.type === 'dynamic') {
                  return {
                    parentOperator: expr.operator,
                    argIndex: editingArgIndex,
                    requiredType: getRequiredTypeForArgument(expr.operator, editingArgIndex, parentContext)
                  };
                }
                return parentContext;
              })()}
              availableColumns={safeAvailableColumns}
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

const ArgumentEditor = ({ argIndex, operator, value, onChange, parentOperator = null }) => {
    console.log('EXPRESSION BUILDER: ArgumentEditor rendering for:', operator, 'arg', argIndex);
    console.log('EXPRESSION BUILDER: Current value:', value);
    console.log('EXPRESSION BUILDER: parentOperator:', parentOperator);

    // Build parent context for type constraint propagation
    const parentContext = parentOperator ? {
      operator: parentOperator,
      requiredType: getRequiredTypeForArgument(parentOperator, argIndex)
    } : null;

    const requiredTypes = getRequiredTypeForArgument(operator, argIndex, parentContext);
    console.log('EXPRESSION BUILDER: Required types for this argument:', requiredTypes);

    return (
      <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <ExpressionBuilder
            expr={value}
            onChange={onChange}
            availableColumns={availableColumns}
            parentOperator={operator}
            parentContext={parentContext}
          />
      </div>
    );
  };
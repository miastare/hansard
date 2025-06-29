import React, { useState } from 'react';
import Modal from './Modal';
import { getOperatorInfo, getCompatibleOperators, getTypeFromValue } from '../../utils/ExpressionUtils';

export default function ExpressionBuilder({ expr, onChange, availableColumns }) {
  console.log('EXPRESSION BUILDER: === RENDERING ===');
  console.log('EXPRESSION BUILDER: expr:', expr);
  console.log('EXPRESSION BUILDER: availableColumns:', availableColumns);
  console.log('EXPRESSION BUILDER: availableColumns type:', typeof availableColumns);
  console.log('EXPRESSION BUILDER: availableColumns Array.isArray:', Array.isArray(availableColumns));
  console.log('EXPRESSION BUILDER: availableColumns length:', availableColumns?.length);
  if (availableColumns && Array.isArray(availableColumns)) {
    console.log('EXPRESSION BUILDER: availableColumns column names:', availableColumns.map(col => col?.name));
    console.log('EXPRESSION BUILDER: availableColumns details:', JSON.stringify(availableColumns, null, 2));
  }

  const [showModal, setShowModal] = useState(false);
  const [editingArgIndex, setEditingArgIndex] = useState(null);

  const handleTypeChange = (newType) => {
    if (newType === 'constant') {
      onChange({ type: 'constant', valueType: 'int64', value: 0 });
    } else if (newType === 'column') {
      const safeColumns = availableColumns || [];
      const firstColumn = safeColumns[0];
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
      const safeColumns = availableColumns || [];
      const firstColumn = safeColumns[0];
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
              {(availableColumns || []).map(col => {
                console.log('EXPRESSION BUILDER: Rendering option for column:', col);
                return (
                  <option key={col.name} value={col.name}>{col.name} ({col.dtype})</option>
                );
              })}
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
              {getCompatibleOperators(availableColumns || []).map(op => (
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

            {expr.args.map((arg, index) => (
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
                      onClick={() => openArgModal(index)}
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
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <Modal onClose={closeModal}>
          <div style={{ padding: '20px', minWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px' }}>
              Edit Argument {editingArgIndex + 1}
            </h3>
            <ExpressionBuilder
              expr={expr.args[editingArgIndex]}
              onChange={(newArg) => handleArgChange(editingArgIndex, newArg)}
              availableColumns={availableColumns || []}
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
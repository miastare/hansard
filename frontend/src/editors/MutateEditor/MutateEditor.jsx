import React, { useState, useCallback, useEffect, useRef } from 'react';
import ExpressionBuilder from './ExpressionBuilder';
import { deriveSchema } from '../../utils/DeriveSchema';
import generateId from '../../utils/GenerateId';

export default function MutateEditor({ step, onChange, availableInputs, tableSchemas, inputSchema }) {
  console.log(`🔄 MUTATE EDITOR [${step.id}]: === RENDERING ===`);
  console.log(`🔄 MUTATE EDITOR [${step.id}]: step:`, step);
  console.log(`🔄 MUTATE EDITOR [${step.id}]: availableInputs:`, availableInputs?.map(i => ({id: i.id, op: i.op})));
  console.log(`🔄 MUTATE EDITOR [${step.id}]: inputSchema prop:`, inputSchema);

  // Convert legacy cols format to new format with stable IDs
  const initializeColumnsWithIds = (cols) => {
    if (!cols) return {};
    
    // Check if cols already has the new format (with _id properties)
    const hasIds = Object.values(cols).some(col => col && typeof col === 'object' && col._id);
    
    if (hasIds) return cols;
    
    // Convert legacy format to new format
    const newCols = {};
    Object.entries(cols).forEach(([name, expr]) => {
      const id = generateId('col');
      newCols[name] = {
        _id: id,
        expr: expr
      };
    });
    return newCols;
  };

  const [cols, setCols] = useState(() => initializeColumnsWithIds(step.cols));
  const [validationErrors, setValidationErrors] = useState({});
  const validationTimeouts = useRef({});

  // Get schema for the selected input
  const getInputSchema = () => {
    console.log(`📊 SCHEMA [${step.id}]: === getInputSchema called ===`);
    console.log(`📊 SCHEMA [${step.id}]: step.input:`, step.input);
    console.log(`📊 SCHEMA [${step.id}]: step.input type:`, typeof step.input);
    console.log(`📊 SCHEMA [${step.id}]: step.input is empty string:`, step.input === '');
    console.log(`📊 SCHEMA [${step.id}]: step.input is null:`, step.input === null);
    console.log(`📊 SCHEMA [${step.id}]: step.input is undefined:`, step.input === undefined);
    console.log(`📊 SCHEMA [${step.id}]: availableInputs:`, availableInputs);
    console.log(`📊 SCHEMA [${step.id}]: availableInputs mapped:`, availableInputs?.map(i => ({id: i.id, op: i.op, table: i.table})));
    console.log(`📊 SCHEMA [${step.id}]: tableSchemas:`, tableSchemas);
    console.log(`📊 SCHEMA [${step.id}]: tableSchemas keys:`, Object.keys(tableSchemas || {}));

    // If step has a specific input, use that
    if (step.input && step.input !== '' && availableInputs) {
      console.log(`📊 SCHEMA [${step.id}]: Looking for input step with ID: ${step.input}`);
      const inputStep = availableInputs.find(s => s.id === step.input);
      console.log(`📊 SCHEMA [${step.id}]: Found inputStep:`, inputStep);
      
      if (inputStep) {
        console.log(`📊 SCHEMA [${step.id}]: Processing inputStep - op: ${inputStep.op}, table: ${inputStep.table}`);
        
        if (inputStep.op === 'source' && inputStep.table) {
          console.log(`📊 SCHEMA [${step.id}]: Input is source step, getting table schema for: ${inputStep.table}`);
          const schemaWrapper = tableSchemas[inputStep.table];
          console.log(`📊 SCHEMA [${step.id}]: Schema wrapper:`, schemaWrapper);
          
          if (schemaWrapper) {
            // Handle both wrapper format {cols: [...]} and direct array format
            const schema = schemaWrapper.cols || schemaWrapper;
            console.log(`📊 SCHEMA [${step.id}]: Extracted schema:`, schema);
            console.log(`📊 SCHEMA [${step.id}]: Schema is array:`, Array.isArray(schema));
            console.log(`📊 SCHEMA [${step.id}]: Schema length:`, schema?.length);
            
            if (Array.isArray(schema)) {
              console.log(`📊 SCHEMA [${step.id}]: ✅ Returning source schema with ${schema.length} columns`);
              return schema;
            } else {
              console.log(`📊 SCHEMA [${step.id}]: ❌ Schema is not an array:`, typeof schema);
              return [];
            }
          } else {
            console.log(`📊 SCHEMA [${step.id}]: ❌ No schema found for table: ${inputStep.table}`);
            console.log(`📊 SCHEMA [${step.id}]: Available tables:`, Object.keys(tableSchemas || {}));
            return [];
          }
        } else {
          // For non-source steps (like other mutate steps), derive the schema
          console.log(`📊 SCHEMA [${step.id}]: Input is ${inputStep.op} step, deriving schema`);
          console.log(`📊 SCHEMA [${step.id}]: Calling deriveSchema with inputStep:`, inputStep);
          
          const derivedSchema = deriveSchema(inputStep, availableInputs, tableSchemas);
          console.log(`📊 SCHEMA [${step.id}]: deriveSchema returned:`, derivedSchema);
          console.log(`📊 SCHEMA [${step.id}]: Derived schema is array:`, Array.isArray(derivedSchema));
          console.log(`📊 SCHEMA [${step.id}]: Derived schema length:`, derivedSchema?.length);
          
          if (Array.isArray(derivedSchema)) {
            console.log(`📊 SCHEMA [${step.id}]: ✅ Returning derived schema with ${derivedSchema.length} columns`);
            return derivedSchema;
          } else {
            console.log(`📊 SCHEMA [${step.id}]: ❌ Derived schema is not an array, returning empty`);
            return [];
          }
        }
      } else {
        console.log(`📊 SCHEMA [${step.id}]: ❌ No input step found with ID: ${step.input}`);
        console.log(`📊 SCHEMA [${step.id}]: Available step IDs:`, availableInputs?.map(s => s.id));
        return [];
      }
    }

    console.log(`📊 SCHEMA [${step.id}]: ❌ No valid input found - step.input: ${step.input}, availableInputs exists: ${!!availableInputs}`);
    return [];
  };

  const computedSchema = getInputSchema();
  const schema = inputSchema || computedSchema;
  const currentSchema = schema || [];
  
  console.log(`🎯 FINAL SCHEMA [${step.id}]: Using ${inputSchema ? 'prop' : 'computed'} schema`);
  console.log(`🎯 FINAL SCHEMA [${step.id}]: currentSchema:`, currentSchema);
  console.log(`🎯 FINAL SCHEMA [${step.id}]: currentSchema length:`, currentSchema.length);

  const updateStep = useCallback((newCols) => {
    setCols(newCols);
    // Convert back to legacy format for the step
    const legacyCols = {};
    Object.entries(newCols).forEach(([name, colData]) => {
      legacyCols[name] = colData.expr;
    });
    onChange({ ...step, cols: legacyCols });
  }, [step, onChange]);

  const updateInput = useCallback((newInput) => {
    console.log(`🔄 INPUT CHANGE [${step.id}]: Input changed from ${step.input} to ${newInput}`);
    console.log(`🔄 INPUT CHANGE [${step.id}]: New step object:`, { ...step, input: newInput });
    onChange({ ...step, input: newInput });
  }, [step, onChange]);

  const addColumn = () => {
    const existingInputColumns = currentSchema.map(col => col.name);
    let newName = `new_col_${Object.keys(cols).length + 1}`;
    
    // Ensure the generated name doesn't conflict with input columns
    let counter = Object.keys(cols).length + 1;
    while (existingInputColumns.includes(newName)) {
      counter++;
      newName = `new_col_${counter}`;
    }
    
    const defaultExpr = { type: 'constant', valueType: 'int64', value: 0 };
    const id = generateId('col');
    const newCols = { 
      ...cols, 
      [newName]: {
        _id: id,
        expr: defaultExpr
      }
    };
    updateStep(newCols);
  };

  const updateColumnName = useCallback((oldName, newName) => {
    if (oldName === newName) return;
    
    const stableId = cols[oldName]?._id;
    
    // Clear any existing timeout for this column
    if (validationTimeouts.current[stableId]) {
      clearTimeout(validationTimeouts.current[stableId]);
    }
    
    // Clear existing error immediately when typing
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stableId];
      return newErrors;
    });
    
    if (newName === '') {
      return;
    }
    
    // Check for conflicts after a delay
    const existingInputColumns = currentSchema.map(col => col.name);
    if (existingInputColumns.includes(newName)) {
      validationTimeouts.current[stableId] = setTimeout(() => {
        setValidationErrors(prev => ({
          ...prev,
          [stableId]: `Column name "${newName}" already exists in input schema`
        }));
      }, 200);
      return; // Don't update the step if there's a conflict
    }
    
    // No conflict, proceed with the update
    const newCols = { ...cols };
    // Preserve the column data with its stable ID
    newCols[newName] = newCols[oldName];
    delete newCols[oldName];
    updateStep(newCols);
  }, [cols, updateStep, currentSchema]);

  const updateColumnExpr = (name, expr) => {
    const newCols = { 
      ...cols, 
      [name]: {
        ...cols[name],
        expr: expr
      }
    };
    updateStep(newCols);
  };

  const removeColumn = (name) => {
    const stableId = cols[name]?._id;
    
    // Clear timeout and error for this column
    if (stableId && validationTimeouts.current[stableId]) {
      clearTimeout(validationTimeouts.current[stableId]);
      delete validationTimeouts.current[stableId];
    }
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[stableId];
      return newErrors;
    });
    
    const newCols = { ...cols };
    delete newCols[name];
    updateStep(newCols);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  return (
    <div>
      <h4>Mutate Columns</h4>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Input step:
        </label>
        <select 
          value={step.input || ''} 
          onChange={(e) => updateInput(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '6px',
            fontSize: '14px'
          }}
        >
          <option value="">Select input</option>
          {availableInputs?.map(input => (
            <option key={input.id} value={input.id}>
              {input.id} ({input.op})
            </option>
          ))}
        </select>
      </div>

      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <strong style={{ fontSize: '14px', color: '#495057' }}>Available columns:</strong>
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
          {currentSchema && currentSchema.length > 0 ? (
            currentSchema.map(col => (
              <span key={col.name} style={{ 
                display: 'inline-block', 
                margin: '3px 8px 3px 0', 
                padding: '4px 8px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid #dee2e6'
              }}>
                {col.name} ({col.dtype})
              </span>
            ))
          ) : (
            <em>No schema available</em>
          )}
        </div>
      </div>

      {Object.entries(cols).map(([name, colData]) => {
        const stableId = colData._id;
        const expr = colData.expr;
        const hasError = validationErrors[stableId];
        
        return (
          <div key={`column-${stableId}`} style={{ 
            marginBottom: '25px', 
            border: hasError ? '2px solid #dc3545' : '2px solid #e9ecef', 
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor={`column-name-input-${stableId}`}
                style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: hasError ? '#dc3545' : '#495057'
                }}
              >
                Column name (LHS):
              </label>
              <input
                id={`column-name-input-${stableId}`}
                name={`column-name-${stableId}`}
                type="text"
                value={name}
                onChange={(e) => updateColumnName(name, e.target.value)}
                placeholder="Enter column name"
                style={{ 
                  padding: '10px', 
                  border: hasError ? '2px solid #dc3545' : '2px solid #ddd', 
                  borderRadius: '6px',
                  width: '250px',
                  fontSize: '14px'
                }}
              />
              {hasError && (
                <div style={{
                  marginTop: '5px',
                  color: '#dc3545',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {hasError}
                </div>
              )}
            </div>

            {!hasError && (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: 'bold',
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    Expression (RHS):
                  </label>
                  <ExpressionBuilder 
                    expr={expr} 
                    onChange={(newExpr) => updateColumnExpr(name, newExpr)}
                    availableColumns={currentSchema || []}
                  />
                </div>

                <button 
                  onClick={() => removeColumn(name)} 
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Remove Column
                </button>
              </>
            )}
          </div>
        );
      })}

      <button 
        onClick={addColumn}
        style={{
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '15px',
          fontWeight: '500'
        }}
      >
        Add Column
      </button>
    </div>
  );
}
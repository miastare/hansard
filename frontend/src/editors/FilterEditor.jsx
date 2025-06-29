
import React, { useState, useCallback } from 'react';
import { deriveSchema } from '../utils/DeriveSchema';

export default function FilterEditor({ step, onUpdate, availableInputs, tableSchemas }) {
  console.log(`🔍 FILTER EDITOR [${step.id}]: === RENDERING ===`);
  console.log(`🔍 FILTER EDITOR [${step.id}]: step:`, step);
  console.log(`🔍 FILTER EDITOR [${step.id}]: availableInputs:`, availableInputs?.map(i => ({id: i.id, op: i.op})));

  const [conditions, setConditions] = useState(step.conditions || []);

  // Get schema for the selected input (similar to MutateEditor logic)
  const getInputSchema = () => {
    console.log(`📊 FILTER SCHEMA [${step.id}]: === getInputSchema called ===`);
    console.log(`📊 FILTER SCHEMA [${step.id}]: step.input:`, step.input);
    console.log(`📊 FILTER SCHEMA [${step.id}]: availableInputs:`, availableInputs);
    console.log(`📊 FILTER SCHEMA [${step.id}]: tableSchemas:`, tableSchemas);

    // If step has a specific input, use that
    if (step.input && step.input !== '' && availableInputs) {
      console.log(`📊 FILTER SCHEMA [${step.id}]: Looking for input step with ID: ${step.input}`);
      const inputStep = availableInputs.find(s => s.id === step.input);
      console.log(`📊 FILTER SCHEMA [${step.id}]: Found inputStep:`, inputStep);
      
      if (inputStep) {
        console.log(`📊 FILTER SCHEMA [${step.id}]: Processing inputStep - op: ${inputStep.op}, table: ${inputStep.table}`);
        
        if (inputStep.op === 'source' && inputStep.table) {
          console.log(`📊 FILTER SCHEMA [${step.id}]: Input is source step, getting table schema for: ${inputStep.table}`);
          const schemaWrapper = tableSchemas[inputStep.table];
          console.log(`📊 FILTER SCHEMA [${step.id}]: Schema wrapper:`, schemaWrapper);
          
          if (schemaWrapper) {
            // Handle both wrapper format {cols: [...]} and direct array format
            const schema = schemaWrapper.cols || schemaWrapper;
            console.log(`📊 FILTER SCHEMA [${step.id}]: Extracted schema:`, schema);
            
            if (Array.isArray(schema)) {
              console.log(`📊 FILTER SCHEMA [${step.id}]: ✅ Returning source schema with ${schema.length} columns`);
              return schema;
            } else {
              console.log(`📊 FILTER SCHEMA [${step.id}]: ❌ Schema is not an array:`, typeof schema);
              return [];
            }
          } else {
            console.log(`📊 FILTER SCHEMA [${step.id}]: ❌ No schema found for table: ${inputStep.table}`);
            return [];
          }
        } else {
          // For non-source steps (like mutate steps), derive the schema
          console.log(`📊 FILTER SCHEMA [${step.id}]: Input is ${inputStep.op} step, deriving schema`);
          console.log(`📊 FILTER SCHEMA [${step.id}]: Calling deriveSchema with inputStep:`, inputStep);
          
          const derivedSchema = deriveSchema(inputStep, availableInputs, tableSchemas);
          console.log(`📊 FILTER SCHEMA [${step.id}]: deriveSchema returned:`, derivedSchema);
          
          if (Array.isArray(derivedSchema)) {
            console.log(`📊 FILTER SCHEMA [${step.id}]: ✅ Returning derived schema with ${derivedSchema.length} columns`);
            return derivedSchema;
          } else {
            console.log(`📊 FILTER SCHEMA [${step.id}]: ❌ Derived schema is not an array, returning empty`);
            return [];
          }
        }
      } else {
        console.log(`📊 FILTER SCHEMA [${step.id}]: ❌ No input step found with ID: ${step.input}`);
        return [];
      }
    }

    console.log(`📊 FILTER SCHEMA [${step.id}]: ❌ No valid input found`);
    return [];
  };

  const currentSchema = getInputSchema();
  console.log(`🎯 FILTER FINAL SCHEMA [${step.id}]: currentSchema:`, currentSchema);

  const updateStep = useCallback((newConditions) => {
    setConditions(newConditions);
    onUpdate('conditions', newConditions);
  }, [onUpdate]);

  const updateInput = useCallback((newInput) => {
    console.log(`🔄 FILTER INPUT CHANGE [${step.id}]: Input changed from ${step.input} to ${newInput}`);
    onUpdate('input', newInput);
    // Clear conditions when input changes since schema might be different
    setConditions([]);
    onUpdate('conditions', []);
  }, [step.input, onUpdate]);

  const addCondition = () => {
    const newConditions = [...conditions, { column: '', operator: '=', value: '' }];
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
      <h4>Filter Step</h4>

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
            <em>No schema available - please select an input step</em>
          )}
        </div>
      </div>

      {conditions.map((condition, index) => (
        <div key={index} style={{ 
          marginBottom: '20px', 
          border: '2px solid #e9ecef', 
          padding: '20px',
          borderRadius: '10px',
          backgroundColor: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Column:
              </label>
              <select
                value={condition.column || ''}
                onChange={(e) => updateCondition(index, 'column', e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Select column</option>
                {currentSchema?.map(col => (
                  <option key={col.name} value={col.name}>{col.name} ({col.dtype})</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '0 0 auto', minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Operator:
              </label>
              <select
                value={condition.operator || '='}
                onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '14px'
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
                <option value="isnull">is null</option>
                <option value="notnull">is not null</option>
              </select>
            </div>

            <div style={{ flex: '1', minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>
                Value:
              </label>
              <input
                type="text"
                value={condition.value || ''}
                onChange={(e) => updateCondition(index, 'value', e.target.value)}
                placeholder="Enter value"
                disabled={condition.operator === 'isnull' || condition.operator === 'notnull'}
                style={{ 
                  width: '100%',
                  padding: '8px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: (condition.operator === 'isnull' || condition.operator === 'notnull') ? '#f5f5f5' : 'white'
                }}
              />
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <button 
                onClick={() => removeCondition(index)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginTop: '20px'
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      <button 
        onClick={addCondition}
        disabled={!step.input}
        style={{
          padding: '12px 24px',
          backgroundColor: step.input ? '#007bff' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: step.input ? 'pointer' : 'not-allowed',
          fontSize: '15px',
          fontWeight: '500'
        }}
      >
        Add Condition
      </button>
      
      {!step.input && (
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d', fontStyle: 'italic' }}>
          Please select an input step before adding conditions
        </div>
      )}
    </div>
  );
}

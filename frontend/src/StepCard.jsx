import React from 'react';
import SourceEditor from './editors/SourceEditor';
import FilterEditor from './editors/FilterEditor';
import MutateEditor from './editors/MutateEditor/MutateEditor';

const StepCard = ({ step, index, onUpdate, onRemove, availableInputs, tableSchemas, requestSchema }) => {
  // Safety check to prevent undefined errors
  if (!step || !step.op) {
    return (
      <div className="step-card error">
        <p>Invalid step configuration</p>
        <button onClick={() => onRemove(index)}>Remove</button>
      </div>
    );
  }

  const handleUpdate = (field, value) => {
    onUpdate(index, { ...step, [field]: value });
  };

const renderEditor = () => {
    console.log(`STEP CARD: Rendering editor for step ${index}, op: ${step.op}`);
    console.log(`STEP CARD: availableInputs:`, availableInputs);
    console.log(`STEP CARD: tableSchemas:`, tableSchemas);
    console.log(`STEP CARD: step.input:`, step.input);
    console.log(`STEP CARD: requestSchema function:`, requestSchema);

    switch (step.op) {
      case 'source':
        return (
          <SourceEditor
            step={step}
            onChange={(updatedStep) => {
              console.log(`STEP CARD: SourceEditor onChange called with:`, updatedStep);
              onUpdate(index, updatedStep);
            }}
            requestSchema={requestSchema}
          />
        );
      case 'filter':
        return (
          <FilterEditor
            step={step}
            onUpdate={handleUpdate}
            availableInputs={availableInputs || []}
            tableSchemas={tableSchemas || {}}
          />
        );
      case 'mutate':
        const updateStep = (updatedStep) => {
          console.log(`STEP CARD: MutateEditor onChange called with:`, updatedStep);
          onUpdate(index, updatedStep);
        };

        // Get schema for this step's input
        console.log(`STEP CARD: === RENDERING STEP CARD ===`);
  console.log(`STEP CARD: step:`, step);
  console.log(`STEP CARD: step.op:`, step.op);
  console.log(`STEP CARD: step.input:`, step.input);
  console.log(`STEP CARD: availableInputs:`, availableInputs);
  console.log(`STEP CARD: tableSchemas:`, tableSchemas);
  console.log(`STEP CARD: tableSchemas keys:`, Object.keys(tableSchemas || {}));
  console.log(`STEP CARD: requestSchema function:`, typeof requestSchema);

  // Calculate schema for this step if it's a mutate step
  let inputSchema = null;
  if (step.op === 'mutate' && step.input) {
    console.log(`STEP CARD: === CALCULATING SCHEMA FOR MUTATE STEP ===`);
    console.log(`STEP CARD: Calculating schema for mutate step with input: ${step.input}`);
    console.log(`STEP CARD: Available inputs:`, availableInputs);
    console.log(`STEP CARD: Available inputs length:`, availableInputs?.length);

    const inputStep = availableInputs.find(inp => inp.id === step.input);
    console.log(`STEP CARD: Found input step:`, inputStep);

    if (inputStep) {
      console.log(`STEP CARD: Input step op:`, inputStep.op);
      console.log(`STEP CARD: Input step table:`, inputStep.table);

      if ('source' === inputStep.op && inputStep.table && tableSchemas) {
          const schemaWrapper = tableSchemas[inputStep.table];
          console.log(`STEP CARD: Got schema wrapper for table ${inputStep.table}:`, schemaWrapper);
          console.log(`STEP CARD: Schema wrapper type:`, typeof schemaWrapper, `has cols:`, !!schemaWrapper?.cols);

          inputSchema = schemaWrapper?.cols || schemaWrapper;
          console.log(`STEP CARD: Extracted schema:`, inputSchema);
          console.log(`STEP CARD: Schema type:`, typeof inputSchema, `Array.isArray:`, Array.isArray(inputSchema));
          console.log(`STEP CARD: Schema length:`, inputSchema?.length);
          console.log(`STEP CARD: Schema contents:`, JSON.stringify(inputSchema, null, 2));

          if (inputSchema && Array.isArray(inputSchema)) {
            console.log(`STEP CARD: Schema column names:`, inputSchema.map(col => col.name));
            console.log(`STEP CARD: Schema column types:`, inputSchema.map(col => col.dtype));
          }
        } else {
        console.log(`STEP CARD: Cannot get schema - source conditions not met`);
        console.log(`STEP CARD: inputStep.op === 'source':`, inputStep.op === 'source');
        console.log(`STEP CARD: inputStep.table exists:`, !!inputStep.table);
        console.log(`STEP CARD: tableSchemas exists:`, !!tableSchemas);
        console.log(`STEP CARD: tableSchemas[inputStep.table] exists:`, !!(tableSchemas && inputStep.table && tableSchemas[inputStep.table]));
      }
    } else {
      console.log(`STEP CARD: No input step found for id: ${step.input}`);
    }
  } else {
    console.log(`STEP CARD: Not a mutate step or no input - step.op:`, step.op, `step.input:`, step.input);
  }

        console.log(`STEP CARD: Final inputSchema for step ${index}:`, inputSchema);
        console.log(`STEP CARD: About to render editor with inputSchema:`, inputSchema);
        console.log(`STEP CARD: Passing inputSchema to MutateEditor:`, inputSchema);
        return (
          <MutateEditor 
            step={step} 
            onChange={updateStep} 
            availableInputs={availableInputs}
            tableSchemas={tableSchemas}
            inputSchema={inputSchema || []}
          />
        );
      case 'aggregate':
        return (
          <div>
            <label>
              Input:
              <select value={step.input || ''} onChange={(e) => handleUpdate('input', e.target.value)}>
                <option value="">Select input</option>
                {(availableInputs || []).map(input => (
                  <option key={input} value={input}>{input}</option>
                ))}
              </select>
            </label>
            {/* Add more aggregate fields as needed */}
          </div>
        );
      case 'join':
        return (
          <div>
            <label>
              Inputs:
              <input 
                type="text" 
                value={(step.inputs || []).join(', ')} 
                onChange={(e) => handleUpdate('inputs', e.target.value.split(', ').filter(Boolean))}
                placeholder="Enter comma-separated inputs"
              />
            </label>
            {/* Add more join fields as needed */}
          </div>
        );
      case 'division_votes':
        return (
          <div>
            <label>
              Division IDs:
              <input 
                type="text" 
                value={(step.division_ids || []).join(', ')} 
                onChange={(e) => handleUpdate('division_ids', e.target.value.split(', ').map(Number).filter(Boolean))}
                placeholder="Enter comma-separated division IDs"
              />
            </label>
            <label>
              House:
              <select value={step.house || 1} onChange={(e) => handleUpdate('house', Number(e.target.value))}>
                <option value={1}>Commons</option>
                <option value={2}>Lords</option>
              </select>
            </label>
          </div>
        );
      default:
        return <div>Unsupported operation: {step.op}</div>;
    }
  };

  return (
    <div className="step-card">
      <div className="step-header">
        <h3>Step {index + 1}: {step.op} ({step.id || 'unnamed'})</h3>
        <button onClick={() => onRemove(index)} className="remove-btn">
          Remove
        </button>
      </div>
      <div className="step-body">
        {renderEditor()}
      </div>
    </div>
  );
};

export default StepCard;
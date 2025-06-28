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

        // Find the schema for the input step
        let inputSchema = null;
        if (step.input && availableInputs) {
          console.log(`STEP CARD: Looking for input schema for input: ${step.input}`);
          const inputStep = availableInputs.find(inp => inp.id === step.input);
          console.log(`STEP CARD: Found input step:`, inputStep);

          if (inputStep && inputStep.table && tableSchemas[inputStep.table]) {
            inputSchema = tableSchemas[inputStep.table];
            console.log(`STEP CARD: Found schema for table ${inputStep.table}:`, inputSchema);
          } else {
            console.log(`STEP CARD: No schema found - inputStep:`, inputStep, `tableSchemas:`, tableSchemas);
          }
        }

        return (
          <MutateEditor
            step={step}
            onChange={updateStep}
            availableInputs={availableInputs}
            tableSchemas={tableSchemas}
            inputSchema={inputSchema}
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
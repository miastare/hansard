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
    switch (step.op) {
      case 'source':
        return (
          <SourceEditor
            step={step}
            onUpdate={handleUpdate}
            tableSchemas={tableSchemas || {}}
            requestSchema={requestSchema || (() => {})}
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
            onUpdate(index, updatedStep);
          };
          // Format availableInputs properly for MutateEditor
          const formattedInputs = availableInputs || [];
          console.log(`STEP CARD: Mutate editor - step:`, step);
          console.log(`STEP CARD: Mutate editor - availableInputs:`, availableInputs);
          console.log(`STEP CARD: Mutate editor - tableSchemas:`, tableSchemas);
          return (
            <MutateEditor
              step={step}
              onChange={updateStep}
              availableInputs={availableInputs}
              tableSchemas={tableSchemas}
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
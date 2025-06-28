import React, { useState, useCallback } from 'react';
import StepCard from './StepCard';
import { deriveSchema } from './utils/DeriveSchema';
import useSchemaCache from './hooks/useSchemaCache';
import generateId from './utils/GenerateId';
import styles from './DSLBuilder.module.css';

export default function DSLBuilder() {
  const [steps, setSteps] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableSchemas, requestSchema] = useSchemaCache();

  const addStep = useCallback((op) => {
    const newStep = {
      id: generateId(op),
      op,
      ...(op === 'source' && { table: '' }),
      ...(op === 'filter' && { input: '', conditions: [] }),
      ...(op === 'mutate' && { input: '', cols: {} }),
      ...(op === 'aggregate' && { input: '', group: [], metrics: {} }),
      ...(op === 'join' && { inputs: [], on: [], how: 'outer' }),
      ...(op === 'division_votes' && { division_ids: [], house: 1, weights: { AYE: 1, NO: -1, NOTREC: 0 } }),
    };
    setSteps(prev => [...prev, newStep]);
  }, []);

  const updateStep = useCallback((index, updatedStep) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = updatedStep;
      return newSteps;
    });
  }, []);

  const removeStep = useCallback((index) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  }, []);

  const moveStep = useCallback((fromIndex, toIndex) => {
    setSteps(prev => {
      const newSteps = [...prev];
      const [movedStep] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, movedStep);
      return newSteps;
    });
  }, []);

  const runPipeline = async () => {
    if (steps.length === 0) {
      setError('No steps to run');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const dsl = { steps, return: [steps[steps.length - 1].id] };
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dsl),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setResults(result);
    } catch (error) {
      console.error('Pipeline error:', error);
      setError(error.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSteps([]);
    setResults(null);
    setError(null);
  };

  const getAvailableInputs = useCallback((currentIndex) => {
    return steps.slice(0, currentIndex).map(step => ({
      id: step.id || `step_${step.op}_${currentIndex}`,
      op: step.op
    }));
  }, [steps]);

  const getDerivedSchema = useCallback((stepId) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return null;

    const step = steps[stepIndex];
    const availableInputs = getAvailableInputs(stepIndex);
    return deriveSchema(step, availableInputs, tableSchemas || {});
  }, [steps, tableSchemas]);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h3>Add Steps</h3>
        <div className={styles.buttonGroup}>
          {['source', 'filter', 'mutate', 'aggregate', 'join', 'division_votes'].map(op => (
            <button key={op} onClick={() => addStep(op)} className={styles.addButton}>
              Add {op}
            </button>
          ))}
        </div>

        <div className={styles.controls}>
          <button 
            onClick={runPipeline} 
            disabled={loading || steps.length === 0} 
            className={styles.runButton}
          >
            {loading ? 'Running...' : 'Run Pipeline'}
          </button>

          <button 
            onClick={clearAll} 
            disabled={steps.length === 0} 
            className={styles.clearButton}
          >
            Clear All
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            <h4>Error</h4>
            <p>{error}</p>
          </div>
        )}

        {results && (
          <div className={styles.results}>
            <h3>Results</h3>
            <div className={styles.resultsContent}>
              {Object.entries(results).map(([key, value]) => (
                <div key={key}>
                  <h4>{key}:</h4>
                  <pre>{JSON.stringify(value, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.main}>
        <h2>DSL Pipeline Builder</h2>
        {steps.map((step, index) => {
          const schema = deriveSchema(step, steps, tableSchemas);
          const availableInputs = getAvailableInputs(index);

          return (
            <StepCard
              key={step.id || index}
              step={step}
              index={index}
              onUpdate={updateStep}
              onRemove={removeStep}
              availableInputs={steps.slice(0, index)}
              tableSchemas={tableSchemas || {}}
              requestSchema={requestSchema || (() => {})}
            />
          );
        })}
        {steps.length === 0 && (
          <div className={styles.empty}>
            <p>No steps added yet. Use the sidebar to add your first step.</p>
          </div>
        )}
      </div>
    </div>
  );
}
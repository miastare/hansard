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
  const [expandedCard, setExpandedCard] = useState(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

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

    setSteps(prev => {
      const newSteps = [...prev, newStep];
      // Expand the new card and move carousel to it
      setExpandedCard(newSteps.length - 1);
      setCurrentCarouselIndex(newSteps.length - 1);
      return newSteps;
    });
  }, []);

  const updateStep = useCallback((index, updatedStep) => {
    setSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = updatedStep;
      return newSteps;
    });
  }, []);

  const removeStep = useCallback((index) => {
    setSteps(prev => {
      const newSteps = prev.filter((_, i) => i !== index);
      // Adjust expanded card and carousel index
      if (expandedCard === index) {
        setExpandedCard(null);
      } else if (expandedCard !== null && expandedCard > index) {
        setExpandedCard(expandedCard - 1);
      }

      if (currentCarouselIndex >= newSteps.length && newSteps.length > 0) {
        setCurrentCarouselIndex(newSteps.length - 1);
      } else if (newSteps.length === 0) {
        setCurrentCarouselIndex(0);
        setExpandedCard(null);
      }

      return newSteps;
    });
  }, [expandedCard, currentCarouselIndex]);

  const toggleCardExpansion = (index) => {
    if (expandedCard === index) {
      setExpandedCard(null);
    } else {
      setExpandedCard(index);
      setCurrentCarouselIndex(index);
    }
  };

  const navigateCarousel = (direction) => {
    if (steps.length === 0) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentCarouselIndex > 0 ? currentCarouselIndex - 1 : steps.length - 1;
    } else {
      newIndex = currentCarouselIndex < steps.length - 1 ? currentCarouselIndex + 1 : 0;
    }

    setCurrentCarouselIndex(newIndex);
    setExpandedCard(newIndex);
  };

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
    setExpandedCard(null);
    setCurrentCarouselIndex(0);
  };

  const getAvailableInputs = useCallback((currentIndex) => {
    const availableInputs = steps.slice(0, currentIndex).map((step, idx) => ({
      id: step.id || `step_${step.op}_${idx}`,
      op: step.op,
      table: step.table,
      input: step.input,
      cols: step.cols
    }));
    return availableInputs;
  }, [steps]);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.header}>
          <h2>DSL Pipeline Builder</h2>
          {steps.length > 0 && (
            <div className={styles.carouselControls}>
              <button 
                onClick={() => navigateCarousel('prev')} 
                className={styles.carouselBtn}
                title="Previous step"
              >
                ←
              </button>
              <span className={styles.carouselIndicator}>
                {currentCarouselIndex + 1} of {steps.length}
              </span>
              <button 
                onClick={() => navigateCarousel('next')} 
                className={styles.carouselBtn}
                title="Next step"
              >
                →
              </button>
            </div>
          )}
        </div>

        <div className={styles.carousel}>
          {steps.map((step, stepIndex) => {
            const availableInputs = getAvailableInputs(stepIndex);

            // Log available inputs for debugging
            console.log(`DSL BUILDER: Available inputs for step ${stepIndex}, op: ${step.op}`);
            console.log(`DSL BUILDER: availableInputs:`, availableInputs);
            console.log(`DSL BUILDER: tableSchemas:`, tableSchemas);
            console.log(`DSL BUILDER: step.input:`, step.input);
            console.log(`DSL BUILDER: requestSchema function:`, requestSchema);

            // Log specific schema information for mutate steps
            if (step.op === 'mutate' && step.input) {
              const inputStep = availableInputs.find(s => s.id === step.input);
              if (inputStep && inputStep.table && tableSchemas) {
                console.log(`DSL BUILDER: Schema for step ${stepIndex} input table ${inputStep.table}:`, tableSchemas[inputStep.table]);
              }
            }

            return (
              <StepCard
                key={step.id}
                step={step}
                onUpdate={(updatedStep) => updateStep(stepIndex, updatedStep)}
                onDelete={(stepId) => removeStep(stepIndex)}
                availableInputs={availableInputs}
                tableSchemas={tableSchemas || {}}
                requestSchema={requestSchema || (() => {})}
              />
            );
          })}
          {steps.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📊</div>
              <h3>No Pipeline Steps</h3>
              <p>Start building your data pipeline by adding your first step from the sidebar.</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.sidebar}>
        <h3>Add Steps</h3>
        <div className={styles.buttonGroup}>
          {[
            { op: 'source', icon: '📋', label: 'Source' },
            { op: 'filter', icon: '🔍', label: 'Filter' },
            { op: 'mutate', icon: '🔧', label: 'Mutate' },
            { op: 'aggregate', icon: '📊', label: 'Aggregate' },
            { op: 'join', icon: '🔗', label: 'Join' },
            { op: 'division_votes', icon: '🗳️', label: 'Division Votes' }
          ].map(({ op, icon, label }) => (
            <button key={op} onClick={() => addStep(op)} className={styles.addButton}>
              <span className={styles.buttonIcon}>{icon}</span>
              <span>Add {label}</span>
            </button>
          ))}
        </div>

        <div className={styles.controls}>
          <button 
            onClick={runPipeline} 
            disabled={loading || steps.length === 0} 
            className={styles.runButton}
          >
            <span className={styles.buttonIcon}>▶️</span>
            <span>{loading ? 'Running...' : 'Run Pipeline'}</span>
          </button>

          <button 
            onClick={clearAll} 
            disabled={steps.length === 0} 
            className={styles.clearButton}
          >
            <span className={styles.buttonIcon}>🗑️</span>
            <span>Clear All</span>
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            <h4>⚠️ Error</h4>
            <p>{error}</p>
          </div>
        )}

        {results && (
          <div className={styles.results}>
            <h3>✅ Results</h3>
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
    </div>
  );
}
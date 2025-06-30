
import { useState, useCallback } from 'react';
import { deriveSchema } from '../../utils/DeriveSchema';

/**
 * Custom hook for managing input selection in editors
 */
export function useInputSelection(step, onChange, availableInputs, tableSchemas) {
  const [hoveredInput, setHoveredInput] = useState(null);

  const updateInput = useCallback((newInput) => {
    onChange({ ...step, input: newInput });
  }, [step, onChange]);

  const handleInputHover = useCallback((option) => {
    if (option && availableInputs) {
      const inputStep = availableInputs.find(s => s.id === option.value);
      if (inputStep) {
        let schema = [];
        if (inputStep.op === 'source' && inputStep.table) {
          const schemaWrapper = tableSchemas[inputStep.table];
          if (schemaWrapper) {
            schema = schemaWrapper.cols || schemaWrapper;
          }
        } else {
          schema = deriveSchema(inputStep, availableInputs, tableSchemas);
        }
        setHoveredInput({ inputStep, schema: Array.isArray(schema) ? schema : [] });
      }
    } else {
      setHoveredInput(null);
    }
  }, [availableInputs, tableSchemas]);

  const getInputSchema = useCallback(() => {
    if (step.input && step.input !== '' && availableInputs) {
      const inputStep = availableInputs.find(s => String(s.id) === String(step.input));

      if (inputStep) {
        if (inputStep.op === 'source' && inputStep.table) {
          const schemaWrapper = tableSchemas[inputStep.table];
          if (schemaWrapper) {
            const schema = schemaWrapper.cols || schemaWrapper;
            return Array.isArray(schema) ? schema : [];
          }
        } else {
          const derivedSchema = deriveSchema(inputStep, availableInputs, tableSchemas);
          return Array.isArray(derivedSchema) ? derivedSchema : [];
        }
      }
    }
    return [];
  }, [step.input, availableInputs, tableSchemas]);

  return {
    hoveredInput,
    updateInput,
    handleInputHover,
    getInputSchema
  };
}

/**
 * Custom hook for managing column windowing
 */
export function useColumnWindowing(columns, columnsPerWindow = 4) {
  const [columnWindowStart, setColumnWindowStart] = useState(0);

  const windowedColumns = columns.slice(columnWindowStart, columnWindowStart + columnsPerWindow);
  const totalWindows = Math.ceil(columns.length / columnsPerWindow);
  const currentWindow = Math.floor(columnWindowStart / columnsPerWindow) + 1;

  const nextWindow = useCallback(() => {
    setColumnWindowStart(Math.min(columns.length - columnsPerWindow, columnWindowStart + columnsPerWindow));
  }, [columns.length, columnsPerWindow, columnWindowStart]);

  const prevWindow = useCallback(() => {
    setColumnWindowStart(Math.max(0, columnWindowStart - columnsPerWindow));
  }, [columnsPerWindow, columnWindowStart]);

  const canGoNext = columnWindowStart + columnsPerWindow < columns.length;
  const canGoPrev = columnWindowStart > 0;

  return {
    windowedColumns,
    totalWindows,
    currentWindow,
    nextWindow,
    prevWindow,
    canGoNext,
    canGoPrev,
    setColumnWindowStart
  };
}

/**
 * Custom hook for managing modal state
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const toggleModal = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal
  };
}

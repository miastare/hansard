
import React, { useState } from 'react';
import WeightEditModal from './WeightEditModal';

const DivisionBox = ({ division, onChange, onRemove, index }) => {
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  const updateDivisionId = (newId) => {
    onChange(index, { ...division, id: newId });
  };

  const updateWeights = (newWeights) => {
    onChange(index, { ...division, weights: newWeights });
  };

  const defaultWeights = { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 };
  const weights = division.weights || defaultWeights;

  return (
    <div style={{
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      marginBottom: '16px'
    }}>
      {/* Header with Division ID input and main actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Division ID:
          </label>
          <input
            type="text"
            value={division.id || ''}
            onChange={(e) => updateDivisionId(e.target.value)}
            placeholder="Enter division ID"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <button
          style={{
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginTop: '20px'
          }}
        >
          Use this division
        </button>
        
        <button
          onClick={() => setIsWeightModalOpen(true)}
          style={{
            padding: '10px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginTop: '20px'
          }}
        >
          Set Weights
        </button>
        
        <button
          onClick={() => onRemove(index)}
          style={{
            padding: '10px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            marginTop: '20px'
          }}
        >
          🗑️
        </button>
      </div>

      {/* Weights Display */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151'
        }}>
          Current Weights:
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Aye</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>{weights.AYE}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>No</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>{weights.NO}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Abstain</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280' }}>{weights.NOTREC}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Ineligible</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#9ca3af' }}>{weights.INELIGIBLE}</div>
          </div>
        </div>
      </div>

      <WeightEditModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        weights={weights}
        onSave={updateWeights}
        divisionId={division.id}
      />
    </div>
  );
};

export default DivisionBox;


import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          width: '95vw',
          height: '95vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          right: 0,
          padding: '10px',
          textAlign: 'right',
          backgroundColor: 'white',
          borderBottom: '1px solid #eee'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              padding: '5px'
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

const WeightEditModal = ({ isOpen, onClose, weights, onSave, divisionId }) => {
  const [editWeights, setEditWeights] = useState(weights);

  React.useEffect(() => {
    setEditWeights(weights);
  }, [weights, isOpen]);

  const handleSave = () => {
    onSave(editWeights);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '40px' }}>
        <h2 style={{ marginBottom: '30px', color: '#2d3748' }}>
          Set Weights for Division {divisionId || 'New Division'}
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          maxWidth: '600px'
        }}>
          {Object.entries(editWeights).map(([voteType, weight]) => (
            <div key={voteType} style={{
              padding: '20px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              backgroundColor: '#f9fafb'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151',
                textTransform: 'capitalize'
              }}>
                {voteType.toLowerCase().replace('notrec', 'Abstain').replace('ineligible', 'Ineligible to Vote')}:
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setEditWeights({
                  ...editWeights,
                  [voteType]: parseFloat(e.target.value) || 0
                })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              />
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '40px',
          display: 'flex',
          gap: '16px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Save Weights
          </button>
        </div>
      </div>
    </Modal>
  );
};

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

export default function DivisionVotesEditor({ step, onUpdate }) {
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  
  // Convert division_ids array to division objects with weights
  const divisions = step.division_ids && step.division_ids.length > 0 
    ? step.division_ids.map(id => ({
        id: id,
        weights: step.weights || { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 }
      }))
    : [{ id: '', weights: { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 } }];

  const updateDivision = (index, newDivision) => {
    const newDivisions = [...divisions];
    newDivisions[index] = newDivision;
    
    // Update step with new division IDs
    const divisionIds = newDivisions
      .map(div => div.id)
      .filter(id => id && id.trim() !== '');
    
    onUpdate({
      ...step,
      division_ids: divisionIds,
      weights: newDivisions[0]?.weights || { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 }
    });
  };

  const removeDivision = (index) => {
    const newDivisions = divisions.filter((_, i) => i !== index);
    
    // Ensure at least one division remains
    if (newDivisions.length === 0) {
      newDivisions.push({ id: '', weights: { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 } });
    }
    
    const divisionIds = newDivisions
      .map(div => div.id)
      .filter(id => id && id.trim() !== '');
    
    onUpdate({
      ...step,
      division_ids: divisionIds,
      weights: newDivisions[0]?.weights || { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 }
    });
  };

  const addDivision = () => {
    const newDivisions = [...divisions, { 
      id: '', 
      weights: divisions[0]?.weights || { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 }
    }];
    
    const divisionIds = newDivisions
      .map(div => div.id)
      .filter(id => id && id.trim() !== '');
    
    onUpdate({
      ...step,
      division_ids: divisionIds,
      weights: newDivisions[0]?.weights || { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 }
    });
  };

  const updateHouse = (house) => {
    onUpdate({
      ...step,
      house: parseInt(house)
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2d3748' }}>
        🗳️ Division Votes Configuration
      </h4>

      {/* House Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          House:
        </label>
        <select
          value={step.house || 1}
          onChange={(e) => updateHouse(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#fff'
          }}
        >
          <option value={1}>Commons (1)</option>
          <option value={2}>Lords (2)</option>
        </select>
      </div>

      {/* Header with Add Division and Find Divisions buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h5 style={{
          margin: 0,
          fontWeight: '600',
          fontSize: '16px',
          color: '#374151'
        }}>
          Divisions:
        </h5>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={addDivision}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Add Division
          </button>
          <button
            onClick={() => setIsFindModalOpen(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Find Divisions
          </button>
        </div>
      </div>

      {/* Division Boxes */}
      <div>
        {divisions.map((division, index) => (
          <DivisionBox
            key={index}
            division={division}
            onChange={updateDivision}
            onRemove={removeDivision}
            index={index}
          />
        ))}
      </div>

      {/* Find Divisions Modal */}
      <Modal isOpen={isFindModalOpen} onClose={() => setIsFindModalOpen(false)}>
        <div style={{
          padding: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          fontSize: '24px',
          color: '#6b7280'
        }}>
          This is a modal
        </div>
      </Modal>
    </div>
  );
}

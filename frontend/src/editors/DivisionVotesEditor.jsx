
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

const DivisionLine = ({ divisionId, onChange, onRemove, index }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 0',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <input
        type="text"
        value={divisionId}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder="Enter division ID"
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '14px'
        }}
      />
      <button
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Use this division
      </button>
      <button
        onClick={() => onRemove(index)}
        style={{
          padding: '8px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🗑️
      </button>
    </div>
  );
};

export default function DivisionVotesEditor({ step, onUpdate }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Convert division_ids array to individual divisions, or start with one empty division
  const divisions = step.division_ids && step.division_ids.length > 0 
    ? step.division_ids 
    : [''];

  const updateDivision = (index, value) => {
    const newDivisions = [...divisions];
    newDivisions[index] = value;
    onUpdate({
      ...step,
      division_ids: newDivisions.filter(id => id.trim() !== '')
    });
  };

  const removeDivision = (index) => {
    const newDivisions = divisions.filter((_, i) => i !== index);
    // Ensure at least one empty division remains
    if (newDivisions.length === 0) {
      newDivisions.push('');
    }
    onUpdate({
      ...step,
      division_ids: newDivisions.filter(id => id.trim() !== '')
    });
  };

  const addDivision = () => {
    const newDivisions = [...divisions, ''];
    onUpdate({
      ...step,
      division_ids: newDivisions.filter(id => id.trim() !== '')
    });
  };

  const updateHouse = (house) => {
    onUpdate({
      ...step,
      house: parseInt(house)
    });
  };

  const updateWeights = (voteType, weight) => {
    onUpdate({
      ...step,
      weights: {
        ...step.weights,
        [voteType]: parseFloat(weight)
      }
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

      {/* Division IDs Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <label style={{
            fontWeight: '600',
            fontSize: '14px',
            color: '#374151'
          }}>
            Division IDs:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={addDivision}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              + Add Division
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Find Divisions
            </button>
          </div>
        </div>

        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f9fafb'
        }}>
          {divisions.map((divisionId, index) => (
            <DivisionLine
              key={index}
              divisionId={divisionId}
              onChange={updateDivision}
              onRemove={removeDivision}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Vote Weights Section */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          marginBottom: '16px',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          Vote Weights:
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          maxWidth: '400px'
        }}>
          {Object.entries(step.weights || { AYE: 1, NO: -1, NOTREC: 0 }).map(([voteType, weight]) => (
            <div key={voteType}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
                fontWeight: '500',
                color: '#6b7280'
              }}>
                {voteType}:
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => updateWeights(voteType, e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
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


import React, { useState } from 'react';
import Modal from './Modal';

const WeightEditModal = ({ isOpen, onClose, weights, onSave, divisionId }) => {
  const [editWeights, setEditWeights] = useState(weights);

  React.useEffect(() => {
    setEditWeights(weights);
  }, [weights, isOpen]);

  const handleSave = () => {
    onSave(editWeights);
    onClose();
  };

  const weightDescriptions = {
    AYE: {
      label: 'Aye Votes',
      description: 'Weight for MPs who voted in favor of the motion',
      placeholder: 'e.g., 1 (positive support)'
    },
    NO: {
      label: 'No Votes', 
      description: 'Weight for MPs who voted against the motion',
      placeholder: 'e.g., -1 (negative/opposition)'
    },
    NOTREC: {
      label: 'Abstentions',
      description: 'Weight for MPs who abstained or did not record a vote',
      placeholder: 'e.g., 0 (neutral)'
    },
    INELIGIBLE: {
      label: 'Ineligible',
      description: 'Weight for MPs who were ineligible to vote (e.g., tellers, Speaker)',
      placeholder: 'e.g., 0 (neutral)'
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '40px', maxWidth: '700px' }}>
        <h2 style={{ 
          marginBottom: '12px', 
          color: '#1f2937',
          fontSize: '24px',
          fontWeight: '700'
        }}>
          ⚖️ Configure Vote Weights
        </h2>
        
        <p style={{
          marginBottom: '32px',
          color: '#6b7280',
          fontSize: '15px',
          lineHeight: '1.5'
        }}>
          Set how much each type of vote should contribute to the final score for Division {divisionId || 'New Division'}
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {Object.entries(editWeights).map(([voteType, weight]) => (
            <div key={voteType} style={{
              padding: '24px',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              backgroundColor: '#fafafa',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#374151'
              }}>
                {weightDescriptions[voteType].label}
              </label>
              
              <p style={{
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: '12px',
                lineHeight: '1.4'
              }}>
                {weightDescriptions[voteType].description}
              </p>
              
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setEditWeights({
                  ...editWeights,
                  [voteType]: parseFloat(e.target.value) || 0
                })}
                placeholder={weightDescriptions[voteType].placeholder}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  backgroundColor: 'white',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          ))}
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '12px',
          marginBottom: '32px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#0369a1',
            lineHeight: '1.4'
          }}>
            💡 <strong>Tip:</strong> Positive weights support the motion, negative weights oppose it, and zero weights are neutral. 
            The final score will be calculated as: (Ayes × Aye Weight) + (Noes × No Weight) + (Abstentions × Abstention Weight) + (Ineligible × Ineligible Weight)
          </p>
        </div>

        <div style={{
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
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
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
              fontWeight: '500',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Save Weights
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WeightEditModal;

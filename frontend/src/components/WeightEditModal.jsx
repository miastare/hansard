
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

export default WeightEditModal;

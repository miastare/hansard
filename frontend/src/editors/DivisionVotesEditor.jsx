import React, { useState } from 'react';
import Modal from '../components/Modal';
import DivisionBox from '../components/DivisionBox';

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

    // Update step with new division IDs and weights
    const divisionIds = newDivisions
      .map(div => div.id)
      .filter(id => id && id.trim() !== '');

    onUpdate({
      ...step,
      division_ids: divisionIds,
      weights: newDivision.weights // Use the updated weights from the specific division
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
    const newDivision = { 
      id: '', 
      weights: divisions[0]?.weights || { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 }
    };

    const newDivisions = [...divisions, newDivision];

    const divisionIds = newDivisions
      .map(div => div.id)
      .filter(id => id && id.trim() !== '');

    onUpdate({
      ...step,
      division_ids: divisionIds,
      weights: newDivision.weights
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
import React, { useState } from "react";
import WeightEditModal from "./WeightEditModal";

const DivisionBox = ({ division, onChange, onRemove, internalId }) => {
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [house, setHouse] = useState("Commons"); // Added house state

  const updateDivisionId = (newId) => {
    onChange(internalId, { ...division, id: newId });
  };

  const updateWeights = (newWeights) => {
    onChange(internalId, { ...division, weights: newWeights });
  };

  // Function to update the house
  const updateHouse = (newHouse) => {
    setHouse(newHouse);
    onChange(internalId, { ...division, house: newHouse }); // save to the division object
  };

  const defaultWeights = { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 };
  const weights = division.weights || defaultWeights;

  return (
    <div
      style={{
        border: "2px solid #e5e7eb",
        borderRadius: "12px",
        padding: "20px",
        backgroundColor: "#fff",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        marginBottom: "16px",
      }}
    >
      {/* Header with Division ID input and main actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ flex: 0.7 }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            Division ID:
          </label>
          <input
            type="text"
            value={division.id || ""}
            onChange={(e) => updateDivisionId(e.target.value)}
            placeholder="Enter division ID"
            style={{
              width: "calc(100% - 24px)",
              padding: "10px 12px",
              border: "2px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
            }}
          />
        </div>

        {/* House Selection Dropdown */}
        <div style={{ flex: 0.5 }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            House:
          </label>
          <select
            value={house}
            onChange={(e) => updateHouse(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "2px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "white",
            }}
          >
            <option value="Commons">Commons</option>
            <option value="Lords">Lords</option>
          </select>
        </div>

        <button
          style={{
            padding: "10px 16px",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            marginTop: "20px",
          }}
        >
          Use this division
        </button>

        <button
          onClick={() => setIsWeightModalOpen(true)}
          style={{
            padding: "10px 16px",
            backgroundColor: "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500",
            marginTop: "20px",
          }}
        >
          Set Weights
        </button>

        <button
          onClick={() => onRemove(internalId)}
          style={{
            padding: "10px",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            marginTop: "20px",
          }}
        >
          🗑️
        </button>
      </div>

      {/* Weights Display and Additional Info */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {/* Weights Display */}
        <div
          style={{
            flex: 0.5,
            padding: "12px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h6
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              Current Weights:
            </h6>
            <button
              onClick={() => setIsWeightModalOpen(true)}
              style={{
                padding: "4px 8px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "500",
              }}
            >
              Edit
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "6px",
              fontSize: "11px",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "600", color: "#059669" }}>AYE</div>
              <div>{weights.AYE}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "600", color: "#dc2626" }}>NO</div>
              <div>{weights.NO}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "600", color: "#6b7280" }}>NOT REC</div>
              <div>{weights.NOTREC}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "600", color: "#9ca3af" }}>
                INELIGIBLE
              </div>
              <div>{weights.INELIGIBLE}</div>
            </div>
          </div>
        </div>

        {/* Additional Info Placeholder */}
        <div
          style={{
            flex: 0.5,
            padding: "12px",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          to populate
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

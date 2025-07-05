import React, { useState, useEffect } from "react";
import Modal from "../components/Modal";
import DivisionBox from "../components/DivisionBox";
import DivisionDSLBuilder from "./DivisionDSLBuilder";

export default function DivisionVotesEditor({ step, onUpdate }) {
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [nextId, setNextId] = useState(1);

  // Convert step data to divisions with internal IDs
  const initializeDivisions = () => {
    if (step.division_ids && step.division_ids.length > 0) {
      return step.division_ids.map((id, index) => ({
        internalId: index + 1,
        id: id,
        house: step.houses?.[index] || 1,
        weights: step.weights || { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 },
        metadata: step.division_metadata?.[index] || null,
      }));
    }
    return [
      {
        internalId: 1,
        id: "",
        house: 1,
        weights: { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 },
        metadata: null,
      },
    ];
  };

  const [divisions, setDivisions] = useState(initializeDivisions);

  // Update nextId when divisions change
  useEffect(() => {
    const maxId = Math.max(...divisions.map((d) => d.internalId), 0);
    setNextId(maxId + 1);
  }, [divisions]);

  // Sync divisions back to step format
  const syncToStep = (newDivisions) => {
    const divisionIds = newDivisions
      .map((div) => div.id)
      .filter((id) => id && id.trim() !== "");

    const houses = newDivisions
      .filter((div) => div.id && div.id.trim() !== "")
      .map((div) => div.house || 1);

    const divisionMetadata = newDivisions
      .filter((div) => div.id && div.id.trim() !== "")
      .map((div) => div.metadata || null);

    // Use weights from the first division, or default weights
    const weights = newDivisions[0]?.weights || {
      AYE: 1,
      NO: -1,
      NOTREC: 0,
      INELIGIBLE: 0,
    };

    onUpdate({
      ...step,
      division_ids: divisionIds,
      houses: houses,
      division_metadata: divisionMetadata,
      weights: weights,
    });
  };

  const updateDivision = (internalId, newDivision) => {
    const newDivisions = divisions.map((div) =>
      div.internalId === internalId ? { ...div, ...newDivision } : div,
    );

    setDivisions(newDivisions);
    syncToStep(newDivisions);
  };

  const removeDivision = (internalId) => {
    let newDivisions = divisions.filter((div) => div.internalId !== internalId);

    // Ensure at least one division remains
    if (newDivisions.length === 0) {
      newDivisions = [
        {
          internalId: nextId,
          id: "",
          house: 1,
          weights: { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 },
          metadata: null,
        },
      ];
      setNextId(nextId + 1);
    }

    setDivisions(newDivisions);
    syncToStep(newDivisions);
  };

  const addDivision = (divisionData = null) => {
    const newDivision = {
      internalId: nextId,
      id: divisionData?.id || "",
      house: divisionData?.house || 1,
      weights: divisions[0]?.weights || {
        AYE: 1,
        NO: -1,
        NOTREC: 0,
        INELIGIBLE: 0,
      },
      metadata: divisionData?.metadata || null,
    };

    const newDivisions = [...divisions, newDivision];
    setDivisions(newDivisions);
    syncToStep(newDivisions);
    setNextId(nextId + 1);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h4 style={{ margin: "0 0 20px 0", fontSize: "18px", color: "#2d3748" }}>
        🗳️ Division Votes Configuration
      </h4>

      {/* Header with Add Division and Find Divisions buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h5
          style={{
            margin: 0,
            fontWeight: "600",
            fontSize: "16px",
            color: "#374151",
          }}
        >
          Divisions:
        </h5>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={addDivision}
            style={{
              padding: "10px 20px",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            + Add Division
          </button>
          <button
            onClick={() => setIsFindModalOpen(true)}
            style={{
              padding: "10px 20px",
              backgroundColor: "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Find Divisions
          </button>
        </div>
      </div>

      {/* Division Boxes */}
      <div>
        {divisions.map((division) => (
          <DivisionBox
            key={division.internalId}
            division={division}
            onChange={(internalId, newDivision) =>
              updateDivision(internalId, newDivision)
            }
            onRemove={(internalId) => removeDivision(internalId)}
            internalId={division.internalId}
          />
        ))}
      </div>

      {/* Find Divisions Modal */}
      <DivisionDSLBuilder
        isOpen={isFindModalOpen}
        onClose={() => setIsFindModalOpen(false)}
        onDSLComplete={(dsl) => {
          console.log("DSL completed:", dsl);
        }}
        onAddDivision={(divisionData) => {
          addDivision(divisionData);
          setIsFindModalOpen(false);
        }}
      />
    </div>
  );
}

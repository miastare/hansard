import React, { useState } from "react";
import WeightEditModal from "./WeightEditModal";

const DivisionBox = ({ division, onChange, onRemove, internalId }) => {
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [house, setHouse] = useState(division.house || "Commons");
  const [isLoading, setIsLoading] = useState(false);
  const [showDisabledMessage, setShowDisabledMessage] = useState(false);

  const updateDivisionId = (newId) => {
    onChange(internalId, { ...division, id: newId });
  };

  const updateWeights = (newWeights) => {
    onChange(internalId, { ...division, weights: newWeights });
  };

  // Function to update the house
  const updateHouse = (newHouse) => {
    setHouse(newHouse);
    onChange(internalId, { ...division, house: newHouse });
  };

  // Function to handle clicks on disabled fields
  const handleDisabledFieldClick = () => {
    if (division.metadata !== null) {
      setShowDisabledMessage(true);
      setTimeout(() => setShowDisabledMessage(false), 3000);
    }
  };

  // Function to fetch division details by ID and house
  const fetchDivisionDetails = async () => {
    if (!division.id || !division.id.trim()) {
      alert("Please enter a Division ID first");
      return;
    }

    console.log("FRONTEND: Fetching division details", {
      division_id: division.id,
      house: division.house,
      division_id_type: typeof division.id,
    });

    setIsLoading(true);
    try {
      const requestBody = {
        division_id: division.id,
        house: division.house,
      };

      console.log(
        "FRONTEND: Sending request to /api/division_by_id with body:",
        requestBody,
      );

      const response = await fetch("/api/division_by_id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("FRONTEND: Response status:", response.status);
      console.log(
        "FRONTEND: Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("FRONTEND: HTTP error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`,
        );
      }

      const divisionData = await response.json();
      console.log("FRONTEND: Received division data:", divisionData);

      if (divisionData.error) {
        console.error("FRONTEND: API returned error:", divisionData.error);
        alert(`Error: ${divisionData.error}`);
        return;
      }

      // Update the division with the fetched metadata
      const updatedDivision = {
        ...division,
        metadata: {
          division_title: divisionData.division_title,
          division_date_time: divisionData.division_date_time,
          ayes: divisionData.ayes,
          noes: divisionData.noes,
          context_url: divisionData.context_url,
        },
      };

      console.log(
        "FRONTEND: Updating division with metadata:",
        updatedDivision,
      );
      onChange(internalId, updatedDivision);
    } catch (error) {
      console.error("FRONTEND: Error fetching division details:", error);
      alert(`Failed to fetch division details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const defaultWeights = { AYE: 1, NO: -1, NOTREC: 0, INELIGIBLE: 0 };
  const weights = division.weights || defaultWeights;

  const forbidChanges =
    isLoading ||
    !division.id ||
    !division.id.trim() ||
    division.metadata !== null;

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
            onClick={handleDisabledFieldClick}
            placeholder="Enter division ID"
            disabled={division.metadata !== null}
            title={
              division.metadata !== null
                ? "Division details are locked. Delete and recreate to modify."
                : ""
            }
            style={{
              width: "calc(100% - 24px)",
              padding: "10px 12px",
              border:
                division.metadata !== null
                  ? "2px solid #a8dcab"
                  : "2px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: division.metadata !== null ? "#a8dcab" : "white",
              cursor: division.metadata !== null ? "not-allowed" : "text",
              opacity: division.metadata !== null ? 0.7 : 1,
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
            value={division.house || 1}
            onChange={(e) => updateHouse(parseInt(e.target.value))}
            onClick={handleDisabledFieldClick}
            disabled={division.metadata !== null}
            title={
              division.metadata !== null
                ? "Division details are locked. Delete and recreate to modify."
                : ""
            }
            style={{
              width: "100%",
              padding: "10px 12px",
              border:
                division.metadata !== null
                  ? "2px solid #a8dcab"
                  : "2px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: division.metadata !== null ? "#a8dcab" : "white",
              cursor: division.metadata !== null ? "not-allowed" : "pointer",
              opacity: division.metadata !== null ? 0.7 : 1,
            }}
          >
            <option value={1}>Commons</option>
            <option value={2}>Lords</option>
          </select>
        </div>

        <button
          onClick={
            division.metadata !== null
              ? handleDisabledFieldClick
              : fetchDivisionDetails
          }
          disabled={forbidChanges}
          title={
            division.metadata !== null
              ? "Division details are locked. Delete and recreate to modify."
              : ""
          }
          style={{
            padding: "10px 16px",
            backgroundColor: forbidChanges ? "#a8dcab" : "#3b82f6",
            color: forbidChanges ? "grey" : "white",
            border: forbidChanges ? "2px solid #a8dcab" : "none",
            borderRadius: "8px",
            cursor: forbidChanges ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            marginTop: "20px",
            opacity: forbidChanges ? 0.8 : 1,
          }}
        >
          {isLoading ? "Loading..." : "Use this division"}
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

      {/* Error message for disabled field interactions */}
      {showDisabledMessage && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "#fef2f2",
            border: "1px solid #a8dcab",
            borderRadius: "6px",
            color: "#dc2626",
            fontSize: "13px",
            fontWeight: "500",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ⚠️ Division details are locked. Delete and recreate this division to
          modify its settings.
        </div>
      )}

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

        {/* Division Metadata Display */}
        <div
          style={{
            flex: 0.5,
            padding: "12px",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#374151",
          }}
        >
          {division.metadata ? (
            <div>
              <div
                style={{
                  fontWeight: "600",
                  marginBottom: "8px",
                  fontSize: "13px",
                  color: "#111827",
                }}
              >
                {division.metadata.division_title}
              </div>
              <div style={{ marginBottom: "4px" }}>
                📅{" "}
                {new Date(
                  division.metadata.division_date_time,
                ).toLocaleDateString()}
              </div>
              <div style={{ marginBottom: "4px" }}>
                ✅ Ayes: <strong>{division.metadata.ayes}</strong> | ❌ Noes:{" "}
                <strong>{division.metadata.noes}</strong>
              </div>
              {division.metadata.context_url && (
                <div>
                  <a
                    href={division.metadata.context_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#3b82f6",
                      textDecoration: "none",
                      fontSize: "11px",
                    }}
                  >
                    🔗 View in Hansard
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#6b7280",
                fontStyle: "italic",
              }}
            >
              Division details will appear here when found
            </div>
          )}
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

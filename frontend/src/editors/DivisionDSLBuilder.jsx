import React, { useState } from "react";
import Modal from "../components/Modal";
import DSLExpressionBuilder from "./DSLExpressionBuilder";
import DivisionsResults from "./DivisionsResults";
import styles from "./DivisionDSLBuilder.module.css";

export default function DivisionDSLBuilder({ isOpen, onClose, onDSLComplete, onAddDivision }) {
  const [dsl, setDsl] = useState({
    op: "contains",
    args: { pattern: "", column: "value" },
  });
  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState(null);
  const [contributions, setContributions] = useState(null);
  const [error, setError] = useState(null);

  console.log("divisions", divisions);
  console.log("contributions", contributions);

  const handleComplete = () => {
    console.log("Generated DSL:", JSON.stringify(dsl, null, 2));
    onDSLComplete?.(dsl);
    onClose();
  };

  const isValidDSL = (dslNode) => {
    if (!dslNode || !dslNode.op) return false;

    const LEAF_OPS = ["contains", "icontains", "regex"];

    if (LEAF_OPS.includes(dslNode.op)) {
      return dslNode.args?.pattern && dslNode.args.pattern.trim() !== "";
    }

    if (dslNode.op === "not") {
      return isValidDSL(dslNode.args);
    }

    if (dslNode.op === "and" || dslNode.op === "or") {
      return (
        Array.isArray(dslNode.args) &&
        dslNode.args.length >= 2 &&
        dslNode.args.every((arg) => isValidDSL(arg))
      );
    }

    return false;
  };

  const handleRetrieveDivisions = async () => {
    setLoading(true);
    setError(null);
    setDivisions(null);
    setContributions(null);

    try {
      const response = await fetch("/api/divisions_from_dsl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dsl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Backend response:", data);
      console.log("Backend response type:", typeof data);
      console.log("Backend response is array:", Array.isArray(data));
      console.log("Backend response length:", data?.length);

      // Check if response is an error object
      if (data && typeof data === "object" && data.error) {
        console.error("Backend error:", data.error);
        setError(`Backend error: ${data.error}`);
        return;
      }

      // data is expected to be [divisions_dict, contributions_dict]
      if (Array.isArray(data) && data.length === 2) {
        const divisionsData = data[0];
        const contributionsData = data[1];
        console.log("Divisions data:", divisionsData);
        console.log("Divisions data type:", typeof divisionsData);
        console.log("Contributions data:", contributionsData);
        console.log("Contributions data type:", typeof contributionsData);

        if (
          typeof divisionsData === "object" &&
          typeof contributionsData === "object"
        ) {
          setDivisions(divisionsData);
          setContributions(contributionsData);
        } else {
          console.error(
            "Invalid data types - divisions:",
            typeof divisionsData,
            "contributions:",
            typeof contributionsData,
          );
          setError("Invalid data types returned from server");
        }
      } else {
        console.error("Unexpected data format:", data);
        console.error(
          "Expected array of length 2, got:",
          typeof data,
          Array.isArray(data) ? `length ${data.length}` : "not an array",
        );
        setError(
          `Unexpected response format from server. Expected array of length 2, got ${typeof data} ${Array.isArray(data) ? `with length ${data.length}` : "not an array"}`,
        );
      }
    } catch (err) {
      console.error("Error fetching divisions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            🔍 Build Division Search Query
          </h2>
          <div className={styles.headerButtons}>
            <button
              onClick={handleRetrieveDivisions}
              disabled={!isValidDSL(dsl) || loading}
              className={`${styles.retrieveButton} ${(!isValidDSL(dsl) || loading) ? styles.retrieveButton + ':disabled' : ''}`}
            >
              {loading ? "🔄 Searching..." : "🔍 Retrieve Matching Divisions"}
            </button>

            <button
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className={styles.info}>
          <strong>How it works:</strong> Build a query to search through
          parliamentary debate contributions. You can search for specific text
          patterns and combine multiple conditions using AND/OR logic.
        </div>

        <DSLExpressionBuilder expr={dsl} onChange={setDsl} modalDepth={0} />

        {/* Error Display */}
        {error && (
          <div className={styles.error}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Display */}
        {(divisions || contributions) && (
          <div className={styles.results}>
            <h3 className={styles.resultsTitle}>
              📊 Search Results
            </h3>

            <DivisionsResults 
              divisions={divisions}
              contributions={contributions}
              onAddDivision={onAddDivision}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
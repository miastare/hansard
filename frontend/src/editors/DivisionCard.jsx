
import React from "react";
import ContributionsList from "./ContributionsList";
import styles from "./DivisionCard.module.css";

export default function DivisionCard({ 
  divisionId, 
  division, 
  contributions, 
  onAddDivision 
}) {
  const handleAddDivision = () => {
    if (onAddDivision) {
      const house = division.location === "Commons Chamber" ? 1 : 2;
      onAddDivision({
        id: divisionId,
        house: house,
        metadata: {
          division_title: division.division_title,
          division_date_time: division.division_date_time,
          ayes: division.ayes,
          noes: division.noes,
          context_url: division.context_url,
        },
      });
    }
  };

  return (
    <div className={styles.card}>
      {/* Division Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h4 className={styles.title}>
            {division.division_title}
          </h4>
          {onAddDivision && (
            <button
              onClick={handleAddDivision}
              className={styles.useButton}
            >
              Use this division
            </button>
          )}
        </div>
        <div className={styles.metadata}>
          <div className={styles.metadataItem}>
            📅{" "}
            {new Date(division.division_date_time).toLocaleString()}
          </div>
          <div className={styles.metadataItem}>
            ✅ Ayes: <strong>{division.ayes}</strong> | ❌ Noes:{" "}
            <strong>{division.noes}</strong>
          </div>
          <div className={styles.metadataItem}>
            🆔 Division ID: <strong>{divisionId}</strong>
          </div>
          <a
            href={division.context_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            🔗 View in Hansard
          </a>
        </div>
      </div>

      {/* Associated Contributions */}
      <ContributionsList 
        contributions={contributions}
        debateId={division.debate_id}
      />
    </div>
  );
}

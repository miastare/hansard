
import React from "react";
import DivisionCard from "./DivisionCard";
import styles from "./DivisionsResults.module.css";

export default function DivisionsResults({ 
  divisions, 
  contributions, 
  onAddDivision 
}) {
  if (!divisions) {
    return null;
  }

  if (Object.keys(divisions).length === 0) {
    return (
      <div className={styles.noResults}>
        <strong>No matching divisions found</strong>
        <br />
        <span className={styles.noResultsHint}>
          Try adjusting your search criteria or using different terms.
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.successMessage}>
        Found <strong>{Object.keys(divisions).length}</strong> matching divisions
      </div>

      <div className={styles.divisionsContainer}>
        {Object.entries(divisions).map(([divisionId, division]) => (
          <DivisionCard
            key={divisionId}
            divisionId={divisionId}
            division={division}
            contributions={contributions}
            onAddDivision={onAddDivision}
          />
        ))}
      </div>
    </div>
  );
}

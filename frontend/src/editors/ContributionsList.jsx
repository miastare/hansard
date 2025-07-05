
import React from "react";
import styles from "./ContributionsList.module.css";

export default function ContributionsList({ contributions, debateId }) {
  const debateContributions = contributions && contributions[debateId];
  
  if (!debateContributions || debateContributions.length === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.noContributions}>
          No matching contributions found for this division.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h5 className={styles.title}>
        💬 Related Contributions ({debateContributions.length})
      </h5>
      <div className={styles.contributionsGrid}>
        {debateContributions.map((contribution, idx) => (
          <div key={idx} className={styles.contribution}>
            <div className={styles.value}>
              "{contribution.value}"
            </div>
            <div className={styles.metadata}>
              <span>
                <strong>👤 {contribution.name}</strong>
              </span>
              <span>🏛️ {contribution.party}</span>
              <span>📍 {contribution.constituency}</span>
              {contribution.context_url && (
                <a
                  href={contribution.context_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  🔗 Source
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

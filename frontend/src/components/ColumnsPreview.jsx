
import React from 'react';
import styles from './ColumnsPreview.module.css';

const ColumnsPreview = ({ columns, title = "Available Columns", isVisible = true }) => {
  if (!isVisible || !columns || columns.length === 0) {
    return null;
  }

  const getTypeColor = (dtype) => {
    const colors = {
      'str': '#10b981',
      'numeric': '#3b82f6', 
      'bool': '#f59e0b',
      'int64': '#3b82f6',
      'float64': '#8b5cf6',
      'datetime': '#ef4444'
    };
    return colors[dtype] || '#6b7280';
  };

  return (
    <div className={styles.columnsPreview}>
      <div className={styles.previewHeader}>
        <span className={styles.previewTitle}>📊 {title}</span>
        <span className={styles.columnCount}>{columns.length} columns</span>
      </div>
      <div className={styles.columnsList}>
        {columns.map(col => (
          <div key={col.name} className={styles.columnItem}>
            <span className={styles.columnName}>{col.name}</span>
            <span 
              className={styles.columnType}
              style={{ color: getTypeColor(col.dtype) }}
            >
              {col.dtype}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnsPreview;
